import { IconButton, Stack } from '@mui/material';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';

import { IHoldings } from '@/models/HoldingsModel';

import { Iconify } from '../Iconify';

type TableRowProps = {
  row: IHoldings;
  openEditDialog: () => void;
  // eslint-disable-next-line no-unused-vars
  handleDelete: (recordId: string) => void;
};

export default function TableRow({ row, openEditDialog, handleDelete }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1} sx={{ cursor: 'pointer' }}>
      <TableCell>{row.userId}</TableCell>

      <TableCell>{row.name}</TableCell>

      <TableCell>{row.symbol}</TableCell>

      <TableCell align="right">{row.qty}</TableCell>

      <TableCell align="right">{row.averagePrice}</TableCell>

      <TableCell align="right">{row.targetPrice || '-'}</TableCell>

      <TableCell>{row.type}</TableCell>

      <TableCell sx={{ p: 0 }}>
        <Stack direction="row">
          <IconButton size="small" onClick={openEditDialog}>
            <Iconify icon="fluent:edit-16-filled"></Iconify>
          </IconButton>

          <IconButton size="small" onClick={() => handleDelete(row.id)}>
            <Iconify icon="ic:baseline-delete"></Iconify>
          </IconButton>
        </Stack>
      </TableCell>
    </MuiTableRow>
  );
}
