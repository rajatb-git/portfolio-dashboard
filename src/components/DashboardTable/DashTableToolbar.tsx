import React from 'react';

import { Button, IconButton, Stack } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Toolbar from '@mui/material/Toolbar';

import { Iconify } from '@/components/Iconify';
import { IAccount } from '@/models/AccountsModel';
import { useToggle } from '@/utils/useToggle';

import BuySellDialog from '../BuySellDialog';

type TableToolbarProps = {
  filterName: string;
  onFilterName: any;
  refreshData: () => void;
  accounts: Array<IAccount>;
};

export default function DashTableToolbar({ filterName, onFilterName, refreshData, accounts }: TableToolbarProps) {
  const { closeToggle, openToggle, toggleState } = useToggle();
  return (
    <Toolbar
      component={Stack}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: '0px !important',
        px: '8px !important',
        minHeight: '48px !important',
      }}
      direction="row"
      spacing={2}
    >
      <OutlinedInput
        fullWidth
        size="small"
        value={filterName}
        onChange={onFilterName}
        placeholder="Filter holdings..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', width: 16, height: 16 }} />
          </InputAdornment>
        }
        sx={{
          fieldset: { border: '0 !important' },
          pl: 0,
          '& input': { fontSize: '0.875rem' },
        }}
      />

      <Button
        size="small"
        variant="outlined"
        onClick={openToggle}
        sx={{ whiteSpace: 'nowrap', borderColor: 'rgba(255,255,255,0.12)', color: 'text.secondary' }}
        startIcon={<Iconify icon="fa6-solid:right-left" width={13} />}
      >
        Trade
      </Button>

      <IconButton onClick={refreshData} size="small" sx={{ color: 'text.secondary' }}>
        <Iconify icon="mingcute:refresh-3-fill" width={18} />
      </IconButton>

      <BuySellDialog handleDialogClose={closeToggle} open={toggleState} refreshData={refreshData} accounts={accounts} />
    </Toolbar>
  );
}
