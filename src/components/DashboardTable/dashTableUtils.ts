import { IHoldingsModel } from '@/models/HoldingsModel';

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
  userId: string;
  totalGL: number;
  percentGL: number;
  totalInvestment: number;
};

const calculateTotals = (inputData: any) => {
  const tempMap: { [key: string]: Total } = {};

  inputData.forEach((x: IHoldingsModel) => {
    if (!tempMap[x.userId]) {
      tempMap[x.userId] = { userId: x.userId, totalGL: 0, percentGL: 0, totalInvestment: 0 };
    }

    tempMap[x.userId].totalGL += x.totalGL || 0;
    tempMap[x.userId].totalInvestment += x.originalValue || 0;
  });

  const tempArray = Object.values(tempMap);
  tempArray.forEach((x) => {
    x.percentGL = x.totalGL / x.totalInvestment;
  });

  return tempArray;
};

export function applyFilter({
  inputData,
  comparator,
  filterName,
  filterUser,
  filterType,
}: {
  filterName: string;
  comparator: Function;
  inputData: any;
  filterUser: string;
  filterType: string;
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
      (x: IHoldingsModel) =>
        x.name.toLowerCase().indexOf(filterName.toLowerCase()) !== -1 ||
        x.symbol.toLowerCase().indexOf(filterName.toLowerCase()) !== -1
    );
  }

  if (filterType && filterType !== 'all') {
    inputData = inputData.filter((x: IHoldingsModel) => x.type === filterType);
  }

  if (filterUser && filterUser !== 'all') {
    inputData = inputData.filter((x: IHoldingsModel) => x.userId === filterUser);
  }

  return { dataFiltered: inputData, totals: calculateTotals(inputData) };
}
