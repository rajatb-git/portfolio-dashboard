import * as React from 'react';

import { Button, Stack, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import { default as MuiSelect } from '@mui/material/Select';
import { styled, Theme, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { default as MuiTextField } from '@mui/material/TextField';
import Case from 'case';
import { toast } from 'react-toastify';

import apis from '@/api';
import { useField } from '@/hooks/useField';
import { HoldingTypesEnum } from '@/lib/enums';
import { IHoldings } from '@/models/HoldingsModel';
import { IAccount } from '@/models/AccountsModel';
import { Iconify } from './Iconify';
import { OverlayButton } from './OverlayButton';

const Select = styled(MuiSelect)(({ theme }: { theme: Theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : theme.palette.background.default,
  },
}));

const TextField = styled(MuiTextField)(({ theme }: { theme: Theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : theme.palette.background.default,
  },
}));

type Props = {
  open: boolean;
  initialValues?: Pick<IHoldings, 'name' | 'symbol' | 'accountId' | 'type' | 'qty' | 'averagePrice'>;
  handleDialogClose: () => void;
  refreshData: () => void;
  accounts: Array<IAccount>;
};

export default function BuySellDialog({ open, handleDialogClose, initialValues, refreshData, accounts }: Props) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));
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
      validate: (value: string) => value.length < 2 && 'Symbol has to be minimum 2 characters long',
      required: true,
    }),
    accountId: useField({
      initValue: initialValues?.accountId || '',
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
  };

  const isFormValid = () => (Object.values(formFields).find((x) => x.isValid() === false) === undefined ? true : false);

  const handleSubmit = async () => {
    try {
      if (isFormValid()) {
        setIsLoading(true);
        if (formFields.buySell.value === 'sell') {
          await apis.holdings.sellHolding({
            accountId: formFields.accountId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value,
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            type: formFields.type.value,
          } as any);

          toast('Sold!', {
            autoClose: 5000,
            pauseOnHover: true,
            type: 'success',
          });

          closeAndResetDialog();
          refreshData();
        } else if (formFields.buySell.value === 'buy') {
          await apis.holdings.buyHolding({
            accountId: formFields.accountId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value,
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            type: formFields.type.value,
          } as any);

          toast('Bought!', {
            autoClose: 5000,
            pauseOnHover: true,
            type: 'success',
          });

          closeAndResetDialog();
          refreshData();
        }
      }
    } catch (err: any) {
      toast(`${err.response.status} - ${err.response.data}`, {
        autoClose: 5000,
        pauseOnHover: true,
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const closeAndResetDialog = () => {
    handleDialogClose();
    Object.values(formFields).map((x) => x.resetValue());
  };

  return (
    <Dialog open={open} maxWidth="md" fullScreen={fullScreen} onClose={handleDialogClose}>
      <Typography sx={{ m: 2 }} variant="h6">
        Buy / Sell
      </Typography>

      <Box sx={{ m: 2, mt: 0 }}>
        <Box sx={{ display: 'flex', gap: '16px', direction: 'row', mt: '16px', flexWrap: 'wrap' }}>
          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            {/* <FormLabel>Buy / Sell</FormLabel> */}
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
            {/* <FormLabel>Type</FormLabel> */}
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
            {/* <FormLabel>Associated Account</FormLabel> */}
            <Select
              value={formFields.accountId.value}
              displayEmpty
              onChange={formFields.accountId.onChange}
              error={!!formFields.accountId.error}
              size="small"
              disabled={isLoading}
            >
              <MenuItem disabled value="">
                Owner
              </MenuItem>
              {accounts.map((account) => (
                <MenuItem value={account.id} key={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </Select>
          </Stack>

          {formFields.buySell.value === 'buy' && (
            <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
              {/* <FormLabel>Name</FormLabel> */}
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
            {/* <FormLabel>Symbol</FormLabel> */}
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
            {/* <FormLabel>Quantity</FormLabel> */}
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
            {/* <FormLabel>Price</FormLabel> */}
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

        </Box>
      </Box>

      <Box sx={{ m: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={closeAndResetDialog} color="error">
          Cancel
        </Button>

        <OverlayButton
          type="submit"
          variant="contained"
          onClick={handleSubmit}
          disabled={isLoading}
          startIcon={<Iconify icon="lets-icons:send-duotone" />}
        >
          Submit
        </OverlayButton>
      </Box>
    </Dialog>
  );
}
