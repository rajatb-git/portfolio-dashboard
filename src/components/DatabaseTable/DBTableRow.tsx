import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';

import { IHoldings } from '@/models/HoldingsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { IUser } from '@/models/UserModel';
import { Column } from '@/types';

type TableRowProps = {
  row: any;
  columnsConfig: Array<Column>;
};

export default function TableRow({ row, columnsConfig }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1} sx={{ cursor: 'pointer' }}>
      {columnsConfig.map((x) => (
        <TableCell key={x.id} align={x.align || 'left'}>
          {row[x.id]}
        </TableCell>
      ))}

      {/* <TableCell>{row.userId}</TableCell>

      <TableCell>{row.name}</TableCell>

      <TableCell>{row.symbol}</TableCell>

      <TableCell align="right">{row.qty}</TableCell>

      <TableCell align="right">{row.averagePrice}</TableCell>

      <TableCell align="right">{row.targetPrice || '-'}</TableCell>

      <TableCell>{row.type}</TableCell> */}
    </MuiTableRow>
  );
}
