import * as React from 'react';
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

export default function CashDialog({ open, account, accounts, onClose, onSaved }: Props) {
  const [accountId, setAccountId] = React.useState(account?.id ?? '');
  const [action, setAction] = React.useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = React.useState('');
  const [date, setDate] = React.useState(today());
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setAccountId(account?.id ?? accounts?.[0]?.id ?? '');
      setAction('deposit');
      setAmount('');
      setDate(today());
    }
  }, [open, account, accounts]);

  const selected = (accounts ?? (account ? [account] : [])).find((a) => a.id === accountId) ?? null;

  const handleSave = async () => {
    if (!accountId) {
      toast.error('Pick an account');
      return;
    }
    const value = parseFloat(amount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error('Enter a positive amount');
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
    setSaving(true);
    try {
      await apis.accounts.moveCash(accountId, action, value, date);
      toast.success(
        `${action === 'deposit' ? 'Deposited' : 'Withdrew'} ${fnCurrency(value)} ${
          action === 'deposit' ? 'into' : 'from'
        } ${selected?.name ?? accountId} on ${moment(date, 'YYYY-MM-DD').format('MMM D, YYYY')}`
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
            onChange={(e) => setAction(e.target.value as 'deposit' | 'withdraw')}
            size="small"
            disabled={saving}
          >
            <MenuItem value="deposit">Deposit</MenuItem>
            <MenuItem value="withdraw">Withdraw</MenuItem>
          </Select>
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
            helperText="When the money actually moved"
            slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !amount || !date}>
          {saving ? 'Saving...' : action === 'deposit' ? 'Deposit' : 'Withdraw'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
