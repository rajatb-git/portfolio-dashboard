import * as dotenv from 'dotenv';

dotenv.config();

import * as fs from 'node:fs';
import * as path from 'node:path';
import { closeMongoClient, DEFAULT_MONGO_DB_NAME, getMongoDb } from '../utils/mongoClient';
import { etDateAndMinutes, getMarketSession, type MarketSession } from '../utils/marketCalendar';

// One-off measurement of Finnhub's WebSocket trade stream on the user's own key,
// to decide whether quotes should move off REST polling. Finnhub documents the
// stream as free for up to 50 US symbols with one connection per key, but not
// whether ETFs or pre-/post-market trades come through on the free plan, how
// chatty it is, or how often it drops — this run answers those empirically.
//
//   pnpm --filter @portfolio/backend probe:finnhub-ws -- --minutes 15
//
// Flags: --minutes N (default 10) · --symbols A,B · --no-holdings · --no-rest ·
// --limit-test (pads past 50 symbols to see how the cap is enforced).
//
// Holdings are read from the real database (never demo) for their tickers only;
// quantities and prices are not touched. The written report holds tickers and
// public market data, never the API key.

const WS_URL = 'wss://ws.finnhub.io';
const SYMBOL_CAP = 50;
const CONTROL_SYMBOLS = ['AAPL', 'SPY', 'BINANCE:BTCUSDT'];
const LIMIT_TEST_FILLERS = (
  'MSFT NVDA AMZN GOOGL META TSLA AMD NFLX INTC ORCL CSCO PEP KO WMT JPM BAC XOM CVX PFE MRK T VZ DIS NKE MCD BA GE F ' +
  'GM UBER PYPL SHOP SQ PLTR SOFI COIN HOOD RIVN LCID SNAP PINS ROKU ZM DOCU CRM ADBE QCOM TXN MU AVGO IBM C WFC GS ' +
  'MS V MA HD LOW COST'
).split(' ');
const STATUS_EVERY_MS = 30_000;
const REST_SPACING_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const CONNECT_TIMEOUT_MS = 15_000;

type Args = { minutes: number; symbols: string[]; holdings: boolean; rest: boolean; limitTest: boolean };

const parseArgs = (argv: string[]): Args => {
  const args: Args = { minutes: 10, symbols: [], holdings: true, rest: true, limitTest: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === '--minutes') args.minutes = Math.max(1, Number(argv[++i]) || 10);
    else if (flag === '--symbols')
      args.symbols = String(argv[++i] ?? '')
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
    else if (flag === '--no-holdings') args.holdings = false;
    else if (flag === '--no-rest') args.rest = false;
    else if (flag === '--limit-test') args.limitTest = true;
  }
  return args;
};

type SymbolStats = {
  symbol: string;
  source: 'holding' | 'flag' | 'control' | 'filler';
  trades: number;
  volume: number;
  zeroVolumeUpdates: number;
  firstTradeAt: number | null;
  lastTradeAt: number | null;
  lastPrice: number | null;
  sessions: Record<MarketSession, number>;
  conditions: Record<string, number>;
};

const newStats = (symbol: string, source: SymbolStats['source']): SymbolStats => ({
  symbol,
  source,
  trades: 0,
  volume: 0,
  zeroVolumeUpdates: 0,
  firstTradeAt: null,
  lastTradeAt: null,
  lastPrice: null,
  sessions: { 'pre-market': 0, regular: 0, 'post-market': 0, closed: 0 },
  conditions: {},
});

const isCrypto = (symbol: string): boolean => symbol.includes(':');

const percentile = (values: number[], p: number): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
};

const etTime = (ms: number): string =>
  new Date(ms).toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false });

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function loadHoldingSymbols(): Promise<string[]> {
  const db = await getMongoDb(DEFAULT_MONGO_DB_NAME);
  const holdings = await db
    .collection('holdings')
    .find({}, { projection: { symbol: 1, type: 1 } })
    .toArray();
  const symbols = new Set<string>();
  for (const h of holdings) {
    if (!h.symbol) continue;
    const symbol = String(h.symbol).toUpperCase();
    symbols.add(h.type === 'crypto' ? `BINANCE:${symbol}USDT` : symbol);
  }
  return [...symbols];
}

async function main(): Promise<void> {
  const token = process.env.FINN_HUB_API_KEY;
  if (!token) throw new Error('FINN_HUB_API_KEY is not set (packages/backend/.env)');
  if (typeof WebSocket === 'undefined')
    throw new Error(`Node ${process.version} has no global WebSocket — use Node 22+`);

  const args = parseArgs(process.argv.slice(2));
  const scrub = (text: string): string => text.split(token).join('<token>');

  const stats = new Map<string, SymbolStats>();
  const add = (symbol: string, source: SymbolStats['source']) => {
    if (!stats.has(symbol)) stats.set(symbol, newStats(symbol, source));
  };

  // Controls first so the cap can never squeeze out the ETF and crypto checks.
  for (const s of CONTROL_SYMBOLS) add(s, 'control');
  if (args.holdings) {
    try {
      for (const s of await loadHoldingSymbols()) add(s, 'holding');
    } catch (err: any) {
      console.warn(`Could not read holdings (${err.message}) — continuing with control/flag symbols only.`);
    }
  }
  for (const s of args.symbols) add(s, 'flag');

  let dropped: string[] = [];
  if (args.limitTest) {
    for (const s of LIMIT_TEST_FILLERS) {
      if (stats.size >= SYMBOL_CAP + 5) break;
      add(s, 'filler');
    }
  } else if (stats.size > SYMBOL_CAP) {
    const all = [...stats.keys()];
    dropped = all.slice(SYMBOL_CAP);
    for (const s of dropped) stats.delete(s);
    console.warn(`More than ${SYMBOL_CAP} symbols — not subscribing to: ${dropped.join(', ')}`);
  }

  const subscribed = [...stats.keys()];
  const startedAt = Date.now();
  const endAt = startedAt + args.minutes * 60_000;

  console.log(
    `Probing ${subscribed.length} symbol(s) for ${args.minutes} min — session now: ${getMarketSession()} (${etTime(startedAt)} ET)`
  );

  const typeCounts: Record<string, number> = {};
  const perSecond = new Map<number, number>();
  const latencies: number[] = [];
  const pingTimes: number[] = [];
  const serverErrors: Record<string, number> = {};
  const otherSamples: string[] = [];
  const closes: Array<{ at: number; code: number; reason: string }> = [];
  let bytes = 0;
  let messages = 0;
  let opens = 0;
  let disconnects = 0;
  let failedHandshakes = 0;
  let downSince: number | null = startedAt;
  let downtimeMs = 0;
  const conn: { socket: WebSocket | null } = { socket: null };
  let finished = false;
  let reconnectDelay = 1000;

  const onMessage = (raw: string) => {
    const now = Date.now();
    messages++;
    bytes += raw.length;
    const second = Math.floor(now / 1000);
    perSecond.set(second, (perSecond.get(second) ?? 0) + 1);

    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      typeCounts.unparseable = (typeCounts.unparseable ?? 0) + 1;
      return;
    }
    const type = String(msg?.type ?? 'unknown');
    typeCounts[type] = (typeCounts[type] ?? 0) + 1;

    if (type === 'ping') {
      pingTimes.push(now);
      return;
    }
    if (type === 'error') {
      const text = scrub(String(msg.msg ?? raw));
      serverErrors[text] = (serverErrors[text] ?? 0) + 1;
      return;
    }
    if (type !== 'trade') {
      if (otherSamples.length < 5) otherSamples.push(scrub(raw.slice(0, 300)));
      return;
    }

    for (const trade of msg.data ?? []) {
      const entry = stats.get(trade.s) ?? newStats(trade.s, 'flag');
      stats.set(trade.s, entry);
      const t = Number(trade.t);
      entry.trades++;
      entry.volume += Number(trade.v) || 0;
      if (!trade.v) entry.zeroVolumeUpdates++;
      entry.firstTradeAt ??= t;
      entry.lastTradeAt = t;
      entry.lastPrice = Number(trade.p);
      if (!isCrypto(trade.s)) entry.sessions[getMarketSession(new Date(t))]++;
      for (const c of trade.c ?? []) entry.conditions[c] = (entry.conditions[c] ?? 0) + 1;
      if (Number.isFinite(t) && latencies.length < 200_000) latencies.push(now - t);
    }
  };

  const connect = () => {
    if (finished) return;
    const ws = new WebSocket(`${WS_URL}?token=${token}`);
    conn.socket = ws;
    let opened = false;
    // A handshake that never answers would otherwise leave the whole run silent.
    const connectTimer = setTimeout(() => {
      if (!opened) ws.close();
    }, CONNECT_TIMEOUT_MS);

    ws.addEventListener('open', () => {
      opened = true;
      clearTimeout(connectTimer);
      opens++;
      reconnectDelay = 1000;
      if (downSince !== null) {
        if (opens > 1) downtimeMs += Date.now() - downSince;
        downSince = null;
      }
      for (const symbol of subscribed) ws.send(JSON.stringify({ type: 'subscribe', symbol }));
      console.log(`Connected (#${opens}); subscribed to ${subscribed.length} symbol(s).`);
    });

    ws.addEventListener('message', (event: MessageEvent) => onMessage(String(event.data)));

    // Node's WebSocket reports a failed handshake (Finnhub answers a bad key with
    // HTTP 401) with an error event and no close event, while a dropped live
    // connection gets both — so either one may be the only signal, once.
    let down = false;
    const onDown = (code: number | null, reason: string) => {
      clearTimeout(connectTimer);
      if (down || finished) return;
      down = true;
      downSince ??= Date.now();
      if (opened) {
        disconnects++;
        closes.push({ at: Date.now(), code: code ?? 0, reason });
        console.warn(
          `Disconnected (${code ?? 'error'}${reason ? `: ${reason}` : ''}); retrying in ${reconnectDelay / 1000}s`
        );
      } else {
        failedHandshakes++;
        console.warn(
          `Could not connect (attempt ${failedHandshakes}${reason ? `: ${reason}` : ''}) — check the network, FINN_HUB_API_KEY, and that nothing else holds this key's one connection; retrying in ${reconnectDelay / 1000}s`
        );
      }
      setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(MAX_RECONNECT_DELAY_MS, reconnectDelay * 2);
    };

    ws.addEventListener('error', (event: Event) => onDown(null, scrub(String((event as any).message ?? ''))));
    ws.addEventListener('close', (event: CloseEvent) => onDown(event.code, scrub(event.reason || '')));
  };

  const status = setInterval(() => {
    const live = [...stats.values()].filter((s) => s.trades > 0).length;
    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `[${elapsed}s] ${downSince === null ? 'connected' : 'DOWN'} · ${messages} msgs · ${live}/${subscribed.length} symbols with trades · ${disconnects} disconnect(s)`
    );
  }, STATUS_EVERY_MS);

  connect();
  await new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, endAt - Date.now());
    process.once('SIGINT', () => {
      clearTimeout(timer);
      console.log('\nStopping early…');
      resolve();
    });
  });

  finished = true;
  clearInterval(status);
  const stoppedAt = Date.now();
  if (downSince !== null && opens > 0) downtimeMs += stoppedAt - downSince;
  conn.socket?.close();

  // REST /quote for every stock symbol, gently paced so a backend running
  // alongside keeps most of the shared 60/min budget. Tells us which symbols the
  // free REST quote covers (ETFs return c=0) next to which ones streamed, how far
  // the streamed price sits from REST, and whether rate-limit headers are sent.
  const rest: Record<string, { status: number; c: number | null; t: number | null }> = {};
  const rateLimitHeaders: Array<Record<string, string | null>> = [];
  if (args.rest) {
    const stocks = subscribed.filter((s) => !isCrypto(s));
    console.log(
      `Checking ${stocks.length} symbol(s) against REST /quote (~${(stocks.length * REST_SPACING_MS) / 1000}s)…`
    );
    for (const symbol of stocks) {
      try {
        const res = await fetch(
          `${process.env.FINN_HUB_API || 'https://finnhub.io/api/v1'}/quote?symbol=${encodeURIComponent(symbol)}`,
          { headers: { 'X-Finnhub-Token': token } }
        );
        const body: any = res.ok ? await res.json() : null;
        rest[symbol] = { status: res.status, c: body?.c ?? null, t: body?.t ?? null };
        rateLimitHeaders.push({
          symbol,
          status: String(res.status),
          limit: res.headers.get('x-ratelimit-limit'),
          remaining: res.headers.get('x-ratelimit-remaining'),
          reset: res.headers.get('x-ratelimit-reset'),
          retryAfter: res.headers.get('retry-after'),
        });
      } catch (err: any) {
        rest[symbol] = { status: 0, c: null, t: null };
        console.warn(`REST /quote ${symbol} failed: ${scrub(err.message)}`);
      }
      await sleep(REST_SPACING_MS);
    }
  }

  const durationSec = (stoppedAt - startedAt) / 1000;
  const peakPerSecond = Math.max(0, ...perSecond.values());
  const pingIntervals = pingTimes.slice(1).map((t, i) => t - pingTimes[i]);
  const all = [...stats.values()];
  const silent = all.filter((s) => s.trades === 0).map((s) => s.symbol);

  const symbols = all.map((s) => {
    const restQuote = rest[s.symbol];
    const restPrice = restQuote?.c && restQuote.c > 0 ? restQuote.c : null;
    return {
      symbol: s.symbol,
      source: s.source,
      trades: s.trades,
      tradesPerMin: +(s.trades / (durationSec / 60)).toFixed(1),
      volume: s.volume,
      zeroVolumeUpdates: s.zeroVolumeUpdates,
      firstTradeEt: s.firstTradeAt ? etTime(s.firstTradeAt) : null,
      lastTradeEt: s.lastTradeAt ? etTime(s.lastTradeAt) : null,
      lastPrice: s.lastPrice,
      sessions: s.sessions,
      conditions: s.conditions,
      restStatus: restQuote?.status ?? null,
      restPrice: restQuote?.c ?? null,
      restCovered: restQuote ? restPrice !== null : null,
      priceDiffPct: restPrice && s.lastPrice ? +(((s.lastPrice - restPrice) / restPrice) * 100).toFixed(3) : null,
    };
  });

  const overCap = subscribed.slice(SYMBOL_CAP);
  const report = {
    run: {
      startedEt: etTime(startedAt),
      stoppedEt: etTime(stoppedAt),
      tradingDay: etDateAndMinutes(new Date(startedAt)).dateStr,
      sessionAtStart: getMarketSession(new Date(startedAt)),
      sessionAtEnd: getMarketSession(new Date(stoppedAt)),
      durationSec: Math.round(durationSec),
      node: process.version,
      subscribed: subscribed.length,
      notSubscribedOverCap: dropped,
    },
    connection: {
      opens,
      disconnects,
      failedHandshakes,
      closes,
      downtimeSec: Math.round(downtimeMs / 1000),
      serverErrors,
      pingIntervalSecMedian:
        percentile(pingIntervals, 50) !== null ? (percentile(pingIntervals, 50) as number) / 1000 : null,
    },
    volume: {
      messages,
      messageTypes: typeCounts,
      avgMessagesPerSec: +(messages / durationSec).toFixed(2),
      peakMessagesPerSec: peakPerSecond,
      avgKBPerSec: +(bytes / 1024 / durationSec).toFixed(2),
      tradeLatencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
    },
    coverage: {
      symbolsWithTrades: all.length - silent.length,
      silentSymbols: silent,
      restUncoveredButStreamed: symbols.filter((s) => s.restCovered === false && s.trades > 0).map((s) => s.symbol),
      restUncoveredAndSilent: symbols.filter((s) => s.restCovered === false && s.trades === 0).map((s) => s.symbol),
      limitTest: args.limitTest
        ? {
            overCapSymbols: overCap,
            overCapWithTrades: overCap.filter((s) => (stats.get(s)?.trades ?? 0) > 0),
          }
        : null,
    },
    extendedHours: {
      preMarketTrades: all.reduce((n, s) => n + s.sessions['pre-market'], 0),
      postMarketTrades: all.reduce((n, s) => n + s.sessions['post-market'], 0),
      regularTrades: all.reduce((n, s) => n + s.sessions.regular, 0),
      closedTrades: all.reduce((n, s) => n + s.sessions.closed, 0),
    },
    rateLimitHeaders: {
      sent: rateLimitHeaders.some((h) => h.limit !== null || h.remaining !== null),
      first: rateLimitHeaders[0] ?? null,
      last: rateLimitHeaders[rateLimitHeaders.length - 1] ?? null,
    },
    otherMessageSamples: otherSamples,
    symbols,
  };

  const stamp = new Date(startedAt).toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outFile = path.resolve(process.cwd(), `finnhub-ws-probe-${stamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

  const yesNo = (v: boolean) => (v ? 'yes' : 'no');
  const ms = (v: number | null) => (v === null ? 'n/a' : `${v}ms`);
  const spy = stats.get('SPY');
  console.log('\n=== Finnhub WebSocket probe ===');
  console.log(
    `Window:        ${report.run.startedEt} → ${report.run.stoppedEt} ET (${report.run.sessionAtStart} → ${report.run.sessionAtEnd})`
  );
  console.log(
    `Connected:     ${yesNo(opens > 0)} · disconnects ${disconnects} · failed handshakes ${failedHandshakes} · downtime ${report.connection.downtimeSec}s`
  );
  if (opens === 0) console.log('               Never connected — nothing below measures the stream.');
  const errorLines = Object.entries(serverErrors).map(([text, n]) => `${text} (×${n})`);
  if (errorLines.length) console.log(`Server errors: ${errorLines.join(' | ')}`);
  console.log(
    `Messages:      ${messages} (avg ${report.volume.avgMessagesPerSec}/s, peak ${peakPerSecond}/s, ${report.volume.avgKBPerSec} KB/s)`
  );
  console.log(
    `Latency:       p50 ${ms(report.volume.tradeLatencyMs.p50)} · p95 ${ms(report.volume.tradeLatencyMs.p95)} (includes clock skew)`
  );
  console.log(`Coverage:      ${report.coverage.symbolsWithTrades}/${all.length} symbols traded`);
  if (silent.length) console.log(`Silent:        ${silent.join(', ')}`);
  console.log(
    `ETF (SPY):     ${spy && spy.trades > 0 ? `streamed ${spy.trades} trades` : 'no trades'}${rest.SPY ? ` · REST /quote c=${rest.SPY.c}` : ''}`
  );
  console.log(
    `Sessions:      pre ${report.extendedHours.preMarketTrades} · regular ${report.extendedHours.regularTrades} · post ${report.extendedHours.postMarketTrades} · closed ${report.extendedHours.closedTrades}`
  );
  if (report.coverage.limitTest)
    console.log(
      `Limit test:    ${overCap.length} over cap, ${report.coverage.limitTest.overCapWithTrades.length} of them got trades`
    );
  if (args.rest) {
    const diffs = symbols
      .map((s) => s.priceDiffPct)
      .filter((d): d is number => d !== null)
      .map(Math.abs);
    console.log(`REST headers:  x-ratelimit-* ${report.rateLimitHeaders.sent ? 'present' : 'absent'}`);
    console.log(`WS vs REST:    median |diff| ${percentile(diffs, 50) ?? 'n/a'}% over ${diffs.length} symbol(s)`);
  }
  console.log(`\nFull report:   ${outFile}`);
}

main()
  .catch((err) => {
    console.error('Probe failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeMongoClient();
    // Node's WebSocket can hold the loop open briefly after close().
    setTimeout(() => process.exit(), 500).unref();
  });
