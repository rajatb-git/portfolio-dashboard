import moment from 'moment';
import { OllamaProvider } from '../aiProviders/ollamaProvider';
import { getAiConfig } from '../models/AiConfigModel';
import { logger } from '../utils/winston';

export type ImportTarget = 'transactions' | 'holdings';

type ParsedTransaction = {
  symbol?: string;
  qty: number;
  price?: number;
  action: string;
  type: 'stock' | 'crypto' | 'cash';
  date?: string;
};

type ParsedHolding = {
  symbol: string;
  name: string;
  qty: number;
  averagePrice?: number;
  type: 'stock' | 'crypto';
};

export type DocumentParseResult = {
  target: ImportTarget;
  rows: Array<ParsedTransaction | ParsedHolding>;
  skipped: string[];
  provider: string;
  model: string;
};

const VALID_ACTIONS = ['buy', 'sell', 'deposit', 'withdraw'];

const TRANSACTIONS_PROMPT = `You are a financial-document parser. You will be given the raw text of a brokerage or crypto-exchange document (a trade confirmation, account statement, or transaction history). Extract every individual buy, sell, deposit, or withdrawal it contains and return them as transaction rows.

Rules:
- Use ONLY data present in the document. Never invent symbols, prices, quantities, or dates. If a field is absent, omit it.
- "symbol" is the ticker (e.g. AAPL, BTC), uppercase. For cash deposits/withdrawals with no security, omit symbol and set type to "cash".
- "qty" is the number of shares/units as a positive number.
- "price" is the per-unit execution price as a positive number (no currency symbols).
- "action" must be exactly one of: buy, sell, deposit, withdraw.
- "type" must be exactly one of: stock, crypto, cash.
- "date" is the trade/settlement date in YYYY-MM-DD format if present.
- Do NOT include account numbers, names, balances, fees, or totals as rows.

Respond ONLY with valid JSON (no markdown, no code fences) matching this exact schema:
{
  "rows": [
    { "symbol": "AAPL", "qty": 10, "price": 150.25, "action": "buy", "type": "stock", "date": "2024-03-15" }
  ]
}
If the document contains no recognizable transactions, return { "rows": [] }.`;

const HOLDINGS_PROMPT = `You are a financial-document parser. You will be given the raw text of a brokerage or crypto-exchange document (a positions statement or portfolio summary). Extract every current holding/position it contains and return them as holding rows.

Rules:
- Use ONLY data present in the document. Never invent symbols, prices, or quantities. If a field is absent, omit it.
- "symbol" is the ticker (e.g. AAPL, BTC), uppercase.
- "name" is the security/company name if present, otherwise repeat the symbol.
- "qty" is the number of shares/units held as a positive number.
- "averagePrice" is the average cost basis per unit as a positive number (no currency symbols). If only market price is shown and cost basis is absent, omit averagePrice.
- "type" must be exactly one of: stock, crypto.
- Do NOT include cash balances, account totals, or summary rows.

Respond ONLY with valid JSON (no markdown, no code fences) matching this exact schema:
{
  "rows": [
    { "symbol": "AAPL", "name": "Apple Inc", "qty": 10, "averagePrice": 150.25, "type": "stock" }
  ]
}
If the document contains no recognizable holdings, return { "rows": [] }.`;

const normalizeAction = (raw: unknown): string => {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  if (s.includes('buy')) return 'buy';
  if (s.includes('sell')) return 'sell';
  if (s.includes('deposit') || s.includes('credit')) return 'deposit';
  if (s.includes('withdraw') || s.includes('debit')) return 'withdraw';
  return s;
};

const toNumber = (value: unknown): number | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = parseFloat(String(value).replace(/[$,\s]/g, ''));
  return Number.isFinite(parsed) ? Math.abs(parsed) : undefined;
};

const normalizeTransaction = (raw: any, index: number, skipped: string[]): ParsedTransaction | null => {
  const label = `Row ${index + 1}`;
  const action = normalizeAction(raw.action);
  if (!VALID_ACTIONS.includes(action)) {
    skipped.push(`${label}: unrecognized action "${raw.action ?? ''}"`);
    return null;
  }

  const qty = toNumber(raw.qty);
  if (qty === undefined && action !== 'deposit' && action !== 'withdraw') {
    skipped.push(`${label}: missing quantity`);
    return null;
  }

  const type = String(raw.type ?? '')
    .toLowerCase()
    .trim();
  const resolvedType: ParsedTransaction['type'] = type === 'crypto' ? 'crypto' : type === 'cash' ? 'cash' : 'stock';

  const price = toNumber(raw.price);
  const date = raw.date ? moment(String(raw.date)) : undefined;
  const symbol = raw.symbol ? String(raw.symbol).trim().toUpperCase() : undefined;

  return {
    ...(symbol && { symbol }),
    qty: qty ?? 0,
    action,
    type: resolvedType,
    ...(price !== undefined && { price }),
    ...(date?.isValid() && { date: date.format('YYYY-MM-DD') }),
  };
};

const normalizeHolding = (raw: any, index: number, skipped: string[]): ParsedHolding | null => {
  const label = `Row ${index + 1}`;
  const symbol = raw.symbol ? String(raw.symbol).trim().toUpperCase() : '';
  if (!symbol) {
    skipped.push(`${label}: missing symbol`);
    return null;
  }

  const qty = toNumber(raw.qty);
  if (qty === undefined) {
    skipped.push(`${label}: missing quantity`);
    return null;
  }

  const type = String(raw.type ?? '')
    .toLowerCase()
    .trim();
  const averagePrice = toNumber(raw.averagePrice);

  return {
    symbol,
    name: raw.name ? String(raw.name).trim() : symbol,
    qty,
    type: type === 'crypto' ? 'crypto' : 'stock',
    ...(averagePrice !== undefined && { averagePrice }),
  };
};

export class DocumentImportController {
  parse = async (target: ImportTarget, text: string): Promise<DocumentParseResult> => {
    const config = await getAiConfig();

    if (!config.enabled) {
      throw new Error('AI agent is not enabled. Enable it in Settings.');
    }

    // Privacy guard: brokerage documents contain personal financial data, so this
    // feature is restricted to a local provider. It must never reach a hosted API.
    if (config.provider !== 'ollama') {
      throw new Error(
        'Document import is restricted to local AI. Set the AI Agent provider to "Ollama (Local)" in Settings so your statements never leave this machine.'
      );
    }

    const provider = new OllamaProvider(config.ollamaHost, config.ollamaModel);
    if (!provider.isConfigured()) {
      throw new Error('Ollama is selected but not configured. Set the Ollama host in Settings.');
    }

    const systemPrompt = target === 'holdings' ? HOLDINGS_PROMPT : TRANSACTIONS_PROMPT;
    const userPrompt = `Parse the following document text:\n\n${text}`;

    const rawText = await provider.generateInsight(systemPrompt, userPrompt);
    const cleaned = rawText
      .replace(/```(?:json)?\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch (_err) {
      logger.log({
        level: 'error',
        label: 'DocumentImport',
        message: `Failed to parse Ollama response as JSON: ${cleaned.slice(0, 500)}`,
      });
      throw new Error('The local AI did not return valid JSON. Try a clearer document or a different model.');
    }

    const incoming: any[] = Array.isArray(parsed?.rows) ? parsed.rows : [];
    const skipped: string[] = [];

    const rows = incoming
      .map((raw, i) =>
        target === 'holdings' ? normalizeHolding(raw, i, skipped) : normalizeTransaction(raw, i, skipped)
      )
      .filter((row): row is ParsedTransaction & ParsedHolding => row !== null);

    return { target, rows, skipped, provider: provider.name, model: provider.model };
  };
}
