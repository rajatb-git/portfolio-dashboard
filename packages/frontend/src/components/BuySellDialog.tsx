import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import { styled, Theme, useTheme } from '@mui/material/styles';
import { default as MuiTextField } from '@mui/material/TextField';
import useMediaQuery from '@mui/material/useMediaQuery';
import Case from 'case';
import debounce from 'lodash/debounce';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { LOT_METHOD_LABELS, type LotMethod, type SimulationRequest, type TradeSimulation } from '@/api/holdings';
import { useField } from '@/hooks/useField';
import { HoldingTypesEnum } from '@/lib/enums';
import { IAccount } from '@/models/AccountsModel';
import { IHoldings } from '@/models/HoldingsModel';
import { fnCurrency } from '@/utils/formatNumber';
import { Iconify } from './Iconify';
import { OverlayButton } from './OverlayButton';

const TextField = styled(MuiTextField)(({ theme }: { theme: Theme }) => ({
  '& .MuiInputBase-input': {
    borderRadius: 4,
    position: 'relative',
    backgroundColor: theme.palette.mode === 'light' ? '#F3F6F9' : theme.palette.background.default,
  },
}));

const today = () => moment().format('YYYY-MM-DD');
const NUMERIC = /^\d*\.?\d+$/;
const SELL_LOT_METHODS: LotMethod[] = ['fifo', 'lifo', 'hifo', 'taxOptimal'];
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fnCurrency(v)}`;

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
  const [lotMethod, setLotMethod] = React.useState<LotMethod>('fifo');
  const [preview, setPreview] = React.useState<TradeSimulation | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const previewSeq = React.useRef(0);
  const [holdings, setHoldings] = React.useState<IHoldings[]>([]);
  const [overdraft, setOverdraft] = React.useState<{ account: IAccount; after: number } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    apis.holdings
      .getAll()
      .then((res) => setHoldings(res ?? []))
      .catch((err) => toast.error(err.message || 'Failed to load holdings'));
  }, [open]);

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
      validate: (value: string) =>
        (!NUMERIC.test(value.trim()) || Number(value) <= 0) && 'Quantity must be a positive number',
      required: true,
    }),
    averagePrice: useField({
      initValue: initialValues?.averagePrice?.toString() || '',
      validate: (value: string) =>
        (!NUMERIC.test(value.trim()) || Number(value) <= 0) && 'Price must be a positive number',
      required: true,
    }),
    date: useField({
      initValue: today(),
      validate: (value: string) => {
        if (!moment(value, 'YYYY-MM-DD', true).isValid()) return 'Enter a valid date';
        if (moment(value, 'YYYY-MM-DD').isAfter(moment(), 'day')) return 'Date cannot be in the future';
        return '';
      },
      required: true,
    }),
  };

  // Check every field (not stop at the first) so each problem is marked at once.
  const isFormValid = () =>
    Object.values(formFields)
      .map((x) => x.isValid())
      .every(Boolean);

  const symbolValue = formFields.symbol.value.trim().toUpperCase();
  const heldQty = holdings
    .filter((h) => h.accountId === formFields.accountId.value && h.symbol?.toUpperCase() === symbolValue)
    .reduce((sum, h) => sum + h.qty, 0);
  const tradeAccount = accounts.find((a) => a.id === formFields.accountId.value);
  const tradeSummary = `${formFields.qty.value} ${symbolValue} @ ${fnCurrency(parseFloat(formFields.averagePrice.value))}${
    tradeAccount ? ` in ${tradeAccount.name}` : ''
  }`;

  const handleSubmit = async (confirmedOverdraft = false) => {
    try {
      if (isFormValid()) {
        // Ask before a buy takes an account that holds cash below zero; one that
        // doesn't track cash (already at or below zero) isn't nagged every trade.
        if (formFields.buySell.value === 'buy' && !confirmedOverdraft && tradeAccount) {
          const after =
            (tradeAccount.cashBalance ?? 0) -
            parseFloat(formFields.qty.value) * parseFloat(formFields.averagePrice.value);
          if ((tradeAccount.cashBalance ?? 0) > 0 && after < 0) {
            setOverdraft({ account: tradeAccount, after });
            return;
          }
        }
        setOverdraft(null);
        setIsLoading(true);
        if (formFields.buySell.value === 'sell') {
          await apis.holdings.sellHolding({
            accountId: formFields.accountId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value.trim().toUpperCase(),
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            type: formFields.type.value as IHoldings['type'],
            date: formFields.date.value,
            lotMethod,
          });

          toast.success(`Sold ${tradeSummary}`);

          closeAndResetDialog();
          refreshData();
        } else if (formFields.buySell.value === 'buy') {
          await apis.holdings.buyHolding({
            accountId: formFields.accountId.value,
            name: formFields.name.value,
            symbol: formFields.symbol.value.trim().toUpperCase(),
            qty: parseFloat(formFields.qty.value),
            averagePrice: parseFloat(formFields.averagePrice.value),
            type: formFields.type.value as IHoldings['type'],
            date: formFields.date.value,
          });

          toast.success(`Bought ${tradeSummary}`);

          closeAndResetDialog();
          refreshData();
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to record the trade');
    } finally {
      setIsLoading(false);
    }
  };

  const closeAndResetDialog = () => {
    handleDialogClose();
    Object.values(formFields).map((x) => x.resetValue());
    setLotMethod('fifo');
  };

  // Live tax preview for sells, from the same simulator as Mock trade.
  const previewRequest: SimulationRequest | null =
    formFields.buySell.value === 'sell' &&
    formFields.accountId.value &&
    formFields.symbol.value.trim().length >= 2 &&
    NUMERIC.test(formFields.qty.value.trim()) &&
    Number(formFields.qty.value) > 0 &&
    NUMERIC.test(formFields.averagePrice.value.trim()) &&
    moment(formFields.date.value, 'YYYY-MM-DD', true).isValid()
      ? {
          action: 'sell',
          accountId: formFields.accountId.value,
          symbol: formFields.symbol.value.trim().toUpperCase(),
          qty: Number(formFields.qty.value),
          price: Number(formFields.averagePrice.value),
          date: formFields.date.value,
          lotMethod,
        }
      : null;
  const previewKey = previewRequest ? JSON.stringify(previewRequest) : '';

  const runPreview = React.useMemo(
    () =>
      debounce((req: SimulationRequest) => {
        const seq = ++previewSeq.current;
        setIsPreviewLoading(true);
        apis.holdings
          .simulate(req)
          .then((res) => seq === previewSeq.current && setPreview(res))
          .catch((err) => {
            if (seq !== previewSeq.current) return;
            setPreview(null);
            toast.error(err.message || 'Failed to estimate tax', { toastId: err.message || 'sell-preview' });
          })
          .finally(() => seq === previewSeq.current && setIsPreviewLoading(false));
      }, 500),
    []
  );

  React.useEffect(() => {
    if (open && previewRequest) {
      runPreview(previewRequest);
    } else {
      runPreview.cancel();
      previewSeq.current += 1;
      setPreview(null);
      setIsPreviewLoading(false);
    }
  }, [open, previewKey]);

  return (
    <Dialog open={open} maxWidth="md" fullScreen={fullScreen} onClose={closeAndResetDialog}>
      <Typography sx={{ m: 2 }} variant="h6">
        Buy / Sell
      </Typography>

      <Box sx={{ m: 2, mt: 0 }}>
        <Box sx={{ display: 'flex', gap: '16px', direction: 'row', mt: '16px', flexWrap: 'wrap' }}>
          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextField
              select
              label="Buy / Sell"
              value={formFields.buySell.value}
              onChange={formFields.buySell.onChange as any}
              error={!!formFields.buySell.error}
              helperText={formFields.buySell.error}
              size="small"
              disabled={isLoading}
              sx={{ minWidth: 140 }}
            >
              {['buy', 'sell'].map((x) => (
                <MenuItem key={x} value={x}>
                  {Case.capital(x)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextField
              select
              label="Asset type"
              value={formFields.type.value}
              onChange={formFields.type.onChange as any}
              error={!!formFields.type.error}
              helperText={formFields.type.error}
              size="small"
              disabled={isLoading}
              sx={{ minWidth: 140 }}
            >
              {Object.values(HoldingTypesEnum).map((x) => (
                <MenuItem key={x} value={x}>
                  {Case.capital(x)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextField
              select
              label="Account"
              value={formFields.accountId.value}
              onChange={formFields.accountId.onChange as any}
              error={!!formFields.accountId.error}
              helperText={
                formFields.accountId.error ||
                (tradeAccount ? `Cash ${fnCurrency(tradeAccount.cashBalance ?? 0)}` : undefined)
              }
              size="small"
              disabled={isLoading}
              sx={{ minWidth: 160 }}
            >
              {accounts.map((account) => (
                <MenuItem value={account.id} key={account.id}>
                  {account.name}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {formFields.buySell.value === 'buy' && (
            <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
              {/* <FormLabel>Name</FormLabel> */}
              <TextField
                color="primary"
                label="Name (optional)"
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
              label="Symbol"
              id="symbol"
              name="symbol"
              variant="outlined"
              value={formFields.symbol.value}
              onChange={formFields.symbol.onChange}
              error={!!formFields.symbol.error}
              helperText={
                formFields.symbol.error ||
                (formFields.buySell.value === 'sell' && symbolValue && tradeAccount
                  ? `You hold ${heldQty} ${symbolValue} here`
                  : undefined)
              }
              size="small"
              disabled={isLoading}
            />
          </Stack>

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            {/* <FormLabel>Quantity</FormLabel> */}
            <TextField
              label="Quantity"
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
              label={formFields.buySell.value === 'sell' ? 'Sale price per share' : 'Price per share'}
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

          <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
            <TextField
              label="Trade date"
              type="date"
              id="date"
              name="date"
              variant="outlined"
              value={formFields.date.value}
              onChange={formFields.date.onChange}
              error={!!formFields.date.error}
              helperText={formFields.date.error || 'When the trade actually happened'}
              size="small"
              disabled={isLoading}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
          </Stack>
          {formFields.buySell.value === 'sell' && (
            <Stack direction="column" spacing={0.5} sx={{ flexGrow: 1 }}>
              <TextField
                select
                label="Lots to sell"
                value={lotMethod}
                onChange={(e) => setLotMethod(e.target.value as LotMethod)}
                size="small"
                disabled={isLoading}
              >
                {SELL_LOT_METHODS.map((m) => (
                  <MenuItem key={m} value={m}>
                    {LOT_METHOD_LABELS[m]}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </Box>

        {formFields.buySell.value === 'sell' &&
          previewRequest &&
          (isPreviewLoading && !preview ? (
            <Skeleton variant="rounded" height={56} sx={{ mt: 2 }} />
          ) : (
            preview?.realized &&
            preview.tax && (
              <Stack spacing={1} sx={{ mt: 2, opacity: isPreviewLoading ? 0.6 : 1 }}>
                <Alert severity="info" icon={<Iconify icon="tabler:receipt-tax" />}>
                  Realized {signed(preview.realized.total)} (short-term {signed(preview.realized.shortTerm)}, long-term{' '}
                  {signed(preview.realized.longTerm)}) · est. tax{' '}
                  <strong>
                    {preview.tax.total < 0 ? `${fnCurrency(-preview.tax.total)} saved` : fnCurrency(preview.tax.total)}
                  </strong>
                </Alert>
                {preview.washSale?.triggered && <Alert severity="warning">{preview.washSale.message}</Alert>}
                {preview.waitForLongTerm && (
                  <Alert severity="success">
                    Waiting until {moment(preview.waitForLongTerm.date).format('MMM D, YYYY')} would save about{' '}
                    {fnCurrency(preview.waitForLongTerm.taxSaving)} by making these shares long-term.
                  </Alert>
                )}
              </Stack>
            )
          ))}
      </Box>

      <Box sx={{ m: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
        <Button variant="text" onClick={closeAndResetDialog} color="error">
          Cancel
        </Button>

        <OverlayButton
          type="submit"
          variant="contained"
          onClick={() => handleSubmit()}
          disabled={isLoading}
          startIcon={<Iconify icon="lets-icons:send-duotone" />}
        >
          Submit
        </OverlayButton>
      </Box>

      <Dialog open={!!overdraft} onClose={() => setOverdraft(null)}>
        <DialogTitle>Not enough cash</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This buy takes {overdraft?.account.name}&apos;s cash from {fnCurrency(overdraft?.account.cashBalance ?? 0)}{' '}
            to <strong>{fnCurrency(overdraft?.after ?? 0)}</strong>. Record it anyway?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOverdraft(null)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => handleSubmit(true)}>
            Record anyway
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
