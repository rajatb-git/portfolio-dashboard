import * as React from 'react';

import { Box, Button, Card, Divider, InputAdornment, Skeleton, Stack, TextField, Typography } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { TaxConfig } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';

type Draft = Record<keyof TaxConfig, string>;

const FIELDS: Array<{ key: keyof TaxConfig; label: string; helper: string }> = [
  { key: 'shortTermRate', label: 'Short-term rate', helper: 'Your ordinary income bracket' },
  { key: 'longTermRate', label: 'Long-term rate', helper: 'Usually 0%, 15% or 20%' },
  { key: 'stateRate', label: 'State rate', helper: 'Applied to all net gains' },
];

const toDraft = (config: TaxConfig): Draft => ({
  shortTermRate: String(config.shortTermRate),
  longTermRate: String(config.longTermRate),
  stateRate: String(config.stateRate),
});

const fieldError = (value: string) => {
  const n = Number(value);
  return value.trim() === '' || !Number.isFinite(n) || n < 0 || n > 100 ? 'Enter 0–100' : '';
};

type Props = {
  onSaved: () => void;
};

export default function TaxRatesCard({ onSaved }: Props) {
  const [saved, setSaved] = React.useState<Draft | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    apis.analytics
      .getTaxConfig()
      .then((config) => {
        setSaved(toDraft(config));
        setDraft(toDraft(config));
      })
      .catch((err) => toast.error(err.message || 'Failed to load tax rates'));
  }, []);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const hasError = !!draft && FIELDS.some((f) => fieldError(draft[f.key]));

  const handleSave = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const resp = await apis.analytics.saveTaxConfig({
        shortTermRate: Number(draft.shortTermRate),
        longTermRate: Number(draft.longTermRate),
        stateRate: Number(draft.stateRate),
      });
      setSaved(toDraft(resp));
      setDraft(toDraft(resp));
      toast.success('Tax rates saved');
      onSaved();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save tax rates');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="tabler:percentage" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Tax Rates
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {isDirty && (
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--pd-warn)', fontWeight: 600 }}>
            Unsaved changes
          </Typography>
        )}
      </Stack>
      <Divider />

      {!draft ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={56} />
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
            {FIELDS.map((f) => (
              <TextField
                key={f.key}
                label={f.label}
                size="small"
                value={draft[f.key]}
                onChange={(e) => setDraft((d) => (d ? { ...d, [f.key]: e.target.value } : d))}
                error={!!fieldError(draft[f.key])}
                helperText={fieldError(draft[f.key]) || f.helper}
                disabled={saving}
                sx={{ flex: '1 1 150px' }}
                slotProps={{ input: { endAdornment: <InputAdornment position="end">%</InputAdornment> } }}
              />
            ))}
            <Stack direction="row" spacing={1} sx={{ pt: 0.25 }}>
              <Button onClick={() => setDraft(saved)} disabled={!isDirty || saving}>
                Reset
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={!isDirty || hasError || saving}>
                Save
              </Button>
            </Stack>
          </Stack>
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mt: 1 }}>
            Used for every tax estimate in the app — position tax lots, Mock trade and the sell preview. Stored locally;
            never sent anywhere.
          </Typography>
        </Box>
      )}
    </Card>
  );
}
