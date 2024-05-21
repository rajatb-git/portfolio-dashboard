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
import Case from 'case';

import { useField } from '@/hooks/useField';
import { HoldingTypesEnum } from '@/lib/enums';
import { IHoldings } from '@/models/HoldingsModel';
import { IUser } from '@/models/UserModel';

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
  editValues?: IHoldings;
  addEdit: 'Add' | 'Edit';
  handleDialogClose: () => void;
  // eslint-disable-next-line no-unused-vars
  insertHoldingsData: (newData: Array<IHoldings>) => void;
  refreshPage: () => void;
  usersData: Array<IUser>;
};

export default function AddEditDialog({
  open,
  addEdit,
  handleDialogClose,
  editValues,
  insertHoldingsData,
  refreshPage,
  usersData,
}: AddEditDialogProps) {
  const formFields = {
    name: useField({
      initValue: editValues?.name || '',
      validate: (value: string) => value.length <= 3 && 'Name has to be longer than 3 characters',
      required: true,
    }),
    symbol: useField({
      initValue: editValues?.symbol || '',
      validate: () => '',
      required: true,
    }),
    userId: useField({
      initValue: editValues?.userId || '',
      validate: () => '',
      required: true,
    }),
    type: useField({
      initValue: editValues?.type || '',
      validate: () => '',
      required: true,
    }),
    qty: useField({
      initValue: editValues?.qty?.toString() || '',
      validate: () => '',
      required: true,
    }),
    averagePrice: useField({
      initValue: editValues?.averagePrice?.toString() || '',
      validate: () => '',
      required: true,
    }),
    targetPrice: useField({
      initValue: editValues?.targetPrice?.toString() || '',
      validate: () => '',
      required: false,
    }),
  };

  const handleSave = () => {
    Object.values(formFields).map((x) => x.isValid());

    const record: any = {};
    for (const holding in formFields) {
      record[holding] = (formFields as any)[holding].value;
    }

    insertHoldingsData([record]);

    handleDialogClose();
    resetDialog();
    refreshPage();
  };

  const resetDialog = () => {
    Object.values(formFields).map((x) => x.resetValue());
  };

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md" fullScreen>
      <AppBar sx={{ position: 'relative' }}>
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'inline-flex' }}>
            <IconButton sx={{ mr: 1 }} onClick={handleDialogClose} aria-label="close">
              <Icon icon="memory:close-outline" />
            </IconButton>

            <DialogTitle sx={{ pl: 0 }}>{addEdit} Holding</DialogTitle>
          </Box>

          <Box component={DialogActions} sx={{ mt: 2 }}>
            <Button type="submit" variant="contained" onClick={handleSave}>
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

              <Select
                value={formFields.type.value}
                displayEmpty
                size="small"
                onChange={formFields.type.onChange}
                error={!!formFields.type.error}
              >
                <MenuItem disabled value="">
                  Type of asset
                </MenuItem>

                {Object.values(HoldingTypesEnum).map((x) => (
                  <MenuItem key={x} value={x}>
                    {Case.capital(x)}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>User</FormLabel>

              <Select
                value={formFields.userId.value}
                displayEmpty
                size="small"
                onChange={formFields.userId.onChange}
                error={!!formFields.userId.error}
              >
                <MenuItem disabled value="">
                  Owner
                </MenuItem>
                {usersData.map((user) => (
                  <MenuItem value={user.id} key={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Name</FormLabel>
              <TextField
                color="primary"
                placeholder="Name of the asset"
                id="name"
                name="name"
                fullWidth
                variant="outlined"
                size="small"
                value={formFields.name.value}
                onChange={formFields.name.onChange}
                error={!!formFields.name.error}
                helperText={formFields.name.error}
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Symbol</FormLabel>
              <TextField
                placeholder="Exact symbol of asset"
                id="symbol"
                name="symbol"
                fullWidth
                variant="outlined"
                size="small"
                value={formFields.symbol.value}
                onChange={formFields.symbol.onChange}
                error={!!formFields.symbol.error}
                helperText={formFields.symbol.error}
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Quantity</FormLabel>
              <TextField
                placeholder="Number of assets"
                id="qty"
                name="qty"
                fullWidth
                variant="outlined"
                size="small"
                value={formFields.qty.value}
                onChange={formFields.qty.onChange}
                error={!!formFields.qty.error}
                helperText={formFields.qty.error}
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Purchase Price</FormLabel>
              <TextField
                placeholder="Price of purchase"
                id="price"
                name="price"
                fullWidth
                variant="outlined"
                size="small"
                value={formFields.averagePrice.value}
                onChange={formFields.averagePrice.onChange}
                error={!!formFields.averagePrice.error}
                helperText={formFields.averagePrice.error}
              />
            </Stack>
          </Grid>

          <Grid item sm={3} xs={4}>
            <Stack direction="column" spacing={0.5}>
              <FormLabel>Target Price</FormLabel>
              <TextField
                placeholder="Price to watch for"
                id="targetPrice"
                name="targetPrice"
                fullWidth
                variant="outlined"
                size="small"
                value={formFields.targetPrice.value}
                onChange={formFields.targetPrice.onChange}
                error={!!formFields.targetPrice.error}
                helperText={formFields.targetPrice.error}
              />
            </Stack>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
