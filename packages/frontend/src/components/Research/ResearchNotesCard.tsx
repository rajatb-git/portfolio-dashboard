import { Box, Button, Card, Divider, Skeleton, Stack, TextField, Typography } from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';

type Props = { symbol: string };

export default function ResearchNotesCard({ symbol }: Props) {
  const [saved, setSaved] = React.useState('');
  const [draft, setDraft] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!symbol) return;
    setIsLoading(true);
    apis.notes
      .get(symbol)
      .then((note) => {
        setSaved(note.body ?? '');
        setDraft(note.body ?? '');
      })
      .catch((err) => toast.error(err.message || 'Failed to load notes'))
      .finally(() => setIsLoading(false));
  }, [symbol]);

  const isDirty = draft !== saved;

  const handleSave = async () => {
    setSaving(true);
    try {
      const note = await apis.notes.save(symbol, draft);
      setSaved(note.body ?? '');
      setDraft(note.body ?? '');
      toast.success('Notes saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card variant="outlined">
      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', px: 2, py: 1.25 }}>
        <Iconify icon="mdi:notebook-edit-outline" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Notes &amp; Thesis
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {isDirty && <Typography sx={{ fontSize: '0.72rem', color: 'warning.main' }}>Unsaved changes</Typography>}
      </Stack>
      <Divider />
      <Box sx={{ p: 2 }}>
        {isLoading ? (
          <Skeleton variant="rounded" height={120} />
        ) : (
          <>
            <TextField
              multiline
              minRows={4}
              fullWidth
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Why you own ${symbol}, your thesis, price targets, exit plan…`}
              slotProps={{ htmlInput: { style: { fontSize: '0.85rem' } } }}
            />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setDraft(saved)}
                disabled={!isDirty || saving}
                sx={{ fontSize: '0.78rem', textTransform: 'none' }}
              >
                Reset
              </Button>
              <Button
                size="small"
                variant="contained"
                onClick={handleSave}
                disabled={!isDirty || saving}
                sx={{ fontSize: '0.78rem', textTransform: 'none' }}
              >
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </Card>
  );
}
