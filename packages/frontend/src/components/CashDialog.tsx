import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  open: boolean;
  account: IAccount | null;
  accounts?: IAccount[];
  onClose: () => void;
  onSaved: () => void;
};

const today = () => moment().format('YYYY-MM-DD');

type CashAction = 'deposit' | 'withdraw' | 'dividend';

const SAVE_LABEL: Record<CashAction, string> = {
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  dividend: 'Record dividend',
};

export default function CashDialog({ open, account, accounts, onClose, onSaved }: Props) {
  const [accountId, setAccountId] = React.useState(account?.id ?? '');
  const [action, setAction] = React.useState<CashAction>('deposit');
  const [symbol, setSymbol] = React.useState('');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(today());
  const [saving, setSaving] = React.useState(false);
  const [confirmOverdraft, setConfirmOverdraft] = React.useState(false);

  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    // Only reset on the closed→open transition — the dashboard poll hands us a fresh `accounts` array every 30s.
    if (open && !wasOpen.current) {
      setAccountId(account?.id ?? accounts?.[0]?.id ?? '');
      setAction('deposit');
      setSymbol('');
      setAmount('');
      setDate(today());
    }
    wasOpen.current = open;
  }, [open, account, accounts]);

  const selected = (accounts ?? (account ? [account] : [])).find((a) => a.id === accountId) ?? null;

  const handleSave = async (overdraftConfirmed = false) => {
    if (!accountId) {
      toast.error('Pick an account');
      return;
    }
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a positive amount');
      return;
    }
    const ticker = symbol.trim().toUpperCase();
    if (action === 'dividend' && !ticker) {
      toast.error('Enter the symbol that paid the dividend');
      return;
    }
    if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
      toast.error('Enter a valid date');
      return;
    }
    if (moment(date, 'YYYY-MM-DD').isAfter(moment(), 'day')) {
      toast.error('Date cannot be in the future');
      return;
    }
    const balance = selected?.cashBalance ?? 0;
    if (action === 'withdraw' && !overdraftConfirmed && value > balance) {
      setConfirmOverdraft(true);
      return;
    }
    setConfirmOverdraft(false);
    setSaving(true);
    try {
      await apis.accounts.moveCash(accountId, action, value, date, action === 'dividend' ? ticker : undefined);
      const when = moment(date, 'YYYY-MM-DD').format('MMM D, YYYY');
      const where = selected?.name ?? accountId;
      toast.success(
        action === 'dividend'
          ? `Recorded a ${fnCurrency(value)} dividend from ${ticker} in ${where} on ${when}`
          : `${action === 'deposit' ? 'Deposited' : 'Withdrew'} ${fnCurrency(value)} ${
              action === 'deposit' ? 'into' : 'from'
            } ${where} on ${when}`
      );
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update cash balance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>{selected ? `Cash — ${selected.name}` : 'Manage Cash'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {accounts && accounts.length > 0 && (
              <Box>
                <Typography
                  sx={{
                    fontSize: '0.7rem',
                    color: 'text.disabled',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    mb: 0.5,
                  }}
                >
                  Account
                </Typography>
                <Select
                  size="small"
                  fullWidth
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  disabled={saving}
                >
                  {accounts.map((a) => (
                    <MenuItem key={a.id} value={a.id}>
                      {a.name} — {fnCurrency(a.cashBalance ?? 0)}
                    </MenuItem>
                  ))}
                </Select>
              </Box>
            )}

            <Box>
              <Typography
                sx={{ fontSize: '0.7rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Current Balance
              </Typography>
              <Typography sx={{ fontSize: '1.2rem', fontWeight: 700 }}>
                {fnCurrency(selected?.cashBalance ?? 0)}
              </Typography>
            </Box>

            <Select
              value={action}
              onChange={(e) => setAction(e.target.value as CashAction)}
              size="small"
              disabled={saving}
            >
              <MenuItem value="deposit">Deposit</MenuItem>
              <MenuItem value="withdraw">Withdraw</MenuItem>
              <MenuItem value="dividend">Dividend received</MenuItem>
            </Select>
            {action === 'dividend' && (
              <TextField
                size="small"
                label="Paid by (symbol)"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                disabled={saving}
                helperText="The holding that paid it, e.g. AAPL"
              />
            )}
            <TextField
              size="small"
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={saving}
              slotProps={{ htmlInput: { min: 0, step: '0.01' } }}
            />
            <TextField
              size="small"
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={saving}
              helperText={action === 'dividend' ? 'The pay date' : 'When the money actually moved'}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={() => handleSave()}
            variant="contained"
            disabled={saving || !amount || !date || (action === 'dividend' && !symbol.trim())}
          >
            {saving ? 'Saving...' : SAVE_LABEL[action]}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmOverdraft} onClose={() => setConfirmOverdraft(false)} maxWidth="xs">
        <DialogTitle>Withdraw more than the balance?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {selected?.name ?? 'This account'} holds {fnCurrency(selected?.cashBalance ?? 0)}. Withdrawing{' '}
            {fnCurrency(parseFloat(amount) || 0)} leaves it at{' '}
            <strong>{fnCurrency((selected?.cashBalance ?? 0) - (parseFloat(amount) || 0))}</strong>.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOverdraft(false)}>Cancel</Button>
          <Button variant="contained" color="warning" onClick={() => handleSave(true)}>
            Withdraw anyway
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
