import { Checkbox, Stack } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/Iconify';

type TableToolbarProps = {
  numSelected: number;
  filterName: string;
  onFilterName: any;
  // eslint-disable-next-line no-unused-vars
  handleUnselectAllClick: (event: any) => void;
};

export default function TableToolbar({
  numSelected,
  filterName,
  onFilterName,
  handleUnselectAllClick,
}: TableToolbarProps) {
  return (
    <Toolbar
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Stack direction="row">
          <Checkbox disableRipple checked={numSelected > 0} onChange={handleUnselectAllClick} />
          <Typography component="div" variant="subtitle1" sx={{ py: '9px' }}>
            {numSelected} selected
          </Typography>
        </Stack>
      ) : (
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
        />
      )}

      {numSelected > 0 && (
        <Tooltip title="Delete">
          <IconButton>
            <Iconify icon="eva:trash-2-fill" />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  );
}
