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

  return { dataFiltered: inputData, totals: calculateTotals(inputData, accounts) };
}
