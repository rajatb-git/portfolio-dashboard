import * as React from 'react';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Alert,
  Box,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { styled } from '@mui/material/styles';
import csvtojson from 'csvtojson';

import { IHoldings } from '@/models/HoldingsModel';
import { IUser } from '@/models/UserModel';
import { fnBytes } from '@/utils/formatNumber';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

type AddEditDialogProps = {
  open: boolean;
  handleDialogClose: () => void;
  // eslint-disable-next-line no-unused-vars
  insertHoldingsData: (newData: Array<IHoldings>) => void;
  usersData: Array<IUser>;
  refreshPage: () => void;
};

export default function ImportDialog({
  open,
  handleDialogClose,
  usersData,
  insertHoldingsData,
  refreshPage,
}: AddEditDialogProps) {
  const [file, setFile] = React.useState<File | undefined>();
  const [owner, setOwner] = React.useState('');
  const [type, setType] = React.useState('');
  const [error, setError] = React.useState('');

  const handleUpload = async () => {
    setError('');
    if (!owner) {
      setError('Owner is required!');
      return;
    }
    const fileContent = await file?.text();

    csvtojson({ trim: true })
      .fromString(fileContent!)
      .then((resp) => {
        resp.map((x) => {
          x.userId = owner;
          x.type = type;
        });
        console.log(resp);
        insertHoldingsData(resp);

        handleDialogClose();
        refreshPage();
      });
  };

  const reset = () => {
    setFile(undefined);
    setOwner('');
    setError('');

    handleDialogClose();
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} fullWidth maxWidth="sm">
      <DialogTitle>Upload holdings file</DialogTitle>

      <Divider />

      <DialogContent>
        {error && (
          <Alert variant="filled" color="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <DialogContentText sx={{ mb: 2 }}>
          Following columns are required: symbol, name, qty, averagePrice
        </DialogContentText>
        <Stack spacing={2} direction="row" sx={{ mb: 2 }}>
          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />}>
            Select file
            <VisuallyHiddenInput type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0])} />
          </Button>

          {file?.name && (
            <Stack direction="column">
              <Typography variant="subtitle2">{file?.name}</Typography>
              <Typography variant="caption">{fnBytes(file?.size)}</Typography>
            </Stack>
          )}
        </Stack>

        <Box sx={{ display: 'flex', direction: 'row', gap: '8px' }}>
          <FormControl fullWidth size="small">
            <InputLabel id="select-user-label">Owner</InputLabel>
            <Select
              labelId="select-user-label"
              value={owner}
              onChange={(ev) => setOwner(ev.target.value)}
              label="Owner"
            >
              <MenuItem disabled value="">
                Select Owner
              </MenuItem>

              {usersData.map((user) => (
                <MenuItem value={user.id} key={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small">
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
      </DialogContent>

      <Divider />

      <DialogActions>
        <Button variant="text" color="error" onClick={reset}>
          Cancel
        </Button>

        <Button variant="contained" onClick={handleUpload}>
          Upload
        </Button>
      </DialogActions>
    </Dialog>
  );
}
