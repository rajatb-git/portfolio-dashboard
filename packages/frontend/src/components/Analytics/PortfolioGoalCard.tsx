import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  LinearProgress,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { GoalConfig, GoalProgress } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

const EMPTY: GoalConfig = { label: 'Portfolio Goal', targetValue: 0, targetDate: null };

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Box>
      <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
    </Box>
  );
}

export default function PortfolioGoalCard() {
  const [saved, setSaved] = React.useState<GoalConfig>(EMPTY);
  const [draft, setDraft] = React.useState<GoalConfig>(EMPTY);
  const [progress, setProgress] = React.useState<GoalProgress | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const loadProgress = React.useCallback(() => {
    apis.analytics
      .getGoalProgress()
      .then(setProgress)
      .catch((err) => toast.error(err.message || 'Failed to load goal progress'));
  }, []);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([
      apis.analytics.getGoalConfig().catch((err) => {
        toast.error(err.message || 'Failed to load goal');
        return EMPTY;
      }),
      apis.analytics.getGoalProgress().catch((err) => {
        toast.error(err.message || 'Failed to load goal progress');
        return null;
      }),
    ])
      .then(([config, prog]) => {
        setSaved(config);
        setDraft(config);
        setProgress(prog);
      })
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(saved) !== JSON.stringify(draft);

  const handleSave = async () => {
    if (!draft.targetValue || draft.targetValue <= 0) {
      toast.error('Enter a target value greater than zero');
      return;
    }
    setSaving(true);
    try {
      const resp = await apis.analytics.saveGoalConfig({ ...draft, label: draft.label.trim() || EMPTY.label });
      setSaved(resp);
      setDraft(resp);
      loadProgress();
      toast.success('Goal saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save goal');
    } finally {
      setSaving(false);
    }
  };

  const onTrackColor = progress?.onTrack === true ? 'var(--pd-up)' : progress?.onTrack === false ? 'var(--pd-down)' : 'var(--pd-warn)';

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="mdi:target" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Goal Tracker
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        {isDirty && (
          <Typography sx={{ fontSize: '0.68rem', color: 'var(--pd-warn)', fontWeight: 600 }}>Unsaved changes</Typography>
        )}
      </Stack>
      <Divider />

      {loading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={120} />
        </Box>
      ) : (
        <Box sx={{ p: 2 }}>
          <Stack direction="row" spacing={1.5} useFlexGap sx={{ flexWrap: 'wrap', mb: 2 }}>
            <TextField
              label="Goal name"
              size="small"
              value={draft.label}
              onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
              sx={{ flex: '1 1 160px' }}
            />
            <TextField
              label="Target value ($)"
              size="small"
              type="number"
              value={draft.targetValue || ''}
              onChange={(e) => setDraft((d) => ({ ...d, targetValue: Number(e.target.value) }))}
              sx={{ flex: '1 1 140px' }}
            />
            <TextField
              label="Target date (optional)"
              size="small"
              type="date"
              value={draft.targetDate ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, targetDate: e.target.value || null }))}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ flex: '1 1 140px' }}
            />
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Button
                variant="contained"
                size="small"
                onClick={handleSave}
                disabled={!isDirty || saving}
                sx={{ textTransform: 'none' }}
              >
                Save
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setDraft(saved)}
                disabled={!isDirty || saving}
                sx={{ textTransform: 'none' }}
              >
                Reset
              </Button>
            </Stack>
          </Stack>

          {!progress || progress.targetValue <= 0 ? (
            <Stack sx={{ alignItems: 'center', justifyContent: 'center', py: 3 }}>
              <Iconify icon="mdi:flag-outline" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
              <Typography sx={{ fontSize: '0.82rem', color: 'text.disabled', textAlign: 'center' }}>
                Set a target value to track progress and see a projected completion date based on your historical
                growth.
              </Typography>
            </Stack>
          ) : (
            <>
              <Stack direction="row" sx={{ alignItems: 'baseline', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700 }}>{progress.label}</Typography>
                <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'primary.main' }}>
                  {progress.progressPercent}%
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress.progressPercent}
                sx={{ height: 8, borderRadius: 4, mb: 1.5 }}
              />
              <Stack direction="row" sx={{ justifyContent: 'space-between', mb: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {fnCurrency(progress.currentValue)}
                </Typography>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                  {fnCurrency(progress.targetValue)}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={3} useFlexGap sx={{ flexWrap: 'wrap' }}>
                <Metric label="Remaining" value={fnCurrency(progress.remaining)} />
                {progress.monthlyGrowthRate !== null && (
                  <Metric
                    label="Monthly growth"
                    value={`${progress.monthlyGrowthRate >= 0 ? '+' : ''}${progress.monthlyGrowthRate}%`}
                    color={progress.monthlyGrowthRate >= 0 ? 'var(--pd-up)' : 'var(--pd-down)'}
                  />
                )}
                {progress.projectedDate && (
                  <Metric
                    label="Projected"
                    value={moment(progress.projectedDate).format('MMM YYYY')}
                    color="text.primary"
                  />
                )}
                {progress.requiredMonthlyReturn !== null && (
                  <Metric label="Needed / month" value={`${progress.requiredMonthlyReturn}%`} />
                )}
              </Stack>

              {progress.onTrack !== null && progress.targetDate && (
                <Chip
                  size="small"
                  icon={<Iconify icon={progress.onTrack ? 'mdi:check-circle' : 'mdi:alert-circle'} width={14} />}
                  label={
                    progress.onTrack
                      ? `On track for ${moment(progress.targetDate).format('MMM YYYY')}`
                      : `Behind pace for ${moment(progress.targetDate).format('MMM YYYY')}`
                  }
                  sx={{
                    mt: 1.5,
                    height: 22,
                    fontSize: '0.68rem',
                    fontWeight: 600,
                    bgcolor: `${onTrackColor}22`,
                    color: onTrackColor,
                  }}
                />
              )}
            </>
          )}
        </Box>
      )}
    </Card>
  );
}
