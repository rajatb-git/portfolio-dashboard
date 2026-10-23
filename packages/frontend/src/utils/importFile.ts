import type { DateOrder, ImportKind, RawImportRow } from '@/api/import';

// Reads a broker export into a table and guesses which column is which. The
// backend does every check on the values themselves; this only finds the
// header and maps columns so the user can confirm them.

export type ImportField = keyof RawImportRow | 'account';

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  // 1-based line in the file where each row starts, for messages in the review.
  lines: number[];
  // Lines above the header (account titles, "as of" notes) that were ignored.
  preambleLines: number;
  delimiter: string;
};

export type ColumnMapping = Partial<Record<ImportField, number>>;

export const FIELD_LABELS: Record<ImportField, string> = {
  symbol: 'Symbol',
  name: 'Name / description',
  qty: 'Quantity',
  price: 'Price per share',
  costBasis: 'Total cost',
  amount: 'Amount',
  date: 'Date',
  action: 'Action',
  assetType: 'Asset type',
  account: 'Account (multi-account files)',
};

export const FIELD_HELP: Record<ImportKind, Partial<Record<ImportField, string>>> = {
  positions: {
    price: 'Average cost per share',
    costBasis: 'Total cost of the row — used when there is no per-share cost',
    amount: 'Current value — only used for cash and money-market rows',
    date: 'Date acquired — each dated row becomes its own tax lot',
  },
  history: {
    price: 'Execution price per share',
    amount: 'Cash amount — used for deposits/withdrawals and when there is no price',
    date: 'Trade date',
    action: 'Buy, sell, deposit, withdrawal (broker wording is understood)',
  },
};

export const FIELDS_FOR: Record<ImportKind, ImportField[]> = {
  positions: ['symbol', 'name', 'qty', 'price', 'costBasis', 'date', 'amount', 'assetType', 'account'],
  history: ['date', 'action', 'symbol', 'name', 'qty', 'price', 'amount', 'assetType', 'account'],
};

export const REQUIRED_FOR: Record<ImportKind, ImportField[]> = {
  positions: ['symbol', 'qty'],
  history: ['action', 'date'],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

// Most specific first; the first header matching an earlier synonym wins.
const SYNONYMS: Record<ImportKind, Partial<Record<ImportField, string[]>>> = {
  positions: {
    symbol: ['symbol', 'ticker', 'tickersymbol', 'securitysymbol', 'instrument', 'asset', 'coin', 'currency', 'code'],
    name: ['description', 'securitydescription', 'name', 'securityname', 'security', 'investmentname', 'assetname'],
    qty: ['quantity', 'qty', 'qtyquantity', 'shares', 'sharesquantity', 'units', 'totalbalance', 'balance'],
    price: [
      'averagecostbasis',
      'averagecost',
      'avgcost',
      'costpershare',
      'costshare',
      'costbasispershare',
      'unitcost',
      'pricepaid',
      'purchaseprice',
      'averageprice',
    ],
    costBasis: ['costbasistotal', 'totalcostbasis', 'costbasis', 'totalcost', 'cost'],
    amount: ['currentvalue', 'marketvalue', 'mktval', 'mktvalmarketvalue', 'value', 'totalvalue'],
    date: ['dateacquired', 'acquired', 'acquireddate', 'acquisitiondate', 'opendate', 'purchasedate', 'tradedate'],
    assetType: ['assettype', 'securitytype', 'assetclass', 'investmenttype', 'producttype'],
    account: ['accountnumber', 'account', 'accountname'],
  },
  history: {
    date: [
      'rundate',
      'tradedate',
      'activitydate',
      'transactiondate',
      'date',
      'timestamp',
      'processdate',
      'settlementdate',
      'settledate',
    ],
    action: ['action', 'transcode', 'transactiontype', 'activity', 'activitytype', 'side', 'transaction'],
    symbol: ['symbol', 'ticker', 'tickersymbol', 'instrument', 'asset', 'securitysymbol', 'coin', 'currency'],
    name: ['description', 'securitydescription', 'investmentname', 'name', 'securityname', 'security'],
    qty: ['quantity', 'quantitytransacted', 'qty', 'shares', 'units'],
    price: ['price', 'priceusd', 'pricepershare', 'shareprice', 'priceattransaction', 'executionprice', 'tradeprice'],
    amount: [
      'amount',
      'amountusd',
      'netamount',
      'principalamount',
      'totalinclusiveoffeesandorspread',
      'total',
      'subtotal',
      'value',
    ],
    assetType: ['assettype', 'securitytype', 'assetclass', 'investmenttype'],
    account: ['accountnumber', 'account', 'accountname'],
  },
};

const splitLine = (line: string, delimiter: string): string[] => {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell.trim() === '') {
      quoted = true;
      cell = '';
    } else if (ch === delimiter) {
      cells.push(cell.trim());
      cell = '';
    } else cell += ch;
  }
  cells.push(cell.trim());
  return cells;
};

// Splits into records (with their 1-based starting line), keeping newlines
// that sit inside quotes.
const splitRecords = (text: string): Array<{ text: string; line: number }> => {
  const out: Array<{ text: string; line: number }> = [];
  let current = '';
  let quoted = false;
  let line = 1;
  let start = 1;
  const body = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (const ch of body) {
    if (ch === '"') quoted = !quoted;
    if (ch === '\n' && !quoted) {
      if (current.trim()) out.push({ text: current, line: start });
      current = '';
      line++;
      start = line;
      continue;
    }
    if (ch === '\n') line++;
    current += ch;
  }
  if (current.trim()) out.push({ text: current, line: start });
  return out;
};

const detectDelimiter = (lines: string[]): string => {
  const candidates = [',', '\t', ';', '|'];
  let best = ',';
  let bestScore = 0;
  for (const d of candidates) {
    const counts = lines.slice(0, 30).map((l) => splitLine(l, d).length);
    const score = counts.filter((c) => c > 1).length * Math.max(...counts);
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
};

const headerScore = (cells: string[]): number => {
  const known = new Set(
    Object.values(SYNONYMS).flatMap((fields) => Object.values(fields).flatMap((list) => list ?? []))
  );
  return cells.filter((c) => c && known.has(norm(c))).length;
};

export const looksTabular = (text: string): boolean => {
  const records = splitRecords(text)
    .slice(0, 40)
    .map((r) => r.text);
  if (records.length < 2) return false;
  const delimiter = detectDelimiter(records);
  return records.some((r) => headerScore(splitLine(r, delimiter)) >= 2);
};

export const parseTable = (text: string): ParsedTable => {
  const records = splitRecords(text);
  if (!records.length) throw new Error('The file is empty');
  const delimiter = detectDelimiter(records.map((r) => r.text));
  const split = records.map((r) => splitLine(r.text, delimiter));

  let headerIndex = -1;
  let best = 1;
  split.slice(0, 40).forEach((cells, i) => {
    const score = headerScore(cells);
    if (score > best) {
      best = score;
      headerIndex = i;
    }
  });
  if (headerIndex < 0) {
    throw new Error(
      "Couldn't find a header row with column names like Symbol, Quantity or Date. Check the file is a CSV export, or use the local AI option"
    );
  }

  const headers = split[headerIndex].map((h, i) => h || `Column ${i + 1}`);
  // Footers and notes (disclaimers, "Pending activity" banners) are single
  // cells; a data row fills at least two columns.
  const data = split
    .map((cells, i) => ({ cells, line: records[i].line }))
    .slice(headerIndex + 1)
    .filter(({ cells }) => cells.filter((c) => c !== '').length >= 2);

  return {
    headers,
    rows: data.map(({ cells }) => headers.map((_, i) => cells[i] ?? '')),
    lines: data.map(({ line }) => line),
    preambleLines: records[headerIndex].line - 1,
    delimiter,
  };
};

export const autoMap = (headers: string[], kind: ImportKind): ColumnMapping => {
  const mapping: ColumnMapping = {};
  const used = new Set<number>();
  const normalized = headers.map(norm);
  for (const field of FIELDS_FOR[kind]) {
    for (const synonym of SYNONYMS[kind][field] ?? []) {
      const index = normalized.findIndex((h, i) => h === synonym && !used.has(i));
      if (index >= 0) {
        mapping[field] = index;
        used.add(index);
        break;
      }
    }
  }
  return mapping;
};

// Slash dates are ambiguous; any part above 12 settles the order.
export const detectDateOrder = (values: string[]): DateOrder | null => {
  let dayFirst = false;
  let monthFirst = false;
  for (const v of values) {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) continue;
    if (Number(m[1]) > 12) dayFirst = true;
    if (Number(m[2]) > 12) monthFirst = true;
  }
  if (dayFirst && !monthFirst) return 'DMY';
  if (monthFirst && !dayFirst) return 'MDY';
  return null;
};

export const accountValues = (table: ParsedTable, mapping: ColumnMapping): string[] => {
  if (mapping.account === undefined) return [];
  const values = new Set(table.rows.map((r) => r[mapping.account as number]).filter(Boolean));
  return [...values];
};

export const toImportRows = (
  table: ParsedTable,
  mapping: ColumnMapping,
  sourceAccount?: string
): { rows: RawImportRow[]; sourceRowNumbers: number[] } => {
  const rows: RawImportRow[] = [];
  const sourceRowNumbers: number[] = [];
  table.rows.forEach((cells, i) => {
    if (sourceAccount && mapping.account !== undefined && cells[mapping.account] !== sourceAccount) return;
    const row: RawImportRow = {};
    for (const [field, index] of Object.entries(mapping) as Array<[ImportField, number | undefined]>) {
      if (index === undefined || field === 'account') continue;
      const value = cells[index];
      if (value !== undefined && value !== '') (row as Record<string, string>)[field] = value;
    }
    rows.push(row);
    sourceRowNumbers.push(table.lines[i]);
  });
  return { rows, sourceRowNumbers };
};

const pdfText = async (file: File): Promise<string> => {
  // Loaded on demand so pdfjs (~1 MB) stays out of the main bundle.
  const pdfjsLib = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const content = await (await pdf.getPage(i)).getTextContent();
    pages.push(content.items.map((item: any) => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n');
};

export const isPdf = (file: File) => file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

export const readFileText = (file: File): Promise<string> => (isPdf(file) ? pdfText(file) : file.text());
