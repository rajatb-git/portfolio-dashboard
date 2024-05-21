import React from 'react';

import { Button, Stack } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Toolbar from '@mui/material/Toolbar';

import { Iconify } from '@/components/Iconify';
import { useToggle } from '@/utils/useToggle';

import BuySellDialog from '../BuySellDialog';

type TableToolbarProps = {
  filterName: string;
  onFilterName: any;
  refreshData: () => void;
};

export default function DashTableToolbar({ filterName, onFilterName, refreshData }: TableToolbarProps) {
  const { closeToggle, openToggle, toggleState } = useToggle();
  return (
    <Toolbar
      component={Stack}
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: '0px !important',
        px: '8px !important',
      }}
      direction="row"
      spacing={2}
    >
      <OutlinedInput
        fullWidth
        size="small"
        value={filterName}
        onChange={onFilterName}
        placeholder="Search name..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
          </InputAdornment>
        }
        sx={{ fieldset: { border: '0 !important' }, pl: 0 }}
      />

      <Button variant="contained" onClick={refreshData} color="secondary">
        Refresh
      </Button>

      <Button variant="contained" color="primary" onClick={openToggle} sx={{ whiteSpace: 'nowrap' }}>
        Buy / Sell
      </Button>

      <BuySellDialog handleDialogClose={closeToggle} open={toggleState} refreshData={refreshData} />
    </Toolbar>
  );
}
