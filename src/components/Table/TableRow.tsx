import { useState } from 'react';

import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Stack from '@mui/material/Stack';
import TableCell from '@mui/material/TableCell';
import { default as MuiTableRow } from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import moment from 'moment';

import { Iconify } from '@/components/Iconify';
import Label from '@/components/Label';
import { fnCurrency } from '@/utils/formatNumber';
import { IHoldingsModel } from 'db/models/HoldingsModel';

type TableRowProps = {
  row: IHoldingsModel;
  handleClick: any;
  selected: any;
};

export default function TableRow({ selected, row, handleClick }: TableRowProps) {
  const [open, setOpen] = useState(null);

  const handleOpenMenu = (event: any) => {
    setOpen(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setOpen(null);
  };

  return (
    <>
      <MuiTableRow hover tabIndex={-1} role="checkbox" selected={selected}>
        <TableCell padding="checkbox">
          <Checkbox disableRipple checked={selected} onChange={handleClick} />
        </TableCell>

        <TableCell component="th" scope="row">
          <Stack direction="column" spacing={0}>
            <Typography variant="subtitle2" noWrap>
              {row.symbol}
            </Typography>

            <Typography variant="caption" noWrap>
              {row.name}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell align="right">{row.qty}</TableCell>

        <TableCell align="right">
          <Stack direction="column" spacing={0} alignItems="flex-end">
            {row.currentPrice}

            <Typography variant="caption" noWrap sx={{ fontSize: '11px' }}>
              {row.dayHigh?.toFixed(2)} - {row.dayLow?.toFixed(2)}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell align="right">
          <Stack direction="column" spacing={0} alignItems="flex-end">
            <Label
              color={row.percentChange === 0 ? 'default' : row.percentChange! > 0 ? 'success' : 'error'}
              sx={{ fontSize: '13px' }}
            >
              {row.percentChange?.toFixed(2)}%
            </Label>

            <Typography variant="caption" noWrap>
              {moment(row.priceDate as string).format('MMM DD, hh:mma')}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell align="right">
          <Stack direction="column" spacing={0} alignItems="flex-end">
            <Label
              color={row.totalGLPercent === 0 ? 'default' : row.totalGLPercent! > 0 ? 'success' : 'error'}
              sx={{ fontSize: '13px' }}
            >
              {(row.totalGLPercent || 0) > 0 && '+'}
              {row.totalGLPercent?.toFixed(2)}%
            </Label>

            <Typography variant="caption" noWrap sx={{ fontWeight: 700 }}>
              {fnCurrency(row.totalGL)}
            </Typography>
          </Stack>
        </TableCell>

        <TableCell align="right">
          <IconButton onClick={handleOpenMenu}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </TableCell>
      </MuiTableRow>

      <Popover
        open={!!open}
        anchorEl={open}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{
          sx: { width: 140 },
        }}
      >
        <MenuItem onClick={handleCloseMenu}>
          <Iconify icon="eva:edit-fill" sx={{ mr: 2 }} />
          Edit
        </MenuItem>
      </Popover>
    </>
  );
}
