import { HoldingAggregate } from '@/api/dashboard';
import { IAccount } from '@/models/AccountsModel';
import { IHoldings } from '@/models/HoldingsModel';

export const visuallyHidden = {
  border: 0,
  margin: -1,
  padding: 0,
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
};

function descendingComparator(a: any, b: any, orderBy: string) {
  if (a[orderBy] === null) {
    return 1;
  }
  if (b[orderBy] === null) {
    return -1;
  }
  if (b[orderBy] < a[orderBy]) {
    return -1;
  }
  if (b[orderBy] > a[orderBy]) {
    return 1;
  }
  return 0;
}

export function getComparator(order: 'asc' | 'desc', orderBy: string) {
  return order === 'desc'
    ? (a: any, b: any) => descendingComparator(a, b, orderBy)
    : (a: any, b: any) => -descendingComparator(a, b, orderBy);
}

export type Total = {
  accountId: string;
  accountName?: string;
  cashBalance?: number;
  totalGL: number;
  percentGL: number;
  totalInvestment: number;
  totalValue: number;
};

const calculateTotals = (inputData: any, accounts: Array<IAccount> = []): Array<Total> => {
  const tempMap: { [key: string]: Total } = {};

  inputData.forEach((x: HoldingAggregate) => {
    if (!tempMap[x.accountId]) {
      tempMap[x.accountId] = { accountId: x.accountId, totalGL: 0, percentGL: 0, totalInvestment: 0, totalValue: 0 };
    }

    tempMap[x.accountId].totalGL += x.totalGL || 0;
    tempMap[x.accountId].totalInvestment += x.originalValue || 0;
  });

  // Make sure every account is represented even if it currently has no holdings,
  // so cash-only accounts still appear in the summary cards.
  accounts.forEach((a) => {
    if (!tempMap[a.id]) {
      tempMap[a.id] = { accountId: a.id, totalGL: 0, percentGL: 0, totalInvestment: 0, totalValue: 0 };
    }
  });

  const accountMap = new Map(accounts.map((a) => [a.id, a]));

  const tempArray = Object.values(tempMap);
  tempArray.forEach((x) => {
    x.percentGL = x.totalInvestment > 0 ? x.totalGL / x.totalInvestment : 0;
    x.totalValue = x.totalGL + x.totalInvestment;
    const acc = accountMap.get(x.accountId);
    x.accountName = acc?.name ?? x.accountId;
    x.cashBalance = acc?.cashBalance ?? 0;
  });

  return tempArray;
};

export type EnrichedHolding = HoldingAggregate & { accountPercent?: number };

export type ConsolidatedHolding = EnrichedHolding & {
  accountCount: number;
  subRows: Array<EnrichedHolding>;
};

// Merge holdings that share a symbol across accounts into a single position.
// Quantities, market value, cost basis and gain/loss sum; average price becomes
// cost-basis-weighted. accountPercent is intentionally left undefined on the
// merged row — it only makes sense per account, so it surfaces on the sub-rows.
export function consolidateBySymbol(rows: Array<EnrichedHolding>): Array<ConsolidatedHolding> {
  const groups = new Map<string, Array<EnrichedHolding>>();
  rows.forEach((r) => {
    const list = groups.get(r.symbol) ?? [];
    list.push(r);
    groups.set(r.symbol, list);
  });

  const result: Array<ConsolidatedHolding> = [];
  groups.forEach((holdings) => {
    const totalQty = holdings.reduce((s, h) => s + (h.qty || 0), 0);
    const totalCost = holdings.reduce((s, h) => s + (h.averagePrice || 0) * (h.qty || 0), 0);
    const totalGL = holdings.reduce((s, h) => s + (h.totalGL || 0), 0);
    const marketValue = holdings.reduce((s, h) => s + (h.marketValue || 0), 0);
    const originalValue = holdings.reduce((s, h) => s + (h.originalValue || 0), 0);

    result.push({
      ...holdings[0],
      qty: totalQty,
      averagePrice: totalQty > 0 ? totalCost / totalQty : 0,
      totalGL,
      totalGLPercent: totalCost > 0 ? (totalGL / totalCost) * 100 : 0,
      marketValue,
      originalValue,
      accountPercent: undefined,
      accountCount: holdings.length,
      subRows: holdings,
    });
  });

  return result;
}

// Group holdings by account, ordering accounts by total market value (largest
// first) and preserving the incoming sort order within each account.
export function groupByAccount(rows: Array<EnrichedHolding>): Array<{ accountId: string; rows: Array<EnrichedHolding> }> {
  const groups = new Map<string, Array<EnrichedHolding>>();
  rows.forEach((r) => {
    const list = groups.get(r.accountId) ?? [];
    list.push(r);
    groups.set(r.accountId, list);
  });

  return Array.from(groups.entries())
    .map(([accountId, accountRows]) => ({ accountId, rows: accountRows }))
    .sort(
      (a, b) =>
        b.rows.reduce((s, r) => s + (r.marketValue || 0), 0) -
        a.rows.reduce((s, r) => s + (r.marketValue || 0), 0)
    );
}

export function applyFilter({
  inputData,
  comparator,
  filterName,
  filterAccount,
  filterType,
  accounts = [],
}: {
  filterName: string;
  comparator: Function;
  inputData: any;
  filterAccount: string;
  filterType: string;
  accounts?: Array<IAccount>;
}) {
  const stabilizedThis = inputData.map((el: any, index: number) => [el, index]);

  stabilizedThis.sort((a: any, b: any) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el: any) => el[0]);

  if (filterName) {
    inputData = inputData.filter(
      (x: IHoldings) =>
        x.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        x.symbol.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  if (filterType && filterType !== 'all') {
    inputData = inputData.filter((x: IHoldings) => x.type === filterType);
  }

  if (filterAccount && filterAccount !== 'all') {
    inputData = inputData.filter((x: IHoldings) => x.accountId === filterAccount);
  }

  // When an account is selected, only summarize that account so the cards don't
  // show every other account at $0 and misrepresent the portfolio.
  const accountsForTotals =
    filterAccount && filterAccount !== 'all' ? accounts.filter((a) => a.id === filterAccount) : accounts;

  return { dataFiltered: inputData, totals: calculateTotals(inputData, accountsForTotals) };
}
