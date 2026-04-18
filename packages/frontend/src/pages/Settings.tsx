import * as React from 'react';

import {
  Box,
  Card,
  Chip,
  Divider,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { DB_HOST } from '@/config';
import LocalStorageUtil from '@/utils/localStorage';
import apis from '@/api';
import { AiProviderInfo } from '@/api/live';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <Typography
        sx={{
          p: '10px 16px',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {title}
      </Typography>
      <Divider />
      {children}
    </Card>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Stack
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      sx={{ px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: 'text.primary' }}>{label}</Typography>
        {description && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.25 }}>{description}</Typography>
        )}
      </Box>
      {children}
    </Stack>
  );
}

export default function Settings() {
  const { mode, setMode } = useThemeMode();
  const [apiHost, setApiHost] = React.useState(LocalStorageUtil.getItem<string>('api_host') ?? DB_HOST);
  const [apiHostSaved, setApiHostSaved] = React.useState(false);
  const [aiProvider, setAiProvider] = React.useState<AiProviderInfo | null>(null);

  React.useEffect(() => {
    apis.live.getAiProviderInfo().then(setAiProvider).catch(() => {});
  }, []);

  const handleApiHostBlur = () => {
    if (apiHost.trim()) {
      LocalStorageUtil.setItem('api_host', apiHost.trim());
      setApiHostSaved(true);
      setTimeout(() => setApiHostSaved(false), 2000);
    }
  };

  return (
    <Box sx={{ maxWidth: 680 }}>
      <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
        Settings
      </Typography>

      <SettingsSection title="Appearance">
        <SettingRow label="Theme" description="Switch between dark and light mode">
          <ToggleButtonGroup
            size="small"
            value={mode}
            exclusive
            onChange={(_, val) => {
              if (val) setMode(val);
            }}
          >
            <ToggleButton value="dark" sx={{ px: 2, fontSize: '0.78rem' }}>
              Dark
            </ToggleButton>
            <ToggleButton value="light" sx={{ px: 2, fontSize: '0.78rem' }}>
              Light
            </ToggleButton>
          </ToggleButtonGroup>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Dashboard">
        <SettingRow
          label="Price Alert Threshold"
          description="Show 'Near Target' badge when price is within this % of target"
        >
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600 }}>5%</Typography>
        </SettingRow>
        <SettingRow label="Default Rows Per Page" description="Number of holdings shown per page">
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600 }}>50</Typography>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="API">
        <SettingRow
          label="Backend URL"
          description="Override the backend API host. Requires page reload to take effect."
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            {apiHostSaved && (
              <Typography sx={{ fontSize: '0.72rem', color: 'success.main' }}>Saved</Typography>
            )}
            <TextField
              size="small"
              value={apiHost}
              onChange={(e) => setApiHost(e.target.value)}
              onBlur={handleApiHostBlur}
              sx={{ width: 240, '& input': { fontSize: '0.78rem' } }}
            />
          </Stack>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="AI Agent">
        <SettingRow
          label="Active Provider"
          description="Set AI_PROVIDER env var to override auto-detection"
        >
          <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', fontWeight: 600 }}>
            {aiProvider?.active ? `${aiProvider.active.name} (${aiProvider.active.model})` : '—'}
          </Typography>
        </SettingRow>
        {aiProvider?.providers.map((p) => (
          <SettingRow
            key={p.name}
            label={p.name.charAt(0).toUpperCase() + p.name.slice(1)}
            description={
              p.name === 'claude' ? 'ANTHROPIC_API_KEY' :
              p.name === 'gemini' ? 'GEMINI_API_KEY' :
              'OLLAMA_HOST (default localhost:11434)'
            }
          >
            <Chip
              label={p.configured ? 'Configured' : 'Not configured'}
              size="small"
              sx={{
                height: 22,
                fontSize: '0.72rem',
                fontWeight: 600,
                bgcolor: p.configured ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.08)',
                color: p.configured ? '#22c55e' : 'text.disabled',
                border: '1px solid',
                borderColor: p.configured ? 'rgba(34,197,94,0.25)' : 'divider',
              }}
            />
          </SettingRow>
        ))}
      </SettingsSection>

      <SettingsSection title="About">
        <SettingRow label="Application" description="Portfolio Dashboard">
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>v1.0.0</Typography>
        </SettingRow>
        <SettingRow label="Data Provider" description="Real-time market data">
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>Finnhub + NASDAQ</Typography>
        </SettingRow>
        <SettingRow label="Charts" description="Charting libraries">
          <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>ApexCharts + MUI X</Typography>
        </SettingRow>
      </SettingsSection>
    </Box>
  );
}
