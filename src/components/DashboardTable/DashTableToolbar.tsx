import { Stack } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Toolbar from '@mui/material/Toolbar';

import { Iconify } from '@/components/Iconify';

type TableToolbarProps = {
  filterName: string;
  onFilterName: any;
};

export default function TableToolbar({ filterName, onFilterName }: TableToolbarProps) {
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
      spacing={3}
    >
      <OutlinedInput
        fullWidth
        size="small"
        value={filterName}
        onChange={onFilterName}
        placeholder="Search name..."
        startAdornment={
          <InputAdornment position="start">
            <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', width: 20, height: 20 }} />
          </InputAdornment>
        }
        sx={{ fieldset: { border: '0 !important' }, pl: 0 }}
      />
    </Toolbar>
  );
}