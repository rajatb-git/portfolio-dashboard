import * as React from 'react';

import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {
  Alert,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
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

import { fnBytes } from '@/utils/formatNumber';
import { IHoldingsDBModel } from 'db/models/HoldingsDBModel';
import { IUserDBModel } from 'db/models/UserDBModel';

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
  insertHoldingsData: (newData: Array<IHoldingsDBModel>) => void;
  usersData: Array<IUserDBModel>;
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
        <Stack spacing={2} direction="row" sx={{ mb: 3 }}>
          {file?.name && (
            <Stack direction="column">
              <Typography variant="subtitle2">{file?.name}</Typography>
              <Typography variant="caption">{fnBytes(file?.size)}</Typography>
            </Stack>
          )}

          <Button variant="contained" component="label" startIcon={<CloudUploadIcon />}>
            Select file
            <VisuallyHiddenInput type="file" accept=".csv" onChange={(event) => setFile(event.target.files?.[0])} />
          </Button>
        </Stack>

        {/* <DialogContentText sx={{ mb: 1 }}>Accepts a csv file in the following structure</DialogContentText> */}

        <Grid container spacing={2}>
          <Grid item sm={6} xs={12}>
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
          </Grid>
        </Grid>
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
