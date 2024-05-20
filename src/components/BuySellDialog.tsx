import * as React from 'react';

import { LoadingButton } from '@mui/lab';
import { DialogTitle, Stack } from '@mui/material';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import MenuItem from '@mui/material/MenuItem';
import { default as MuiSelect } from '@mui/material/Select';
import { styled, Theme } from '@mui/material/styles';
import { default as MuiTextField } from '@mui/material/TextField';
import Case from 'case';
import { enqueueSnackbar } from 'notistack';

import apis from '@/api';
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

type BuySellDialogProps = {
  open: boolean;
  initialValues?: IHoldings;
  handleDialogClose: () => void;
};

export default function BuySellDialog({ open, handleDialogClose, initialValues }: BuySellDialogProps) {
  const [users, setUsers] = React.useState<Array<IUser>>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const formFields = {
    buySell: useField({
      initValue: '',
      validate: () => '',
      required: true,
    }),
    name: useField({
      initValue: initialValues?.name || '',
      validate: () => '',
      required: false,
    }),
    symbol: useField({
      initValue: initialValues?.symbol || '',
      validate: (value: string) => value.length < 3 && 'Symbol has to be minimum 3 characters long',
      required: true,
    }),
    userId: useField({
      initValue: initialValues?.userId || '',
      validate: () => '',
      required: true,
    }),
    type: useField({
      initValue: initialValues?.type || '',
      validate: () => '',
      required: true,
    }),
    qty: useField({
      initValue: initialValues?.qty?.toString() || '',
      validate: () => '',
      required: true,
    }),
    averagePrice: useField({
      initValue: initialValues?.averagePrice?.toString() || '',
      validate: () => '',
      required: true,
    }),
    targetPrice: useField({
      initValue: initialValues?.targetPrice?.toString() || '',
      validate: () => '',
      required: false,
    }),
  };

  const loadUsers = async () => {
    return apis.user
      .getAllUsers()
      .then((response) => {
        setUsers(response);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      });
  };

  const isFormValid = () => (Object.values(formFields).find((x) => x.isValid() === false) === undefined ? true : false);

  const handleSubmit = async () => {
    try {
      if (isFormValid()) {
        setIsLoading(true);
        if (formFields.buySell.value === 'sell') {
          await apis.holdings.sellHolding({
            userId: formFields.userId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value,
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            targetPrice: parseFloat(formFields.targetPrice.value),
            type: formFields.type.value,
          } as any);

          enqueueSnackbar('Sold', { variant: 'success' });
        } else if (formFields.buySell.value === 'buy') {
          await apis.holdings.buyHolding({
            userId: formFields.userId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value,
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            targetPrice: parseFloat(formFields.targetPrice.value),
            type: formFields.type.value,
          } as any);

          enqueueSnackbar('Bought', { variant: 'success' });
        }
      }
    } catch (err: any) {
      enqueueSnackbar({ variant: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const resetDialog = () => {
    Object.values(formFields).map((x) => x.resetValue());
  };

  React.useEffect(() => {
    loadUsers();
  }, []);

  return (
    <Dialog open={open} onClose={handleDialogClose} maxWidth="md">
      <DialogTitle>Buy / Sell</DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', gap: '16px', direction: 'row', mt: '16px', flexWrap: 'wrap' }}>
          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>Buy / Sell</FormLabel>
            <Select
              value={formFields.buySell.value}
              displayEmpty
              onChange={formFields.buySell.onChange}
              error={!!formFields.buySell.error}
              size="small"
              disabled={isLoading}
            >
              <MenuItem disabled value="">
                Buy / Sell
              </MenuItem>

              {['buy', 'sell'].map((x) => (
                <MenuItem key={x} value={x}>
                  {Case.capital(x)}
                </MenuItem>
              ))}
            </Select>
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>Type</FormLabel>
            <Select
              value={formFields.type.value}
              displayEmpty
              onChange={formFields.type.onChange}
              error={!!formFields.type.error}
              size="small"
              disabled={isLoading}
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

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>User</FormLabel>
            <Select
              value={formFields.userId.value}
              displayEmpty
              onChange={formFields.userId.onChange}
              error={!!formFields.userId.error}
              size="small"
              disabled={isLoading}
            >
              <MenuItem disabled value="">
                Owner
              </MenuItem>
              {users.map((user) => (
                <MenuItem value={user.id} key={user.id}>
                  {user.name}
                </MenuItem>
              ))}
            </Select>
          </Stack>

          {formFields.buySell.value === 'buy' && (
            <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
              <FormLabel>Name</FormLabel>
              <TextField
                color="primary"
                placeholder="Name"
                id="name"
                name="name"
                variant="outlined"
                value={formFields.name.value}
                onChange={formFields.name.onChange}
                error={!!formFields.name.error}
                helperText={formFields.name.error}
                size="small"
                disabled={isLoading}
              />
            </Stack>
          )}

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>Symbol</FormLabel>
            <TextField
              placeholder="Symbol"
              id="symbol"
              name="symbol"
              variant="outlined"
              value={formFields.symbol.value}
              onChange={formFields.symbol.onChange}
              error={!!formFields.symbol.error}
              helperText={formFields.symbol.error}
              size="small"
              disabled={isLoading}
            />
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>Quantity</FormLabel>
            <TextField
              placeholder="Quantity"
              id="qty"
              name="qty"
              variant="outlined"
              value={formFields.qty.value}
              onChange={formFields.qty.onChange}
              error={!!formFields.qty.error}
              helperText={formFields.qty.error}
              size="small"
              disabled={isLoading}
            />
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <FormLabel>Purchase Price</FormLabel>
            <TextField
              placeholder="Average Price"
              id="averagePrice"
              name="averagePrice"
              variant="outlined"
              value={formFields.averagePrice.value}
              onChange={formFields.averagePrice.onChange}
              error={!!formFields.averagePrice.error}
              helperText={formFields.averagePrice.error}
              size="small"
              disabled={isLoading}
            />
          </Stack>

          {formFields.buySell.value === 'buy' && (
            <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
              <FormLabel>Target Price</FormLabel>
              <TextField
                placeholder="Price to watch for"
                id="targetPrice"
                name="targetPrice"
                variant="outlined"
                value={formFields.targetPrice.value}
                onChange={formFields.targetPrice.onChange}
                error={!!formFields.targetPrice.error}
                helperText={formFields.targetPrice.error}
                size="small"
                disabled={isLoading}
              />
            </Stack>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ padding: '16px 24px' }}>
        <LoadingButton type="submit" variant="contained" onClick={handleSubmit} loading={isLoading}>
          Submit
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
