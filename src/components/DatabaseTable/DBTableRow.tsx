import { IconButton } from '@mui/material';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';

import { Column } from '@/types';

import { Iconify } from '../Iconify';

type TableRowProps = {
  row: any;
  columnsConfig: Array<Column>;
};

export default function TableRow({ row, columnsConfig }: TableRowProps) {
  return (
    <MuiTableRow hover tabIndex={-1}>
      {columnsConfig.map((x) => (
        <TableCell key={x.id} align={x.align || 'left'}>
          {x.icon && (
            <IconButton sx={{ px: 0 }}>
              <Iconify icon={x.icon} />
            </IconButton>
          )}
          {row[x.id]}
        </TableCell>
      ))}
    </MuiTableRow>
  );
}
