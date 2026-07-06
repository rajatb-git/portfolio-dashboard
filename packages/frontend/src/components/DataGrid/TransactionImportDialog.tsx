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
import { useTheme } from '@mui/material/styles';
import csvtojson from 'csvtojson';

import { OverlayButton } from '@/components/OverlayButton';
import { IAccount } from '@/models/AccountsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { fnBytes } from '@/utils/formatNumber';
import { Iconify } from '../Iconify';

type TransactionImportDialogProps = {
  open: boolean;
  handleDialogClose: () => void;
  // eslint-disable-next-line no-unused-vars
  importTransactions: (rows: Array<Partial<ITransaction>>) => Promise<void>;
  accountsData: Array<IAccount>;
  refreshPage: () => void;
};

export default function TransactionImportDialog({
  open,
  handleDialogClose,
  accountsData,
  importTransactions,
  refreshPage,
}: TransactionImportDialogProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [file, setFile] = React.useState<File | undefined>();
  const [owner, setOwner] = React.useState('');
  const [defaultType, setDefaultType] = React.useState('stock');
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

  const reset = () => {
    setFile(undefined);
    setOwner('');
    setDefaultType('stock');
    setError('');
    handleDialogClose();
  };

  const handleUpload = async () => {
    setError('');
    if (!owner) {
      setError('Account is required!');
      return;
    }
    const fileContent = await file?.text();
    if (!fileContent) {
      setError('Could not read the selected file.');
      return;
    }

    const parsed = await csvtojson({ trim: true }).fromString(fileContent);
    const rows: Array<Partial<ITransaction>> = parsed.map((x) => ({
      ...x,
      accountId: owner,
      type: x.type?.trim() ? x.type.trim().toLowerCase() : defaultType,
    }));

    await importTransactions(rows);
    refreshPage();
    reset();
  };

  const dropzoneBg = isLight ? theme.palette.grey[100] : theme.palette.grey[900];
  const dropzoneBorder = isLight ? theme.palette.grey[400] : theme.palette.grey[700];
  const dropzoneText = isLight ? theme.palette.grey[700] : theme.palette.grey[300];

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
      <Typography sx={{ m: 2 }} variant="h6">
        Import transactions
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
              border: `1px solid ${dropzoneBorder}`,
              p: 0.5,
              backgroundColor: dropzoneBg,
              borderRadius: '8px',
              color: dropzoneText,
              ':hover': {
                backgroundColor: dropzoneBg,
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
                <Typography sx={{ fontSize: theme.typography.pxToRem(10), fontWeight: 600 }}>
                  {fnBytes(file?.size)}
                </Typography>
              </Box>
            </ListItem>
          </Box>
        ) : (
          <Box
            sx={{
              border: `1px dashed ${dropzoneBorder}`,
              p: 2,
              backgroundColor: dropzoneBg,
              borderRadius: '8px',
              color: dropzoneText,
              cursor: 'pointer',
              ':hover': {
                backgroundColor: dropzoneBg,
              },
              textAlign: 'center',
            }}
            onClick={() => hiddenFileInput.current?.click()}
            {...(() => {
              const { ref, ...rootProps } = getRootProps();
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { style, ...rest } = rootProps;
              return rest;
            })()}
          >
            <input
              {...(() => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { style, ...inputProps } = getInputProps();
                return inputProps;
              })()}
            />

            <Iconify icon="fluent-color:document-folder-20" sx={{ height: 72, width: 72 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Drop a file here or click to select from system
            </Typography>

            <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block' }}>
              Required columns: qty, action (buy / sell / deposit / withdraw)
            </Typography>
            <Typography variant="caption" sx={{ fontStyle: 'italic', display: 'block' }}>
              Optional: symbol, price, type, date, pnl
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
              label="Associated Account"
            >
              <MenuItem disabled value="">
                Select Account
              </MenuItem>

              {accountsData.map((account) => (
                <MenuItem value={account.id} key={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
            <InputLabel id="select-default-type-label">Default Type</InputLabel>
            <Select
              labelId="select-default-type-label"
              value={defaultType}
              onChange={(ev) => setDefaultType(ev.target.value)}
              label="Default Type"
            >
              <MenuItem value="stock">stock</MenuItem>
              <MenuItem value="crypto">crypto</MenuItem>
              <MenuItem value="cash">cash</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Typography variant="caption" sx={{ color: dropzoneText, mt: 1, display: 'block' }}>
          Default Type applies only to rows whose CSV "type" column is empty. Importing records the transaction log only
          — it does not change your holdings.
        </Typography>
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
          Import
        </OverlayButton>
      </Box>
    </Dialog>
  );
}
