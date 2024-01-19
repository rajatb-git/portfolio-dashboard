import * as React from 'react';

import { Icon } from '@iconify/react';
import { DialogTitle, Stack } from '@mui/material';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import { default as MuiSelect } from '@mui/material/Select';
import { styled, Theme } from '@mui/material/styles';
import { default as MuiTextField } from '@mui/material/TextField';
import Toolbar from '@mui/material/Toolbar';

import { IHoldingsDBModel } from 'db/models/HoldingsDBModel';

// const fields = [
//   { id: 'id', label: 'id' },
//   { id: 'userId', label: 'userId' },
//   { id: 'name', label: 'name' },
//   { id: 'symbol', label: 'symbol' },
//   { id: 'qty', label: 'qty' },
//   { id: 'averagePrice', label: 'averagePrice' },
//   { id: 'targetPrice', label: 'targetPrice' },
// ];

const Select = styled(MuiSelect)(({ theme }: { theme: Theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : '#1A2027',
  },
}));

const TextField = styled(MuiTextField)(({ theme }: { theme: Theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : '#1A2027',
  },
}));

const FormLabel = styled('div')(({ theme }: { theme: Theme }) => ({
  ...theme.typography.button,
}));

type AddEditDialogProps = {
  open: boolean;
  editValues?: IHoldingsDBModel;
  addEdit: 'Add' | 'Edit';
  handleDialogClose: () => void;
};

export default function AddEditDialog({ open, addEdit, handleDialogClose, editValues }: AddEditDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={handleDialogClose}
      maxWidth="md"
      fullScreen
      PaperProps={{
        component: 'form',
        onSubmit: (event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          const formJson = Object.fromEntries((formData as any).entries());
          const email = formJson.email;
          console.log(email);
          handleDialogClose();
        },
      }}
    >
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'inline-flex' }}>
            <IconButton sx={{ mr: 1 }} onClick={handleDialogClose} aria-label="close">
              <Icon icon="memory:close-outline" />
            </IconButton>

            <DialogTitle sx={{ pl: 0 }}>{addEdit} Holding</DialogTitle>
          </Box>

          <Box component={DialogActions} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <DialogContent>
        <Grid container spacing={2}>
          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Type</FormLabel>

              <Select value="" displayEmpty size="small">
                <MenuItem disabled value="">
                  Type of asset
                </MenuItem>
                <MenuItem value="stock">Stock</MenuItem>
                <MenuItem value="crypto">Crypto</MenuItem>
              </Select>
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>User</FormLabel>

              <Select displayEmpty value="" size="small">
                <MenuItem disabled value="">
                  Owner
                </MenuItem>
                <MenuItem value="RB">RB</MenuItem>
                <MenuItem value="Kimi">Kimi</MenuItem>
              </Select>
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Name</FormLabel>
              <TextField
                color="primary"
                autoFocus
                required
                placeholder="Name of the asset"
                id="name"
                name="name"
                fullWidth
                variant="outlined"
                size="small"
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Symbol</FormLabel>
              <TextField
                autoFocus
                required
                placeholder="Exact symbol of asset"
                id="symbol"
                name="symbol"
                fullWidth
                variant="outlined"
                size="small"
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Quantity</FormLabel>
              <TextField
                autoFocus
                required
                placeholder="Number of assets"
                id="qty"
                name="qty"
                fullWidth
                variant="outlined"
                size="small"
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Purchase Price</FormLabel>
              <TextField
                autoFocus
                required
                placeholder="Price of purchase"
                id="price"
                name="price"
                fullWidth
                variant="outlined"
                size="small"
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Target Price</FormLabel>
              <TextField
                autoFocus
                required
                placeholder="Price to watch for"
                id="targetPrice"
                name="targetPrice"
                fullWidth
                variant="outlined"
                size="small"
              />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
