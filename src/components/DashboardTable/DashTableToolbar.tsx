import { Box, FormControl, InputLabel, Select, Stack } from '@mui/material';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Toolbar from '@mui/material/Toolbar';
import Case from 'case';

import { Iconify } from '@/components/Iconify';
import { HoldingTypesEnum } from '@/lib/enums';
import { IUserDBModel } from 'db/models/UserDBModel';

type TableToolbarProps = {
  filterName: string;
  onFilterName: any;
  filterType: string;
  filterUser: string;
  handleTypeFilterChange: any;
  handleUserFilterChange: any;
  users: Array<IUserDBModel>;
};

export default function TableToolbar({
  filterName,
  onFilterName,
  filterType,
  filterUser,
  handleTypeFilterChange,
  handleUserFilterChange,
  users,
}: TableToolbarProps) {
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

      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="type-filter-select-label">Type</InputLabel>
          <Select labelId="type-filter-select-label" value={filterType} label="Type" onChange={handleTypeFilterChange}>
            {Object.values(HoldingTypesEnum).map((x) => (
              <MenuItem key={x} value={x}>
                {Case.capital(x)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ minWidth: 120 }}>
        <FormControl fullWidth size="small">
          <InputLabel id="user-filter-select-label">User</InputLabel>
          <Select labelId="user-filter-select-label" value={filterUser} label="User" onChange={handleUserFilterChange}>
            {users.map((x) => (
              <MenuItem key={x.id} value={x.id}>
                {x.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    </Toolbar>
  );
}
