import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import OutlinedInput from '@mui/material/OutlinedInput';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';

import { Iconify } from '@/components/Iconify';

type TableToolbarProps = {
  filterName: string;
  onFilterName: any;
  openNewDialog: () => void;
  openImportDialog: () => void;
};

export default function TableToolbar({ filterName, onFilterName, openNewDialog, openImportDialog }: TableToolbarProps) {
  return (
    <Toolbar
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        py: '0px !important',
        px: '8px !important',
      }}
    >
      <OutlinedInput
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

      <Stack direction="row" spacing={2}>
        <Button
          variant="contained"
          size="small"
          onClick={openImportDialog}
          component="label"
          startIcon={<CloudUploadIcon />}
        >
          Import file
        </Button>

        <Button variant="contained" size="small" onClick={openNewDialog}>
          + Add New
        </Button>
      </Stack>
    </Toolbar>
  );
}
