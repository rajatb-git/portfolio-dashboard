import { OllamaProvider } from '../aiProviders/ollamaProvider';
import { getAiConfig } from '../models/AiConfigModel';
import { logger } from '../utils/winston';

export type ImportTarget = 'transactions' | 'holdings';

// Rows come back in the import engine's own shape (see ImportController's
// RawImportRow), so they go through the same review and validation as a CSV.
type ParsedRow = {
  symbol?: string;
  name?: string;
  qty?: unknown;
  price?: unknown;
  costBasis?: unknown;
  amount?: unknown;
  date?: string;
  action?: string;
  assetType?: string;
};

export type DocumentParseResult = {
  target: ImportTarget;
  rows: ParsedRow[];
  skipped: string[];
  provider: string;
  model: string;
  chunks: number;
};

const TRANSACTIONS_PROMPT = `You are a financial-document parser. You will be given part of the raw text of a brokerage or crypto-exchange document (a trade confirmation, account statement, or transaction history). Extract every individual transaction line in this part and return them as rows.

Rules:
- Use ONLY data present in the text. Never invent symbols, prices, quantities, or dates. If a field is absent, omit it.
- One row per transaction line. Include dividends, interest and transfers too, with their action text as written — the app decides what to keep.
- "symbol": the ticker (e.g. AAPL, BTC), uppercase. Omit for pure cash movements.
- "action": the action as written in the document (e.g. "YOU BOUGHT", "Sell", "Deposit", "Dividend").
- "qty": number of shares/units as a positive number.
- "price": per-unit execution price as a number, no currency symbols.
- "amount": the total cash amount of the line as a number, if shown.
- "date": the trade date in YYYY-MM-DD.
- "assetType": "crypto" for cryptocurrencies, otherwise "stock".
- Do NOT include account numbers, account names, running balances or totals as rows.

Respond ONLY with JSON (no markdown):
{ "rows": [ { "symbol": "AAPL", "action": "Buy", "qty": 10, "price": 150.25, "amount": 1502.5, "date": "2024-03-15", "assetType": "stock" } ] }
If this part contains no transaction lines, return { "rows": [] }.`;

const HOLDINGS_PROMPT = `You are a financial-document parser. You will be given part of the raw text of a brokerage or crypto-exchange document (a positions statement, portfolio summary, or unrealized gain / tax lot report). Extract every holding in this part.

Rules:
- Use ONLY data present in the text. Never invent symbols, prices, quantities, or dates. If a field is absent, omit it.
- If the document lists individual tax lots (acquisition date per purchase), return ONE ROW PER LOT with that lot's quantity, cost and "date". Otherwise one row per position.
- "symbol": the ticker (e.g. AAPL, BTC), uppercase.
- "name": the security name if present.
- "qty": shares/units of the row as a positive number.
- "price": average cost per unit (cost basis per share) as a number. Never use the current market price here.
- "costBasis": total cost of the row as a number, if shown.
- "amount": current market value of the row, if shown.
- "date": acquisition / purchase date of the lot in YYYY-MM-DD, if shown.
- "assetType": "crypto" for cryptocurrencies, otherwise "stock".
- Include a cash or money-market line as a row with symbol "CASH" and its value in "amount". Do NOT include account totals.

Respond ONLY with JSON (no markdown):
{ "rows": [ { "symbol": "AAPL", "name": "Apple Inc", "qty": 10, "price": 150.25, "costBasis": 1502.5, "date": "2023-06-01", "assetType": "stock" } ] }
If this part contains no holdings, return { "rows": [] }.`;

// Brokers word the same action many ways ("YOU BOUGHT", "Sold", "Reinvest
// Shares"). Returns null for anything that isn't a trade or a cash move —
// dividends, interest, fees, journals — so callers can skip and report it.
export const normalizeTradeAction = (raw: unknown): 'buy' | 'sell' | 'deposit' | 'withdraw' | null => {
  const s = String(raw ?? '')
    .toLowerCase()
    .trim();
  // Short sales and covers aren't long positions; the app doesn't track them.
  if (/\bshort\b|to cover/.test(s)) return null;
  // "Reinvest Dividend" / "Qual Div Reinvest" is the dividend's cash leg; the
  // shares it bought come on a separate "Reinvest Shares" / "Reinvestment" row.
  if (/\bdiv/.test(s) && /reinvest/.test(s) && !/shares?\b/.test(s)) return null;
  if (/\b(buy|bought|purchased?|reinvest(ed|ment)?)\b/.test(s) || s === 'b' || s === 'bo') return 'buy';
  if (/\b(sell|sold)\b/.test(s) || s === 's' || s === 'so') return 'sell';
  if (/\b(dividend|interest|fee|tax|journal)/.test(s)) return null;
  if (/\b(deposit|credit|contribution)/.test(s)) return 'deposit';
  if (/\b(withdraw(al)?|debit)\b/.test(s)) return 'withdraw';
  return null;
};

// Long statements go to the model a piece at a time: a local model's context
// is small, and anything past it is dropped without an error. Each piece keeps
// the document's first lines so column headers stay in view.
const CHUNK_CHARS = 6000;
const HEADER_LINES = 4;
const NUM_CTX = 8192;
const CHUNK_TIMEOUT_MS = 300_000;

const splitDocument = (text: string): string[] => {
  const lines = text.split(/\r?\n/);
  const header = lines
    .filter((l) => l.trim())
    .slice(0, HEADER_LINES)
    .join('\n');
  const chunks: string[] = [];
  let current: string[] = [];
  let size = 0;
  for (const line of lines) {
    if (size + line.length > CHUNK_CHARS && current.length) {
      chunks.push(current.join('\n'));
      current = [];
      size = 0;
    }
    current.push(line);
    size += line.length + 1;
  }
  if (current.join('').trim()) chunks.push(current.join('\n'));
  return chunks.map((chunk, i) =>
    i === 0 ? chunk : `(Continued. The document begins with:)\n${header}\n(…)\n${chunk}`
  );
};

const str = (v: unknown): string | undefined => {
  if (v === undefined || v === null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
};

const toRow = (raw: any): ParsedRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const row: ParsedRow = {
    symbol: str(raw.symbol)?.toUpperCase(),
    name: str(raw.name),
    qty: raw.qty,
    price: raw.price ?? raw.averagePrice,
    costBasis: raw.costBasis,
    amount: raw.amount,
    date: str(raw.date),
    action: str(raw.action),
    assetType: str(raw.assetType ?? raw.type),
  };
  return Object.values(row).some((v) => v !== undefined && v !== '') ? row : null;
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
    const chunks = splitDocument(text);
    const rows: ParsedRow[] = [];
    const skipped: string[] = [];

    for (const [i, chunk] of chunks.entries()) {
      const part = chunks.length > 1 ? ` (part ${i + 1} of ${chunks.length})` : '';
      const rawText = await provider.generateInsight(systemPrompt, `Parse this document text${part}:\n\n${chunk}`, {
        numCtx: NUM_CTX,
        timeoutMs: CHUNK_TIMEOUT_MS,
      });
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
          message: `Part ${i + 1}: Ollama response wasn't JSON: ${cleaned.slice(0, 500)}`,
        });
        skipped.push(`Part ${i + 1} of the document couldn't be read by the local AI`);
        continue;
      }
      const incoming: any[] = Array.isArray(parsed?.rows) ? parsed.rows : [];
      for (const raw of incoming) {
        const row = toRow(raw);
        if (row) rows.push(row);
      }
    }

    if (!rows.length && skipped.length === chunks.length) {
      throw new Error('The local AI did not return valid JSON. Try a clearer document or a different model.');
    }

    return { target, rows, skipped, provider: provider.name, model: provider.model, chunks: chunks.length };
  };
}
