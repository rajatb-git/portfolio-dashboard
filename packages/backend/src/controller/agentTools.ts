import axios from 'axios';
import moment from 'moment';
import type { OllamaTool, OllamaToolCall } from '../aiProviders/ollamaProvider';

// Named tools for the questions people actually ask. Small local models pick a
// tool by its name and description; given only a generic "call any route"
// tool and a list of paths, they reached for web_search or guessed a URL
// instead, so the common reads each get a tool of their own. call_api stays
// as the fallback for everything else.

export const BLOCKED_PATHS = [/^\/agent\//, /^\/debug\//, /^\/settings\/db\/import/];

const PENDING_RETRY_MS = 2_000;
const PENDING_MAX_WAIT_MS = 20_000;
const MAX_ROWS = 40;

type ToolContext = { limit: number; authorization?: string };
type Args = Record<string, unknown>;
type ToolSpec = {
  name: string;
  description: string;
  parameters?: Record<string, { type: string; description: string; enum?: string[] }>;
  required?: string[];
  run: (args: Args, ctx: ToolContext) => Promise<string>;
};

export function truncate(text: string, limit: number): string {
  return text.length > limit
    ? `${text.slice(0, limit)}\n… truncated ${text.length - limit} characters. Ask for something narrower if you need more.`
    : text;
}

function str(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function symbolArg(args: Args): string {
  return str(args.symbol).toUpperCase();
}

const round = (n: number) => (Math.abs(n) >= 1 ? Math.round(n * 100) / 100 : Math.round(n * 1e6) / 1e6);

/** Rounds every number so results spend the model's context on meaning, not on 15-digit floats. */
function compact(value: unknown): unknown {
  if (typeof value === 'number') return Number.isFinite(value) ? round(value) : value;
  if (Array.isArray(value)) return value.map(compact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, compact(v)]));
  }
  return value;
}

function asJson(value: unknown, ctx: ToolContext): string {
  return truncate(JSON.stringify(compact(value)), ctx.limit);
}

type BackendResponse = { status: number; data: unknown; text: string };

async function backend(method: string, path: string, ctx: ToolContext, body?: unknown): Promise<BackendResponse> {
  const request = () =>
    axios.request({
      method,
      url: `http://127.0.0.1:${process.env.PORT || 3001}${path}`,
      data: body && typeof body === 'object' ? body : undefined,
      headers: ctx.authorization ? { Authorization: ctx.authorization } : undefined,
      timeout: 60_000,
      validateStatus: () => true,
      transformResponse: (data) => data,
    });

  // Market data routes answer 202 while the data is still being fetched. Wait
  // like the frontend's getUntilReady does; a model shown "pending" just asks
  // again and burns its turns.
  const startedAt = Date.now();
  let response = await request();
  while (response.status === 202 && Date.now() - startedAt < PENDING_MAX_WAIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, PENDING_RETRY_MS));
    response = await request();
  }
  const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
  let data: unknown = text;
  try {
    data = JSON.parse(text);
  } catch {
    // Not JSON; keep the text.
  }
  return { status: response.status, data, text };
}

class ToolError extends Error {}

async function getData<T>(path: string, ctx: ToolContext): Promise<T> {
  const response = await backend('GET', path, ctx);
  if (response.status === 202) {
    throw new ToolError(`${path} is still loading market data. Say it isn't available yet; don't ask again now.`);
  }
  if (response.status >= 400) {
    const message = (response.data as { message?: string })?.message ?? response.text.slice(0, 300);
    throw new ToolError(`the app answered ${response.status}: ${message}`);
  }
  return response.data as T;
}

const passThrough =
  (path: (args: Args) => string): ToolSpec['run'] =>
  async (args, ctx) =>
    asJson(await getData(path(args), ctx), ctx);

type Holding = {
  accountId: string;
  name: string;
  symbol: string;
  type: string;
  qty: number;
  averagePrice: number;
  currentPrice: number;
  percentChange: number;
  originalValue: number;
  totalGL: number;
  marketValue: number;
  priceUnavailable?: boolean;
  pricePending?: boolean;
};
type Account = { id: string; name: string; cashBalance?: number; taxType?: string };

async function accountNames(ctx: ToolContext): Promise<Map<string, Account>> {
  const accounts = await getData<Account[]>('/accounts', ctx);
  return new Map(accounts.map((a) => [a.id, a]));
}

async function portfolioOverview(_args: Args, ctx: ToolContext): Promise<string> {
  const [holdings, accounts] = await Promise.all([getData<Holding[]>('/dashboard', ctx), accountNames(ctx)]);
  const marketValue = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  const costBasis = holdings.reduce((sum, h) => sum + h.originalValue, 0);
  const dayChange = holdings.reduce(
    (sum, h) => sum + (h.marketValue - h.marketValue / (1 + (h.percentChange || 0) / 100)),
    0
  );
  const cash = [...accounts.values()].reduce((sum, a) => sum + (a.cashBalance ?? 0), 0);

  const bySymbol = new Map<string, Holding & { accounts: string[] }>();
  for (const h of holdings) {
    const account = accounts.get(h.accountId)?.name ?? h.accountId;
    const existing = bySymbol.get(h.symbol);
    if (existing) {
      existing.qty += h.qty;
      existing.marketValue += h.marketValue;
      existing.originalValue += h.originalValue;
      existing.totalGL += h.totalGL;
      existing.accounts.push(account);
    } else {
      bySymbol.set(h.symbol, { ...h, accounts: [account] });
    }
  }
  const rows = [...bySymbol.values()]
    .sort((a, b) => b.marketValue - a.marketValue)
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      type: h.type,
      qty: h.qty,
      price: h.currentPrice,
      todayPct: h.percentChange,
      marketValue: h.marketValue,
      weightPct: marketValue ? (h.marketValue / marketValue) * 100 : 0,
      costBasis: h.originalValue,
      gainLoss: h.totalGL,
      gainLossPct: h.originalValue ? (h.totalGL / h.originalValue) * 100 : 0,
      accounts: h.accounts,
      ...((h.priceUnavailable || h.pricePending) && { note: 'live price unavailable, valued at cost' }),
    }));

  return asJson(
    {
      currency: 'USD',
      totals: {
        holdingsValue: marketValue,
        cash,
        totalValue: marketValue + cash,
        todayChange: dayChange,
        todayChangePct: marketValue - dayChange ? (dayChange / (marketValue - dayChange)) * 100 : 0,
        costBasis,
        unrealizedGainLoss: marketValue - costBasis,
        unrealizedGainLossPct: costBasis ? ((marketValue - costBasis) / costBasis) * 100 : 0,
      },
      positions: rows.length,
      holdings: rows.slice(0, MAX_ROWS),
      ...(rows.length > MAX_ROWS && { omitted: `${rows.length - MAX_ROWS} smaller positions not listed` }),
    },
    ctx
  );
}

async function accountsSummary(_args: Args, ctx: ToolContext): Promise<string> {
  const [holdings, accounts] = await Promise.all([getData<Holding[]>('/dashboard', ctx), accountNames(ctx)]);
  return asJson(
    {
      currency: 'USD',
      accounts: [...accounts.values()].map((a) => {
        const own = holdings.filter((h) => h.accountId === a.id);
        const holdingsValue = own.reduce((sum, h) => sum + h.marketValue, 0);
        return {
          id: a.id,
          name: a.name,
          taxType: a.taxType ?? 'taxable',
          cash: a.cashBalance ?? 0,
          holdingsValue,
          totalValue: holdingsValue + (a.cashBalance ?? 0),
          positions: own.length,
          unrealizedGainLoss: own.reduce((sum, h) => sum + h.totalGL, 0),
          largestHoldings: own
            .sort((x, y) => y.marketValue - x.marketValue)
            .slice(0, 5)
            .map((h) => h.symbol),
        };
      }),
    },
    ctx
  );
}

type YearSummary = {
  year: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  shortTermGain: number;
  longTermGain: number;
  count: number;
};
type RealizedLot = {
  symbol: string;
  accountId: string;
  acquiredDate: string;
  soldDate: string;
  qty: number;
  proceeds: number;
  costBasis: number;
  gain: number;
  term: string;
  year: number;
};

async function realizedGains(args: Args, ctx: ToolContext): Promise<string> {
  const year = Number(args.year) || moment().year();
  const [data, accounts] = await Promise.all([
    getData<{ lots: RealizedLot[]; byYear: YearSummary[]; totals: Omit<YearSummary, 'year'>; unmatchedSells: number }>(
      '/analytics/realized-gains',
      ctx
    ),
    accountNames(ctx),
  ]);
  const summary = data.byYear.find((y) => y.year === year);
  const sales = data.lots
    .filter((l) => l.year === year)
    .sort((a, b) => Math.abs(b.gain) - Math.abs(a.gain))
    .slice(0, 15)
    .map((l) => ({ ...l, account: accounts.get(l.accountId)?.name ?? l.accountId, accountId: undefined }));
  return asJson(
    {
      currency: 'USD',
      year,
      yearSummary: summary ?? { year, note: `No sales recorded in ${year}.` },
      largestSalesThatYear: sales,
      allYears: data.byYear,
      allTimeTotals: data.totals,
      ...(data.unmatchedSells > 0 && {
        warning: `${data.unmatchedSells} sells have no matching buy history, so their cost basis is unknown and they are left out.`,
      }),
    },
    ctx
  );
}

type Transaction = {
  id: string;
  accountId: string;
  symbol: string;
  qty: number;
  price: number;
  type: string;
  action: string;
  date?: string;
  createdAt?: string;
  pnl?: number;
};

async function transactions(args: Args, ctx: ToolContext): Promise<string> {
  const [all, accounts] = await Promise.all([getData<Transaction[]>('/transactions', ctx), accountNames(ctx)]);
  const symbol = symbolArg(args);
  const action = str(args.action).toLowerCase();
  const from = str(args.from);
  const to = str(args.to);
  const limit = Math.min(100, Math.max(1, Number(args.limit) || 25));
  const dated = all.map((t) => ({ ...t, when: (t.date ?? t.createdAt ?? '').slice(0, 10) }));
  const matching = dated
    .filter((t) => !symbol || t.symbol?.toUpperCase() === symbol)
    .filter((t) => !action || t.action?.toLowerCase().includes(action))
    .filter((t) => !from || t.when >= from)
    .filter((t) => !to || t.when <= to)
    .sort((a, b) => b.when.localeCompare(a.when));
  return asJson(
    {
      currency: 'USD',
      matching: matching.length,
      transactions: matching.slice(0, limit).map((t) => ({
        date: t.when,
        action: t.action,
        symbol: t.symbol,
        qty: t.qty,
        price: t.price,
        amount: t.qty * t.price,
        account: accounts.get(t.accountId)?.name ?? t.accountId,
        ...(t.pnl !== undefined && { realizedGainLoss: t.pnl }),
      })),
    },
    ctx
  );
}

type PerformancePoint = { date: string; value: number; index: number };

async function performance(_args: Args, ctx: ToolContext): Promise<string> {
  const points = await getData<PerformancePoint[]>('/portfolio/performance', ctx);
  if (!points.length)
    return 'No performance history yet: the app records one value per day from the first day it runs.';
  const last = points[points.length - 1];
  const returnSince = (date: string) => {
    const start = [...points].reverse().find((p) => p.date <= date) ?? points[0];
    return { from: start.date, returnPct: (last.index / start.index - 1) * 100 };
  };
  return asJson(
    {
      method: 'time-weighted; buys and sells are not counted as gains',
      firstDate: points[0].date,
      lastDate: last.date,
      latestValue: last.value,
      sinceStart: { from: points[0].date, returnPct: (last.index / points[0].index - 1) * 100 },
      yearToDate: returnSince(moment().startOf('year').subtract(1, 'day').format('YYYY-MM-DD')),
      last30Days: returnSince(moment().subtract(30, 'days').format('YYYY-MM-DD')),
      last7Days: returnSince(moment().subtract(7, 'days').format('YYYY-MM-DD')),
    },
    ctx
  );
}

async function callApi(args: Args, ctx: ToolContext): Promise<string> {
  const method = (str(args.method) || 'GET').toUpperCase();
  const path = str(args.path);
  if (/^https?:\/\//i.test(path)) {
    return 'Error: call_api takes a path such as /analytics/risk, not a full URL.';
  }
  if (!path.startsWith('/')) return 'Error: path must start with "/".';
  if (BLOCKED_PATHS.some((re) => re.test(path))) return `Error: ${path} is not available to the agent.`;
  const response = await backend(method, path, ctx, args.body);
  if (response.status === 202) {
    return `HTTP 202: ${path} is still loading market data. Don't ask for it again in this answer; say it isn't available yet.`;
  }
  return truncate(`HTTP ${response.status}\n${JSON.stringify(compact(response.data))}`, ctx.limit);
}

function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|head)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();
}

const PRIVATE_HOST =
  /^(localhost|127\.|0\.0\.0\.0|\[?::1\]?|host\.docker\.internal|backend|frontend|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|[^.]+$|.+\.local$|.+\.internal$)/i;

const APP_DATA_HINT =
  "The user's own portfolio data comes from the app's tools (get_portfolio_overview, get_accounts, get_realized_gains, get_transactions and the others), or from call_api with a path like /analytics/risk.";

async function fetchUrl(args: Args, ctx: ToolContext): Promise<string> {
  const url = str(args.url);
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return 'Error: url must be a full http:// or https:// address.';
  }
  if (!/^https?:$/i.test(new URL(url).protocol)) return 'Error: url must start with http:// or https://.';
  if (PRIVATE_HOST.test(host)) {
    return `Error: fetch_url only reads public web pages. ${APP_DATA_HINT}`;
  }
  const response = await axios.get(url, {
    timeout: 20_000,
    maxContentLength: 3_000_000,
    responseType: 'text',
    transformResponse: (data) => data,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioDashboardAgent/1.0)' },
    validateStatus: () => true,
  });
  const type = String(response.headers['content-type'] ?? '');
  const text = type.includes('html') ? htmlToText(String(response.data)) : String(response.data);
  return truncate(`HTTP ${response.status}\n${text}`, ctx.limit);
}

async function webSearch(args: Args): Promise<string> {
  const query = str(args.query);
  if (!query) return 'Error: query is empty.';
  const response = await axios.get('https://html.duckduckgo.com/html/', {
    params: { q: query },
    timeout: 20_000,
    responseType: 'text',
    transformResponse: (data) => data,
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioDashboardAgent/1.0)' },
  });
  const html = String(response.data);
  const results: string[] = [];
  const linkRe =
    /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
  let match: RegExpExecArray | null = linkRe.exec(html);
  while (match && results.length < 6) {
    let href = match[1].replace(/&amp;/g, '&');
    const uddg = /[?&]uddg=([^&]+)/.exec(href);
    if (uddg) href = decodeURIComponent(uddg[1]);
    results.push(`${htmlToText(match[2])}\n${href}\n${htmlToText(match[3])}`);
    match = linkRe.exec(html);
  }
  return results.length ? results.join('\n\n') : `No results for "${query}".`;
}

const SYMBOL = { type: 'string', description: 'Ticker symbol, e.g. AAPL or BTC' };

const SPECS: ToolSpec[] = [
  {
    name: 'get_portfolio_overview',
    description:
      "The user's portfolio right now: total value, cash, today's change, unrealized gain or loss, and every holding with price, weight and gain or loss. Use for 'how am I doing', 'what do I own', 'summarize my portfolio', 'biggest positions'.",
    run: portfolioOverview,
  },
  {
    name: 'get_accounts',
    description:
      "The user's brokerage accounts: name, tax type (taxable, tax-deferred, tax-free), cash balance, value and largest holdings in each. Use for 'my accounts', 'how much cash', 'account details'.",
    run: accountsSummary,
  },
  {
    name: 'get_realized_gains',
    description:
      'Realized gains and losses from sales: the total for a year split into short-term and long-term, the largest sales that year, and every year for comparison. Use for "what have I realized", "capital gains this year".',
    parameters: { year: { type: 'number', description: 'Calendar year; defaults to the current year' } },
    run: realizedGains,
  },
  {
    name: 'get_transactions',
    description:
      "The user's recorded buys, sells, deposits, withdrawals and dividends, newest first. Filter by symbol, action and date range.",
    parameters: {
      symbol: SYMBOL,
      action: { type: 'string', description: 'buy, sell, deposit, withdrawal or dividend' },
      from: { type: 'string', description: 'Earliest date, YYYY-MM-DD' },
      to: { type: 'string', description: 'Latest date, YYYY-MM-DD' },
      limit: { type: 'number', description: 'How many to return, up to 100 (default 25)' },
    },
    run: transactions,
  },
  {
    name: 'get_holding',
    description:
      'One symbol the user holds, across accounts: quantity, average cost, and tax lots with purchase dates (for holding periods and short- vs long-term).',
    parameters: { symbol: SYMBOL },
    required: ['symbol'],
    run: passThrough((a) => `/holdings/symbol/${encodeURIComponent(symbolArg(a))}`),
  },
  {
    name: 'get_performance',
    description:
      "The portfolio's time-weighted return since tracking started, year to date, over the last 30 days and the last 7 days.",
    run: performance,
  },
  {
    name: 'get_daily_brief',
    description: "The app's daily brief: what moved in the portfolio today and what is coming up.",
    run: passThrough(() => '/dashboard/brief'),
  },
  {
    name: 'get_tax_exposure',
    description:
      'Estimated tax on unrealized gains by holding, and lots that will turn long-term soon (and what waiting would save).',
    run: passThrough(() => '/analytics/tax-exposure'),
  },
  {
    name: 'get_tax_loss_harvesting',
    description: 'Holdings with losses that could be sold to offset gains, with wash-sale warnings.',
    run: passThrough(() => '/analytics/tax-loss-harvesting'),
  },
  {
    name: 'get_dividends',
    description: 'Dividends received and expected from the holdings.',
    run: passThrough(() => '/analytics/dividends'),
  },
  {
    name: 'get_risk',
    description: "The portfolio's risk: volatility, drawdown, beta, Sharpe ratio and concentration.",
    run: passThrough(() => '/analytics/risk'),
  },
  {
    name: 'get_sector_allocation',
    description: 'How the portfolio is split across sectors.',
    run: passThrough(() => '/analytics/sectors'),
  },
  {
    name: 'get_rebalance_plan',
    description: "The user's target allocation, how far each holding has drifted, and the suggested buys and sells.",
    run: passThrough(() => '/rebalance/plan'),
  },
  {
    name: 'get_alerts',
    description: "The user's price alerts, what each measures from, and how far it is from triggering.",
    run: passThrough(() => '/alerts/status'),
  },
  {
    name: 'get_quote',
    description: "A symbol's live price, today's change and today's range. Public market data.",
    parameters: { symbol: SYMBOL },
    required: ['symbol'],
    run: passThrough((a) => `/live/quote/${encodeURIComponent(symbolArg(a))}`),
  },
  {
    name: 'get_company',
    description: "A company's profile and key metrics (P/E, margins, 52-week range). Public market data.",
    parameters: { symbol: SYMBOL },
    required: ['symbol'],
    run: async (a, ctx) => {
      const symbol = encodeURIComponent(symbolArg(a));
      const [profile, metrics] = await Promise.all([
        getData(`/live/company-profile/${symbol}`, ctx),
        getData(`/live/metrics/${symbol}`, ctx),
      ]);
      return asJson({ profile, metrics }, ctx);
    },
  },
  {
    name: 'get_symbol_news',
    description: 'Recent news headlines for one symbol.',
    parameters: { symbol: SYMBOL },
    required: ['symbol'],
    run: passThrough((a) => `/live/news/${encodeURIComponent(symbolArg(a))}`),
  },
  {
    name: 'get_market_overview',
    description: "Whether the market is open, and today's biggest movers.",
    run: async (_a, ctx) => {
      const [status, movers] = await Promise.all([
        getData('/live/market-status', ctx),
        getData('/live/market-movers', ctx),
      ]);
      return asJson({ status, movers }, ctx);
    },
  },
  {
    name: 'call_api',
    description:
      'Call any other Portfolio Dashboard route listed in the system prompt, by path (for example /analytics/correlation). Use the named tools first. GET runs immediately; any other method changes data and waits for the user to approve it.',
    parameters: {
      method: { type: 'string', description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] },
      path: { type: 'string', description: 'Path only, with any query string, e.g. /analytics/correlation' },
      body: { type: 'object', description: 'JSON body for POST, PUT and PATCH' },
    },
    required: ['method', 'path'],
    run: callApi,
  },
  {
    name: 'web_search',
    description:
      "Search the public web for things the app doesn't know: news, company background, explanations. Never for the user's own holdings, accounts, gains or transactions; the web knows nothing about them.",
    parameters: { query: { type: 'string', description: 'Search terms' } },
    required: ['query'],
    run: webSearch,
  },
  {
    name: 'fetch_url',
    description: 'Read a public web page found with web_search. Not for the app itself.',
    parameters: { url: { type: 'string', description: 'A public https URL' } },
    required: ['url'],
    run: fetchUrl,
  },
];

export const AGENT_TOOLS: OllamaTool[] = SPECS.map((spec) => ({
  type: 'function',
  function: {
    name: spec.name,
    description: spec.description,
    parameters: { type: 'object', properties: spec.parameters ?? {}, required: spec.required ?? [] },
  },
}));

export function needsApproval(call: OllamaToolCall): boolean {
  return call.function.name === 'call_api' && str(call.function.arguments?.method).toUpperCase() !== 'GET';
}

export async function runAgentTool(call: OllamaToolCall, ctx: ToolContext): Promise<string> {
  const spec = SPECS.find((s) => s.name === call.function.name);
  if (!spec) {
    return `Error: there is no tool called "${call.function.name}". Use one of: ${SPECS.map((s) => s.name).join(', ')}.`;
  }
  try {
    return await spec.run(call.function.arguments ?? {}, ctx);
  } catch (err: any) {
    return err instanceof ToolError ? `Error: ${err.message}` : `Error: ${err?.message ?? 'tool failed'}`;
  }
}
