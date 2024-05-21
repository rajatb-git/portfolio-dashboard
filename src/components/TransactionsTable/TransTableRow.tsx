import { IconButton, Stack, Typography } from '@mui/material';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Case from 'case';
import moment from 'moment';

import { ITransaction } from '@/models/TransactionsModel';

import { Iconify } from '../Iconify';

type TableRowProps = {
  row: ITransaction;
  handleDelete: (recordId: string) => void;
};

export default function TransTableRow({ row, handleDelete }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1} sx={{ cursor: 'pointer' }}>
      <TableCell component="th" scope="row">
        <Stack direction="column" spacing={0}>
          <Typography variant="subtitle2" noWrap>
            {Case.upper(row.action)}
          </Typography>

          <Typography variant="caption" noWrap>
            {row.userId}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell component="th" scope="row">
        <Stack direction="column" spacing={0}>
          <Typography variant="subtitle2" noWrap>
            {row.symbol}
          </Typography>

          <Typography variant="caption" noWrap>
            {row.type}
          </Typography>
        </Stack>
      </TableCell>

      <TableCell align="right">{row.qty}</TableCell>

      <TableCell align="right">{row.price}</TableCell>

      <TableCell>{moment(row.createdAt).format('lll')}</TableCell>

      <TableCell sx={{ p: 0 }}>
        <Stack direction="row">
          <IconButton size="small" onClick={() => handleDelete(row.id)}>
            <Iconify icon="ic:baseline-delete"></Iconify>
          </IconButton>
        </Stack>
      </TableCell>
    </MuiTableRow>
  );
}
