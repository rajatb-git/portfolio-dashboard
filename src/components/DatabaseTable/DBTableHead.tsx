import Box from '@mui/material/Box';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableHead } from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';

import { Column } from '@/types';

import { visuallyHidden } from './dbTableUtils';
import theme from '../ThemeRegistry/theme';

type TableHeadProps = {
  order: 'asc' | 'desc';
  orderBy: string;
  rowCount: number;
  columnsConfig: Array<Column>;
  onRequestSort: any;
};

export default function TableHead({ order, orderBy, columnsConfig, onRequestSort }: TableHeadProps) {
  const onSort = (property: any) => (event: any) => {
    onRequestSort(event, property);
  };

  return (
    <MuiTableHead sx={{ backgroundColor: theme.palette.background.neutral }}>
      <TableRow>
        {columnsConfig.map((x) => (
          <TableCell
            key={x.id}
            align={x.align || 'left'}
            sortDirection={orderBy === x.id ? order : false}
            sx={{
              width: x.width,
              minWidth: x.minWidth,
            }}
          >
            <TableSortLabel
              hideSortIcon
              active={orderBy === x.id}
              direction={orderBy === x.id ? order : 'asc'}
              onClick={onSort(x.id)}
            >
              {x.label}
              {orderBy === x.id ? (
                <Box sx={{ ...visuallyHidden }}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </MuiTableHead>
  );
}
