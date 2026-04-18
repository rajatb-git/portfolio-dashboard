import * as React from 'react';

import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';

import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { DB_HOST } from '@/config';
import LocalStorageUtil from '@/utils/localStorage';
import apis from '@/api';
import { AiConfig } from '@/api/live';

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
  const [aiConfig, setAiConfig] = React.useState<AiConfig | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = React.useState(false);
  const [pendingImportFile, setPendingImportFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    apis.live.getAiConfig().then(setAiConfig).catch(() => {});
  }, []);

  const handleApiHostBlur = () => {
    if (apiHost.trim()) {
      LocalStorageUtil.setItem('api_host', apiHost.trim());
      setApiHostSaved(true);
      setTimeout(() => setApiHostSaved(false), 2000);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await apis.live.exportDb();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Database exported successfully');
    } catch (err: any) {
      toast.error(err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.zip')) {
      toast.error('Please select a .zip backup file');
      return;
    }
    setPendingImportFile(file);
    setImportConfirmOpen(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirm = async () => {
    if (!pendingImportFile) return;
    setImportConfirmOpen(false);
    setImporting(true);
    try {
      const result = await apis.live.importDb(pendingImportFile);
      toast.success(result.message || 'Import completed');
    } catch (err: any) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
      setPendingImportFile(null);
    }
  };

  const updateAiConfig = (partial: Partial<AiConfig>) => {
    if (!aiConfig) return;
    const updated = { ...aiConfig, ...partial };
    setAiConfig(updated);
    setSaving(true);
    apis.live
      .saveAiConfig(partial)
      .then((saved) => setAiConfig(saved))
      .catch(() => {})
      .finally(() => setSaving(false));
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

      <SettingsSection title="Data">
        <SettingRow
          label="Export Database"
          description="Download a zip backup of all your portfolio data"
        >
          <Button
            variant="outlined"
            size="small"
            onClick={handleExport}
            disabled={exporting}
            sx={{ fontSize: '0.78rem', textTransform: 'none' }}
          >
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </SettingRow>
        <SettingRow
          label="Import Database"
          description="Restore from a previously exported zip backup"
        >
          <input
            type="file"
            accept=".zip"
            ref={fileInputRef}
            onChange={handleImportFileSelect}
            style={{ display: 'none' }}
          />
          <Button
            variant="outlined"
            size="small"
            color="warning"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            sx={{ fontSize: '0.78rem', textTransform: 'none' }}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </SettingRow>
      </SettingsSection>

      <Dialog open={importConfirmOpen} onClose={() => setImportConfirmOpen(false)}>
        <DialogTitle>Confirm Import</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will <strong>overwrite all existing data</strong> with the contents of the backup file.
            This action cannot be undone. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setImportConfirmOpen(false); setPendingImportFile(null); }}>
            Cancel
          </Button>
          <Button onClick={handleImportConfirm} color="warning" variant="contained">
            Overwrite &amp; Import
          </Button>
        </DialogActions>
      </Dialog>

      <SettingsSection title="AI Agent">
        <SettingRow label="Enable AI Insights" description="Show AI-powered analysis on the Research page">
          <Switch
            checked={aiConfig?.enabled ?? false}
            onChange={(_, checked) => updateAiConfig({ enabled: checked })}
          />
        </SettingRow>

        {aiConfig?.enabled && (
          <>
            <SettingRow label="Provider" description="Select which AI provider to use">
              <Select
                size="small"
                value={aiConfig.provider}
                onChange={(e) => updateAiConfig({ provider: e.target.value as AiConfig['provider'] })}
                sx={{ minWidth: 200, fontSize: '0.82rem' }}
              >
                <MenuItem value="ollama">Ollama (Local)</MenuItem>
                <MenuItem value="gemini">Gemini (Google)</MenuItem>
                <MenuItem value="claude">Claude (Anthropic)</MenuItem>
              </Select>
            </SettingRow>

            {aiConfig.provider === 'claude' && (
              <>
                <SettingRow label="API Key" description="Your Anthropic API key">
                  <TextField
                    size="small"
                    type="password"
                    value={aiConfig.claudeApiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, claudeApiKey: e.target.value })}
                    onBlur={() => updateAiConfig({ claudeApiKey: aiConfig.claudeApiKey })}
                    placeholder="sk-ant-..."
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
                <SettingRow label="Model" description="Claude model to use">
                  <TextField
                    size="small"
                    value={aiConfig.claudeModel}
                    onChange={(e) => setAiConfig({ ...aiConfig, claudeModel: e.target.value })}
                    onBlur={() => updateAiConfig({ claudeModel: aiConfig.claudeModel })}
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
              </>
            )}

            {aiConfig.provider === 'gemini' && (
              <>
                <SettingRow label="API Key" description="Your Google Gemini API key">
                  <TextField
                    size="small"
                    type="password"
                    value={aiConfig.geminiApiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, geminiApiKey: e.target.value })}
                    onBlur={() => updateAiConfig({ geminiApiKey: aiConfig.geminiApiKey })}
                    placeholder="AIza..."
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
                <SettingRow label="Model" description="Gemini model to use">
                  <TextField
                    size="small"
                    value={aiConfig.geminiModel}
                    onChange={(e) => setAiConfig({ ...aiConfig, geminiModel: e.target.value })}
                    onBlur={() => updateAiConfig({ geminiModel: aiConfig.geminiModel })}
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
              </>
            )}

            {aiConfig.provider === 'ollama' && (
              <>
                <SettingRow label="Host" description="Ollama server URL">
                  <TextField
                    size="small"
                    value={aiConfig.ollamaHost}
                    onChange={(e) => setAiConfig({ ...aiConfig, ollamaHost: e.target.value })}
                    onBlur={() => updateAiConfig({ ollamaHost: aiConfig.ollamaHost })}
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
                <SettingRow label="Model" description="Ollama model name (e.g. llama3.1, mistral)">
                  <TextField
                    size="small"
                    value={aiConfig.ollamaModel}
                    onChange={(e) => setAiConfig({ ...aiConfig, ollamaModel: e.target.value })}
                    onBlur={() => updateAiConfig({ ollamaModel: aiConfig.ollamaModel })}
                    sx={{ width: 260, '& input': { fontSize: '0.78rem' } }}
                  />
                </SettingRow>
              </>
            )}

            {saving && (
              <Typography sx={{ px: 2, py: 1, fontSize: '0.72rem', color: 'text.disabled' }}>
                Saving...
              </Typography>
            )}
          </>
        )}
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
