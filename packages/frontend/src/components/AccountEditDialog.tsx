import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { ACCOUNT_TAX_TYPE_LABELS, type AccountTaxType, type IAccount } from '@/models/AccountsModel';

type Props = {
  account: IAccount | null;
  onClose: () => void;
  onSaved: (account: IAccount) => void;
};

const MAX_NAME = 50;

export default function AccountEditDialog({ account, onClose, onSaved }: Props) {
  const [name, setName] = React.useState('');
  const [taxType, setTaxType] = React.useState<AccountTaxType>('taxable');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!account) return;
    setName(account.name);
    setTaxType(account.taxType ?? 'taxable');
  }, [account]);

  const trimmed = name.trim();
  const isDirty = !!account && (trimmed !== account.name || taxType !== (account.taxType ?? 'taxable'));
  const isValid = trimmed.length > 0 && trimmed.length <= MAX_NAME;

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const saved = await apis.accounts.insertOrUpdateById({ id: account.id, name: trimmed, taxType } as IAccount);
      toast.success(`Account "${saved.name}" saved`);
      onSaved(saved);
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!account} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>Edit account</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!isValid}
            helperText={!isValid ? `Name must be 1–${MAX_NAME} characters` : undefined}
            slotProps={{ htmlInput: { maxLength: MAX_NAME } }}
            disabled={saving}
          />
          <TextField
            select
            label="Tax treatment"
            size="small"
            value={taxType}
            onChange={(e) => setTaxType(e.target.value as AccountTaxType)}
            disabled={saving}
          >
            {(Object.keys(ACCOUNT_TAX_TYPE_LABELS) as AccountTaxType[]).map((t) => (
              <MenuItem key={t} value={t}>
                {ACCOUNT_TAX_TYPE_LABELS[t]}
              </MenuItem>
            ))}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Gains in tax-deferred and tax-free accounts aren&apos;t taxed when you sell, so they&apos;re left out of tax
            estimates, holding-period savings and loss harvesting.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        {isDirty && (
          <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto', ml: 1 }}>
            Unsaved changes
          </Typography>
        )}
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!isDirty || !isValid || saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
