import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import * as React from 'react';

import type { ImportKind, RawImportRow } from '@/api/import';

type Field = keyof RawImportRow;

const FIELDS: Record<ImportKind, Array<{ key: Field; label: string; help?: string }>> = {
  positions: [
    { key: 'symbol', label: 'Symbol' },
    { key: 'name', label: 'Name' },
    { key: 'qty', label: 'Quantity' },
    { key: 'price', label: 'Cost per share', help: 'What you paid per share' },
    { key: 'costBasis', label: 'Total cost', help: 'Used when there is no cost per share' },
    { key: 'date', label: 'Date acquired', help: 'e.g. 2024-03-15' },
    { key: 'amount', label: 'Value', help: 'Only used for cash rows' },
  ],
  history: [
    { key: 'date', label: 'Date', help: 'e.g. 2024-03-15' },
    { key: 'action', label: 'Action', help: 'Buy, Sell, Deposit, Withdrawal…' },
    { key: 'symbol', label: 'Symbol' },
    { key: 'qty', label: 'Quantity' },
    { key: 'price', label: 'Price per share' },
    { key: 'amount', label: 'Amount', help: 'Cash amount of the line' },
  ],
};

type Props = {
  kind: ImportKind;
  row: RawImportRow;
  line: number;
  onClose: () => void;
  onSave: (row: RawImportRow) => void;
};

// Corrects one row before importing — most often a line the local AI misread.
// The corrected values go through the same checks as the rest of the file.
export default function RowEditDialog({ kind, row, line, onClose, onSave }: Props) {
  const [draft, setDraft] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v === undefined || v === null ? '' : String(v)]))
  );
  const set = (key: Field, value: string) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    const next: RawImportRow = {};
    for (const [k, v] of Object.entries(draft)) if (v.trim() !== '') (next as Record<string, string>)[k] = v.trim();
    onSave(next);
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Correct line {line}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
          Change anything that doesn’t match your statement. The row is checked again as soon as you save.
        </Typography>
        <Grid container spacing={1.5}>
          {FIELDS[kind].map((f) => (
            <Grid key={f.key} size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label={f.label}
                value={draft[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value)}
                helperText={f.help}
              />
            </Grid>
          ))}
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              select
              fullWidth
              size="small"
              label="Asset type"
              value={draft.assetType ?? ''}
              onChange={(e) => set('assetType', e.target.value)}
              helperText="Leave as default to use the import setting"
            >
              <MenuItem value="">Default</MenuItem>
              <MenuItem value="stock">Stock / ETF / fund</MenuItem>
              <MenuItem value="crypto">Crypto</MenuItem>
            </TextField>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save}>
          Save row
        </Button>
      </DialogActions>
    </Dialog>
  );
}
