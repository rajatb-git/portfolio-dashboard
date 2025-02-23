import * as React from 'react';
import { useDropzone } from 'react-dropzone';

import {
  Alert,
  Box,
  FormControl,
  IconButton,
  InputLabel,
  ListItem,
  ListItemIcon,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import csvtojson from 'csvtojson';

import { OverlayButton } from '@/components/OverlayButton';
import { IHoldings } from '@/models/HoldingsModel';
import { IAccount } from '@/models/AccountsModel';
import { Iconify } from '../Iconify';
import theme from '../ThemeRegistry/theme';
import { fnBytes } from '@/utils/formatNumber';

type AddEditDialogProps = {
  open: boolean;
  handleDialogClose: () => void;
  // eslint-disable-next-line no-unused-vars
  insertHoldingsData: (newData: Array<IHoldings>) => void;
  accountsData: Array<IAccount>;
  refreshPage: () => void;
};

export default function ImportDialog({
  open,
  handleDialogClose,
  accountsData,
  insertHoldingsData,
  refreshPage,
}: AddEditDialogProps) {
  const [file, setFile] = React.useState<File | undefined>();
  const [owner, setOwner] = React.useState('');
  const [type, setType] = React.useState('');
  const [error, setError] = React.useState('');
  const hiddenFileInput = React.useRef<HTMLInputElement>(null);

  const onDrop = React.useCallback((acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'text/csv': ['.csv'],
    },
  });

  const handleUpload = async () => {
    setError('');
    if (!owner) {
      setError('Owner is required!');
      return;
    }
    if (!type) {
      setError('Type is required!');
      return;
    }
    const fileContent = await file?.text();

    csvtojson({ trim: true })
      .fromString(fileContent!)
      .then((resp) => {
        resp.map((x) => {
          x.accountId = owner;
          x.type = type;
        });
        insertHoldingsData(resp);

        handleDialogClose();
        refreshPage();
        reset();
      });
  };

  const reset = () => {
    setFile(undefined);
    setOwner('');
    setError('');
    setType('');

    handleDialogClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
      <Typography sx={{ m: 2 }} variant="h6">
        Upload holdings file
      </Typography>

      <Box sx={{ m: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} variant="filled">
            {error}
          </Alert>
        )}

        {file?.name ? (
          <Box
            sx={{
              border: `1px solid ${theme.palette.grey[700]}`,
              p: 0.5,
              backgroundColor: theme.palette.grey[900],
              borderRadius: '8px',
              color: theme.palette.grey[300],
              ':hover': {
                backgroundColor: theme.palette.grey[900],
              },
              textAlign: 'center',
            }}
          >
            <ListItem
              secondaryAction={
                <IconButton onClick={() => setFile(undefined)}>
                  <Iconify icon="fa:close" />
                </IconButton>
              }
              sx={{ p: 0.5 }}
            >
              <ListItemIcon>
                <Iconify icon="tabler:file-filled" sx={{ height: 32, width: 32, ml: 1 }} />
              </ListItemIcon>

              <Box>
                <Typography variant="body2">{file.name}</Typography>
                <Typography fontSize={theme.typography.pxToRem(10)} fontWeight={600}>
                  {fnBytes(file?.size)}
                </Typography>
              </Box>
            </ListItem>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px dashed ${theme.palette.grey[700]}`,
              p: 2,
              backgroundColor: theme.palette.grey[850],
              borderRadius: '8px',
              color: theme.palette.grey[300],
              cursor: 'pointer',
              ':hover': {
                backgroundColor: theme.palette.grey[900],
              },
              textAlign: 'center',
            }}
            onClick={() => hiddenFileInput.current?.click()}
            {...getRootProps()}
          >
            <input {...getInputProps()} />

            <Iconify icon="fluent-color:document-folder-20" sx={{ height: 72, width: 72 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Drop a file here or click to select from system
            </Typography>

            <Typography variant="caption" sx={{ fontStyle: 'italic' }}>
              symbol, name, qty and averagePrice columns are rquired
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', direction: 'row', gap: '8px', mt: 2 }}>
          <FormControl fullWidth size="small" required>
            <InputLabel id="select-account-label">Associated Account</InputLabel>
            <Select
              labelId="select-account-label"
              value={owner}
              onChange={(ev) => setOwner(ev.target.value)}
              label="Account"
            >
              <MenuItem disabled value="">
                Select Owner
              </MenuItem>

              {accountsData.map((account) => (
                <MenuItem value={account.id} key={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" required>
            <InputLabel id="select-type-label">Type</InputLabel>
            <Select labelId="select-type-label" value={type} onChange={(ev) => setType(ev.target.value)} label="Type">
              <MenuItem disabled value="">
                Select Type
              </MenuItem>

              <MenuItem value="stock">stock</MenuItem>
              <MenuItem value="crypto">crypto</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      <Box sx={{ m: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button color="error" onClick={reset}>
          Cancel
        </Button>

        <OverlayButton
          type="submit"
          variant="contained"
          onClick={handleUpload}
          startIcon={<Iconify icon="line-md:upload" />}
          disabled={!file?.name}
        >
          Upload
        </OverlayButton>
      </Box>
    </Dialog>
  );
}
