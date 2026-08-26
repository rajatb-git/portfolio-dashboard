// Shared news heuristics: which headlines are market-moving, and which of them
// are about something the user actually holds. Used by both the push-notification
// watcher and the Today page's news digest so a headline flagged "breaking" in a
// notification looks the same in the UI.

// Headline patterns that separate a market-moving story from routine coverage.
export const BREAKING_PATTERNS: RegExp[] = [
  /\btrading halt(ed)?\b/i,
  /\bhalt(ed|s)? trading\b/i,
  // Inflected forms matter here: the wire writes "surging", "rallies" and
  // "tumbled" far more often than the bare verb, so each stem carries its own
  // endings rather than a shared suffix group (which would only ever match
  // non-words like "surgeing").
  /\b(plung|tumbl)(e|es|ed|ing)\b/i,
  /\b(plummet|slump|crash)(s|ed|ing|es)?\b/i,
  /\b(sink|sinks|sinking|sank|sunk)\b/i,
  /\b(surg|spik)(e|es|ed|ing)\b/i,
  /\b(soar|jump|skyrocket)(s|ed|ing)?\b/i,
  /\b(rally|rallies|rallied|rallying)\b/i,
  /\b(downgrade|upgrade)[sd]?\b/i,
  /\bprice target\b/i,
  /\bguidance\b/i,
  /\bprofit warning\b/i,
  /\b(beats|misses|tops)\b.*\b(estimates|expectations)\b/i,
  /\bearnings\b/i,
  /\brecall(s|ed)?\b/i,
  /\b(lawsuit|sues|sued)\b/i,
  /\b(investigation|probe|subpoena)\b/i,
  /\b(sec|doj|ftc)\b.*\b(charge|probe|sue|investigat)/i,
  /\bfraud\b/i,
  /\b(bankruptcy|chapter 11)\b/i,
  /\b(merger|acquisition|acquires|buyout|takeover|to buy)\b/i,
  /\blayoffs?\b/i,
  /\b(ceo|cfo)\b.*\b(steps down|resigns|ousted|fired|departs)\b/i,
  /\bfda (approval|approves|rejects)\b/i,
  /\bbreaking\b/i,
  /\bactivist (stake|investor)\b/i,
  /\bshort seller\b/i,
  /\bdelisting\b/i,
  /\bdividend (cut|hike|increase)\b/i,
  /\bstock split\b/i,
  /\b(secondary|share) offering\b/i,
  /\bbankrupt\b/i,
];

// Suffixes stripped before matching a company name inside a headline.
const NAME_NOISE = /\b(inc|corp|corporation|co|ltd|llc|plc|holdings?|group|company|the|sa|nv|ag)\b\.?/gi;

// Tickers that are also ordinary English words, where a bare-token match would
// tag half the wire as being about the position.
const AMBIGUOUS_TICKERS = new Set([
  'ALL',
  'ARE',
  'CAN',
  'CAR',
  'EAT',
  'FAST',
  'FOR',
  'GO',
  'HAS',
  'IT',
  'KEY',
  'LOW',
  'NEW',
  'NOW',
  'ON',
  'ONE',
  'OPEN',
  'OUT',
  'PLUS',
  'REAL',
  'RUN',
  'SO',
  'TRUE',
  'TWO',
  'UP',
  'WELL',
]);

export const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A holding's company name reduced to the words worth matching on.
export const normalizeCompanyName = (name: string): string =>
  name
    .replace(NAME_NOISE, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const matchedPatterns = (text: string): string[] => {
  const hits: string[] = [];
  for (const pattern of BREAKING_PATTERNS) {
    const match = text.match(pattern);
    if (match) hits.push(match[0].toLowerCase());
  }
  return hits;
};

// A broad headline counts as being about a holding when it names the ticker as a
// standalone token — in caps, so "IT spending" doesn't match a holding in IT —
// or spells out the company name. `watched` maps symbol -> normalized name.
export const relatedSymbol = (text: string, watched: Map<string, string>): string | null => {
  for (const [symbol, name] of watched) {
    if (!AMBIGUOUS_TICKERS.has(symbol) && new RegExp(`\\b${escapeRegex(symbol)}\\b`).test(text)) return symbol;
    if (name.length >= 4 && new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(text)) return symbol;
  }
  return null;
};
