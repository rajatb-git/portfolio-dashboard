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
  IconButton,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { toast } from 'react-toastify';
import apis from '@/api';
import type { AiConfig } from '@/api/live';
import type {
  AlertMonitorConfig,
  BackupFile,
  IpoAnnouncementConfig,
  IpoReminderConfig,
  LockStatus,
  DividendWatchConfig,
  EarningsReminderConfig,
  MoveAlertConfig,
  NewsWatchConfig,
  NotificationConfig,
  QuietHoursConfig,
  ScheduledBackupConfig,
  TradingSummaryConfig,
  ValueCalcConfig,
} from '@/api/settings';
import { Iconify } from '@/components/Iconify';
import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import PageHeader from '@/components/ui/PageHeader';
import { DB_HOST } from '@/config';
import { useAuth } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import type { IAccount } from '@/models/AccountsModel';
import LocalStorageUtil from '@/utils/localStorage';
import {
  NOTIFICATIONS_ENABLED_KEY,
  notificationsSupported,
  requestNotificationPermission,
} from '@/utils/priceAlertNotifications';

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
      direction={{ xs: 'column', sm: 'row' }}
      sx={{
        alignItems: { xs: 'flex-start', sm: 'center' },
        justifyContent: 'space-between',
        px: 2,
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.85rem', fontWeight: 500, color: 'text.primary' }}>{label}</Typography>
        {description && (
          <Typography sx={{ fontSize: '0.75rem', color: 'text.disabled', mt: 0.25 }}>{description}</Typography>
        )}
      </Box>
      <Box sx={{ mt: { xs: 1, sm: 0 }, width: { xs: '100%', sm: 'auto' } }}>{children}</Box>
    </Stack>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

const IDLE_OPTIONS: Array<{ label: string; value: number }> = [
  { label: '1 minute', value: 1 },
  { label: '5 minutes', value: 5 },
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: 'Never', value: 0 },
];

const DEFAULT_LOCK: LockStatus = { enabled: false, idleTimeoutMinutes: 15 };

const CATEGORIES = [
  { id: 'general', label: 'General', icon: 'mdi:tune-variant' },
  { id: 'accounts', label: 'Accounts', icon: 'mdi:account-group-outline' },
  { id: 'portfolio', label: 'Portfolio Tracker', icon: 'mdi:chart-line' },
  { id: 'alerts', label: 'Alerts & Notifications', icon: 'mdi:bell-outline' },
  { id: 'ai', label: 'AI Agent', icon: 'mdi:robot-outline' },
  { id: 'data', label: 'Data & Backups', icon: 'mdi:database-outline' },
  { id: 'security', label: 'Security', icon: 'mdi:shield-lock-outline' },
] as const;

type CategoryId = (typeof CATEGORIES)[number]['id'];

export default function Settings() {
  const { mode, setMode, density, setDensity } = useThemeMode();
  const { refreshStatus } = useAuth();
  const { enabled: demoModeEnabled, setEnabled: setDemoModeEnabled } = useDemoMode();
  const [savingDemoMode, setSavingDemoMode] = React.useState(false);
  const [resettingDemoData, setResettingDemoData] = React.useState(false);
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [category, setCategory] = React.useState<CategoryId>('general');
  const savedApiHost = LocalStorageUtil.getItem<string>('api_host') ?? DB_HOST;
  const [apiHost, setApiHost] = React.useState(savedApiHost);
  const [apiHostSaved, setApiHostSaved] = React.useState(false);
  const isApiHostDirty = apiHost.trim() !== savedApiHost;
  const [aiConfig, setAiConfig] = React.useState<AiConfig | null>(null);
  const [draftAiConfig, setDraftAiConfig] = React.useState<AiConfig | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [savedLock, setSavedLock] = React.useState<LockStatus>(DEFAULT_LOCK);
  const [draftLock, setDraftLock] = React.useState<LockStatus>(DEFAULT_LOCK);
  const [lockCurrentCode, setLockCurrentCode] = React.useState('');
  const [lockNewCode, setLockNewCode] = React.useState('');
  const [lockConfirmCode, setLockConfirmCode] = React.useState('');
  const [savingLock, setSavingLock] = React.useState(false);
  const savedThreshold = Number(LocalStorageUtil.getItem<string>('alert_threshold') ?? '5') || 5;
  const [draftThreshold, setDraftThreshold] = React.useState(savedThreshold);
  const [savedThresholdVal, setSavedThresholdVal] = React.useState(savedThreshold);
  const isThresholdDirty = draftThreshold !== savedThresholdVal;

  const handleSaveThreshold = () => {
    LocalStorageUtil.setItem('alert_threshold', String(draftThreshold));
    setSavedThresholdVal(draftThreshold);
    toast.success('Alert threshold saved');
  };

  const [notificationsOn, setNotificationsOn] = React.useState(
    LocalStorageUtil.getItem<boolean>(NOTIFICATIONS_ENABLED_KEY) === true
  );

  const handleToggleNotifications = async (checked: boolean) => {
    if (checked) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        toast.error('Browser notification permission was denied');
        return;
      }
      toast.success('Price alert notifications enabled');
    }
    LocalStorageUtil.setItem(NOTIFICATIONS_ENABLED_KEY, checked);
    setNotificationsOn(checked);
  };

  const DEFAULT_VALUE_CALC: ValueCalcConfig = { enabled: false, intervalMinutes: 15 };
  const [savedValueCalc, setSavedValueCalc] = React.useState<ValueCalcConfig>(DEFAULT_VALUE_CALC);
  const [draftValueCalc, setDraftValueCalc] = React.useState<ValueCalcConfig>(DEFAULT_VALUE_CALC);
  const [savingValueCalc, setSavingValueCalc] = React.useState(false);
  const isValueCalcDirty = JSON.stringify(savedValueCalc) !== JSON.stringify(draftValueCalc);

  const DEFAULT_ALERT_MONITOR: AlertMonitorConfig = { enabled: true, intervalMinutes: 5 };
  const [savedAlertMonitor, setSavedAlertMonitor] = React.useState<AlertMonitorConfig>(DEFAULT_ALERT_MONITOR);
  const [draftAlertMonitor, setDraftAlertMonitor] = React.useState<AlertMonitorConfig>(DEFAULT_ALERT_MONITOR);
  const [savingAlertMonitor, setSavingAlertMonitor] = React.useState(false);
  const isAlertMonitorDirty = JSON.stringify(savedAlertMonitor) !== JSON.stringify(draftAlertMonitor);

  const DEFAULT_MOVE_ALERT: MoveAlertConfig = {
    enabled: false,
    intervalMinutes: 15,
    thresholdPercent: 5,
    escalationStepPercent: 3,
    spikePercent: 2,
    spikeWindowMinutes: 30,
    cryptoAlwaysOn: true,
    includeAfterHours: true,
  };
  const [savedMoveAlert, setSavedMoveAlert] = React.useState<MoveAlertConfig>(DEFAULT_MOVE_ALERT);
  const [draftMoveAlert, setDraftMoveAlert] = React.useState<MoveAlertConfig>(DEFAULT_MOVE_ALERT);
  const [savingMoveAlert, setSavingMoveAlert] = React.useState(false);
  const isMoveAlertDirty = JSON.stringify(savedMoveAlert) !== JSON.stringify(draftMoveAlert);
  const setMoveAlert = (partial: Partial<MoveAlertConfig>) => setDraftMoveAlert((prev) => ({ ...prev, ...partial }));

  const DEFAULT_NEWS_WATCH: NewsWatchConfig = {
    enabled: false,
    intervalMinutes: 15,
    topic: 'portfolio-dashboard/news',
    watchHoldings: true,
    watchMarket: true,
    breakingOnly: true,
    maxPerRun: 5,
    lookbackHours: 6,
  };
  const [savedNewsWatch, setSavedNewsWatch] = React.useState<NewsWatchConfig>(DEFAULT_NEWS_WATCH);
  const [draftNewsWatch, setDraftNewsWatch] = React.useState<NewsWatchConfig>(DEFAULT_NEWS_WATCH);
  const [savingNewsWatch, setSavingNewsWatch] = React.useState(false);
  const [testingNewsWatch, setTestingNewsWatch] = React.useState(false);
  const isNewsWatchDirty = JSON.stringify(savedNewsWatch) !== JSON.stringify(draftNewsWatch);
  const setNewsWatch = (partial: Partial<NewsWatchConfig>) => setDraftNewsWatch((prev) => ({ ...prev, ...partial }));

  const DEFAULT_QUIET_HOURS: QuietHoursConfig = {
    enabled: false,
    startHour: 22,
    endHour: 7,
    mode: 'digest',
    allowCritical: true,
    criticalThresholdPercent: 10,
  };
  const [savedQuietHours, setSavedQuietHours] = React.useState<QuietHoursConfig>(DEFAULT_QUIET_HOURS);
  const [draftQuietHours, setDraftQuietHours] = React.useState<QuietHoursConfig>(DEFAULT_QUIET_HOURS);
  const [savingQuietHours, setSavingQuietHours] = React.useState(false);
  const [flushingQuietHours, setFlushingQuietHours] = React.useState(false);
  const isQuietHoursDirty = JSON.stringify(savedQuietHours) !== JSON.stringify(draftQuietHours);
  const setQuietHours = (partial: Partial<QuietHoursConfig>) =>
    setDraftQuietHours((prev) => ({ ...prev, ...partial }));

  const DEFAULT_EARNINGS: EarningsReminderConfig = {
    enabled: false,
    daysBefore: 1,
    notifyResults: true,
    topic: 'portfolio-dashboard/earnings',
  };
  const [savedEarnings, setSavedEarnings] = React.useState<EarningsReminderConfig>(DEFAULT_EARNINGS);
  const [draftEarnings, setDraftEarnings] = React.useState<EarningsReminderConfig>(DEFAULT_EARNINGS);
  const [savingEarnings, setSavingEarnings] = React.useState(false);
  const [testingEarnings, setTestingEarnings] = React.useState(false);
  const isEarningsDirty = JSON.stringify(savedEarnings) !== JSON.stringify(draftEarnings);
  const setEarnings = (partial: Partial<EarningsReminderConfig>) =>
    setDraftEarnings((prev) => ({ ...prev, ...partial }));

  const DEFAULT_DIVIDENDS: DividendWatchConfig = {
    enabled: false,
    daysBefore: 3,
    notifyExDate: true,
    notifyPayment: true,
    topic: 'portfolio-dashboard/dividends',
  };
  const [savedDividends, setSavedDividends] = React.useState<DividendWatchConfig>(DEFAULT_DIVIDENDS);
  const [draftDividends, setDraftDividends] = React.useState<DividendWatchConfig>(DEFAULT_DIVIDENDS);
  const [savingDividends, setSavingDividends] = React.useState(false);
  const [testingDividends, setTestingDividends] = React.useState(false);
  const isDividendsDirty = JSON.stringify(savedDividends) !== JSON.stringify(draftDividends);
  const setDividends = (partial: Partial<DividendWatchConfig>) =>
    setDraftDividends((prev) => ({ ...prev, ...partial }));

  const DEFAULT_IPO_REMINDER: IpoReminderConfig = { enabled: true, daysBefore: 1 };
  const [savedIpoReminder, setSavedIpoReminder] = React.useState<IpoReminderConfig>(DEFAULT_IPO_REMINDER);
  const [draftIpoReminder, setDraftIpoReminder] = React.useState<IpoReminderConfig>(DEFAULT_IPO_REMINDER);
  const [savingIpoReminder, setSavingIpoReminder] = React.useState(false);
  const isIpoReminderDirty = JSON.stringify(savedIpoReminder) !== JSON.stringify(draftIpoReminder);

  const DEFAULT_IPO_ANNOUNCEMENT: IpoAnnouncementConfig = {
    enabled: false,
    topic: 'portfolio-dashboard/ipo-announcements',
  };
  const [savedIpoAnnouncement, setSavedIpoAnnouncement] =
    React.useState<IpoAnnouncementConfig>(DEFAULT_IPO_ANNOUNCEMENT);
  const [draftIpoAnnouncement, setDraftIpoAnnouncement] =
    React.useState<IpoAnnouncementConfig>(DEFAULT_IPO_ANNOUNCEMENT);
  const [savingIpoAnnouncement, setSavingIpoAnnouncement] = React.useState(false);
  const [testingIpoAnnouncement, setTestingIpoAnnouncement] = React.useState(false);
  const isIpoAnnouncementDirty = JSON.stringify(savedIpoAnnouncement) !== JSON.stringify(draftIpoAnnouncement);
  const setIpoAnnouncement = (partial: Partial<IpoAnnouncementConfig>) =>
    setDraftIpoAnnouncement((prev) => ({ ...prev, ...partial }));

  const DEFAULT_NOTIF: NotificationConfig = {
    mqtt: {
      enabled: false,
      url: '',
      username: '',
      password: '',
      topic: 'portfolio-dashboard/alerts',
      qos: 1,
      retain: false,
    },
  };
  const [savedNotif, setSavedNotif] = React.useState<NotificationConfig>(DEFAULT_NOTIF);
  const [draftNotif, setDraftNotif] = React.useState<NotificationConfig>(DEFAULT_NOTIF);
  const [savingNotif, setSavingNotif] = React.useState(false);
  const [testingNotif, setTestingNotif] = React.useState(false);
  const isNotifDirty = JSON.stringify(savedNotif) !== JSON.stringify(draftNotif);
  const setMqtt = (partial: Partial<NotificationConfig['mqtt']>) =>
    setDraftNotif((prev) => ({ mqtt: { ...prev.mqtt, ...partial } }));

  const DEFAULT_TRADING_SUMMARY: TradingSummaryConfig = {
    enabled: false,
    topHoldingsCount: 5,
    topic: 'portfolio-dashboard/summary',
  };
  const [savedSummary, setSavedSummary] = React.useState<TradingSummaryConfig>(DEFAULT_TRADING_SUMMARY);
  const [draftSummary, setDraftSummary] = React.useState<TradingSummaryConfig>(DEFAULT_TRADING_SUMMARY);
  const [savingSummary, setSavingSummary] = React.useState(false);
  const [testingSummary, setTestingSummary] = React.useState(false);
  const isSummaryDirty = JSON.stringify(savedSummary) !== JSON.stringify(draftSummary);
  const setSummary = (partial: Partial<TradingSummaryConfig>) => setDraftSummary((prev) => ({ ...prev, ...partial }));

  const DEFAULT_SCHEDULED_BACKUP: ScheduledBackupConfig = { enabled: false, intervalHours: 24, retentionCount: 7 };
  const [savedScheduledBackup, setSavedScheduledBackup] =
    React.useState<ScheduledBackupConfig>(DEFAULT_SCHEDULED_BACKUP);
  const [draftScheduledBackup, setDraftScheduledBackup] =
    React.useState<ScheduledBackupConfig>(DEFAULT_SCHEDULED_BACKUP);
  const [savingScheduledBackup, setSavingScheduledBackup] = React.useState(false);
  const [backups, setBackups] = React.useState<BackupFile[]>([]);
  const [backingUp, setBackingUp] = React.useState(false);
  const isScheduledBackupDirty = JSON.stringify(savedScheduledBackup) !== JSON.stringify(draftScheduledBackup);

  const [exporting, setExporting] = React.useState(false);
  const [importing, setImporting] = React.useState(false);
  const [importConfirmOpen, setImportConfirmOpen] = React.useState(false);
  const [pendingImportFile, setPendingImportFile] = React.useState<File | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [accounts, setAccounts] = React.useState<IAccount[]>([]);
  const [newAccountName, setNewAccountName] = React.useState('');
  const [addingAccount, setAddingAccount] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState<IAccount | null>(null);

  const isAiConfigDirty = !!aiConfig && !!draftAiConfig && JSON.stringify(aiConfig) !== JSON.stringify(draftAiConfig);

  React.useEffect(() => {
    apis.live
      .getAiConfig()
      .then((config) => {
        setAiConfig(config);
        setDraftAiConfig(config);
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to load AI configuration');
      });

    apis.accounts
      .getAll()
      .then(setAccounts)
      .catch((err) => toast.error(err.message || 'Failed to load accounts'));

    apis.settings
      .getLock()
      .then((lock) => {
        setSavedLock(lock);
        setDraftLock(lock);
      })
      .catch((err) => toast.error(err.message || 'Failed to load security settings'));

    apis.settings
      .getValueCalcConfig()
      .then((cfg) => {
        setSavedValueCalc(cfg);
        setDraftValueCalc(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load portfolio tracker settings'));

    apis.settings
      .getAlertMonitorConfig()
      .then((cfg) => {
        setSavedAlertMonitor(cfg);
        setDraftAlertMonitor(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load alert monitor settings'));

    apis.settings
      .getMoveAlertConfig()
      .then((cfg) => {
        setSavedMoveAlert(cfg);
        setDraftMoveAlert(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load move alert settings'));

    apis.settings
      .getNewsWatchConfig()
      .then((cfg) => {
        setSavedNewsWatch(cfg);
        setDraftNewsWatch(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load news watch settings'));

    apis.settings
      .getQuietHoursConfig()
      .then((cfg) => {
        setSavedQuietHours(cfg);
        setDraftQuietHours(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load quiet hours settings'));

    apis.settings
      .getEarningsReminderConfig()
      .then((cfg) => {
        setSavedEarnings(cfg);
        setDraftEarnings(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load earnings alert settings'));

    apis.settings
      .getDividendWatchConfig()
      .then((cfg) => {
        setSavedDividends(cfg);
        setDraftDividends(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load dividend alert settings'));

    apis.settings
      .getIpoReminderConfig()
      .then((cfg) => {
        setSavedIpoReminder(cfg);
        setDraftIpoReminder(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load IPO reminder settings'));

    apis.settings
      .getIpoAnnouncementConfig()
      .then((cfg) => {
        setSavedIpoAnnouncement(cfg);
        setDraftIpoAnnouncement(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load IPO announcement settings'));

    apis.settings
      .getNotificationConfig()
      .then((cfg) => {
        setSavedNotif(cfg);
        setDraftNotif(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load notification settings'));

    apis.settings
      .getTradingSummaryConfig()
      .then((cfg) => {
        setSavedSummary(cfg);
        setDraftSummary(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load trading summary settings'));

    apis.settings
      .getScheduledBackupConfig()
      .then((cfg) => {
        setSavedScheduledBackup(cfg);
        setDraftScheduledBackup(cfg);
      })
      .catch((err) => toast.error(err.message || 'Failed to load scheduled backup settings'));

    apis.settings
      .listBackups()
      .then((list) => setBackups(list))
      .catch((err) => toast.error(err.message || 'Failed to load backups'));
  }, []);

  const isLockDirty =
    JSON.stringify(savedLock) !== JSON.stringify(draftLock) ||
    lockCurrentCode.length > 0 ||
    lockNewCode.length > 0 ||
    lockConfirmCode.length > 0;

  const togglingEnabled = draftLock.enabled !== savedLock.enabled;
  const isEnabling = togglingEnabled && draftLock.enabled;
  const isDisabling = togglingEnabled && !draftLock.enabled;
  const isChangingCode = savedLock.enabled && draftLock.enabled && lockNewCode.length > 0;

  const handleSaveLock = async () => {
    if (isEnabling || isChangingCode) {
      if (!/^\d{6}$/.test(lockNewCode)) {
        toast.error('New code must be 6 digits');
        return;
      }
      if (lockNewCode !== lockConfirmCode) {
        toast.error('New code and confirmation do not match');
        return;
      }
    }
    if ((isDisabling || isChangingCode) && !lockCurrentCode) {
      toast.error('Current code is required');
      return;
    }

    setSavingLock(true);
    try {
      const payload = {
        enabled: draftLock.enabled,
        idleTimeoutMinutes: draftLock.idleTimeoutMinutes,
        ...(isEnabling || isChangingCode ? { code: lockNewCode } : {}),
        ...(savedLock.enabled ? { currentCode: lockCurrentCode } : {}),
      };
      const next = await apis.settings.saveLock(payload);
      setSavedLock(next);
      setDraftLock(next);
      setLockCurrentCode('');
      setLockNewCode('');
      setLockConfirmCode('');
      await refreshStatus();
      toast.success('Security settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save security settings');
    } finally {
      setSavingLock(false);
    }
  };

  const handleResetLock = () => {
    setDraftLock(savedLock);
    setLockCurrentCode('');
    setLockNewCode('');
    setLockConfirmCode('');
  };

  const handleApiHostSave = () => {
    if (!apiHost.trim() || !isApiHostDirty) return;
    LocalStorageUtil.setItem('api_host', apiHost.trim());
    setApiHostSaved(true);
    setTimeout(() => setApiHostSaved(false), 2000);
    toast.success('Backend URL saved — reload the page to apply');
  };

  const handleToggleDemoMode = async (checked: boolean) => {
    setSavingDemoMode(true);
    try {
      const status = await apis.settings.saveDemoMode(checked);
      setDemoModeEnabled(status.enabled);
      toast.success(status.enabled ? 'Demo mode enabled — showing sample data' : 'Demo mode disabled — showing your real data');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update demo mode');
    } finally {
      setSavingDemoMode(false);
    }
  };

  const handleResetDemoData = async () => {
    setResettingDemoData(true);
    try {
      await apis.settings.resetDemoData();
      toast.success('Demo data reset to its original state');
    } catch (err: any) {
      toast.error(err.message || 'Failed to reset demo data');
    } finally {
      setResettingDemoData(false);
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

  const updateDraft = (partial: Partial<AiConfig>) => {
    if (!draftAiConfig) return;
    setDraftAiConfig({ ...draftAiConfig, ...partial });
  };

  const handleSaveAiConfig = () => {
    if (!draftAiConfig || !isAiConfigDirty) return;
    setSaving(true);
    apis.live
      .saveAiConfig(draftAiConfig)
      .then((saved) => {
        setAiConfig(saved);
        setDraftAiConfig(saved);
        toast.success('AI configuration saved');
      })
      .catch((err) => {
        toast.error(err.message || 'Failed to save AI configuration');
      })
      .finally(() => setSaving(false));
  };

  const handleResetAiConfig = () => {
    setDraftAiConfig(aiConfig);
  };

  const handleSaveValueCalc = async () => {
    setSavingValueCalc(true);
    try {
      const saved = await apis.settings.saveValueCalcConfig(draftValueCalc);
      setSavedValueCalc(saved);
      setDraftValueCalc(saved);
      toast.success('Portfolio tracker settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save portfolio tracker settings');
    } finally {
      setSavingValueCalc(false);
    }
  };

  const handleResetValueCalc = () => setDraftValueCalc(savedValueCalc);

  const handleSaveScheduledBackup = async () => {
    setSavingScheduledBackup(true);
    try {
      const saved = await apis.settings.saveScheduledBackupConfig(draftScheduledBackup);
      setSavedScheduledBackup(saved);
      setDraftScheduledBackup(saved);
      toast.success('Scheduled backup settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save scheduled backup settings');
    } finally {
      setSavingScheduledBackup(false);
    }
  };

  const handleResetScheduledBackup = () => setDraftScheduledBackup(savedScheduledBackup);

  const handleRunBackupNow = async () => {
    setBackingUp(true);
    try {
      await apis.settings.runScheduledBackup();
      const list = await apis.settings.listBackups();
      setBackups(list);
      toast.success('Backup created');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create backup');
    } finally {
      setBackingUp(false);
    }
  };

  const handleDownloadBackup = async (file: string) => {
    try {
      const blob = await apis.settings.downloadBackup(file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err.message || 'Failed to download backup');
    }
  };

  const handleSaveAlertMonitor = async () => {
    setSavingAlertMonitor(true);
    try {
      const saved = await apis.settings.saveAlertMonitorConfig(draftAlertMonitor);
      setSavedAlertMonitor(saved);
      setDraftAlertMonitor(saved);
      toast.success('Alert monitor settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save alert monitor settings');
    } finally {
      setSavingAlertMonitor(false);
    }
  };

  const handleResetAlertMonitor = () => setDraftAlertMonitor(savedAlertMonitor);

  const handleSaveMoveAlert = async () => {
    setSavingMoveAlert(true);
    try {
      const saved = await apis.settings.saveMoveAlertConfig(draftMoveAlert);
      setSavedMoveAlert(saved);
      setDraftMoveAlert(saved);
      toast.success('Move alert settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save move alert settings');
    } finally {
      setSavingMoveAlert(false);
    }
  };

  const handleResetMoveAlert = () => setDraftMoveAlert(savedMoveAlert);

  const handleSaveNewsWatch = async () => {
    setSavingNewsWatch(true);
    try {
      const saved = await apis.settings.saveNewsWatchConfig(draftNewsWatch);
      setSavedNewsWatch(saved);
      setDraftNewsWatch(saved);
      toast.success('News alert settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save news alert settings');
    } finally {
      setSavingNewsWatch(false);
    }
  };

  const handleResetNewsWatch = () => setDraftNewsWatch(savedNewsWatch);

  const handleSaveQuietHours = async () => {
    setSavingQuietHours(true);
    try {
      const saved = await apis.settings.saveQuietHoursConfig(draftQuietHours);
      setSavedQuietHours(saved);
      setDraftQuietHours(saved);
      toast.success('Quiet hours saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quiet hours');
    } finally {
      setSavingQuietHours(false);
    }
  };

  const handleResetQuietHours = () => setDraftQuietHours(savedQuietHours);

  const handleFlushQuietHours = async () => {
    setFlushingQuietHours(true);
    try {
      const result = await apis.settings.flushQuietHours();
      if (result.flushed > 0) toast.success(`Sent a digest of ${result.flushed} held notification(s)`);
      else toast.success('Nothing is currently held');
    } catch (err: any) {
      toast.error(err.message || 'Failed to flush held notifications');
    } finally {
      setFlushingQuietHours(false);
    }
  };

  const handleSaveEarnings = async () => {
    setSavingEarnings(true);
    try {
      const saved = await apis.settings.saveEarningsReminderConfig(draftEarnings);
      setSavedEarnings(saved);
      setDraftEarnings(saved);
      toast.success('Earnings alert settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save earnings alert settings');
    } finally {
      setSavingEarnings(false);
    }
  };

  const handleResetEarnings = () => setDraftEarnings(savedEarnings);

  const handleTestEarnings = async () => {
    setTestingEarnings(true);
    try {
      const result = await apis.settings.sendEarningsReminderTest();
      if (result.ok) toast.success('Test earnings alert published to MQTT');
      else toast.error('Earnings alert failed — check the broker connection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test earnings alert');
    } finally {
      setTestingEarnings(false);
    }
  };

  const handleSaveDividends = async () => {
    setSavingDividends(true);
    try {
      const saved = await apis.settings.saveDividendWatchConfig(draftDividends);
      setSavedDividends(saved);
      setDraftDividends(saved);
      toast.success('Dividend alert settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save dividend alert settings');
    } finally {
      setSavingDividends(false);
    }
  };

  const handleResetDividends = () => setDraftDividends(savedDividends);

  const handleTestDividends = async () => {
    setTestingDividends(true);
    try {
      const result = await apis.settings.sendDividendWatchTest();
      if (result.ok) toast.success('Test dividend alert published to MQTT');
      else toast.error('Dividend alert failed — check the broker connection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test dividend alert');
    } finally {
      setTestingDividends(false);
    }
  };

  const handleTestNewsWatch = async () => {
    setTestingNewsWatch(true);
    try {
      const result = await apis.settings.sendNewsWatchTest();
      if (!result.mqttEnabled) toast.error('Enable MQTT publishing first to send news alerts');
      else if (result.ok) toast.success('Test news alert published to MQTT');
      else toast.error('News alert failed — check the broker connection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test news alert');
    } finally {
      setTestingNewsWatch(false);
    }
  };

  const handleSaveIpoReminder = async () => {
    setSavingIpoReminder(true);
    try {
      const saved = await apis.settings.saveIpoReminderConfig(draftIpoReminder);
      setSavedIpoReminder(saved);
      setDraftIpoReminder(saved);
      toast.success('IPO reminder settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save IPO reminder settings');
    } finally {
      setSavingIpoReminder(false);
    }
  };

  const handleResetIpoReminder = () => setDraftIpoReminder(savedIpoReminder);

  const handleSaveIpoAnnouncement = async () => {
    setSavingIpoAnnouncement(true);
    try {
      const saved = await apis.settings.saveIpoAnnouncementConfig(draftIpoAnnouncement);
      setSavedIpoAnnouncement(saved);
      setDraftIpoAnnouncement(saved);
      toast.success('IPO announcement settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save IPO announcement settings');
    } finally {
      setSavingIpoAnnouncement(false);
    }
  };

  const handleResetIpoAnnouncement = () => setDraftIpoAnnouncement(savedIpoAnnouncement);

  const handleTestIpoAnnouncement = async () => {
    setTestingIpoAnnouncement(true);
    try {
      const result = await apis.settings.testIpoAnnouncement();
      if (!result.mqttEnabled) toast.error('Enable MQTT publishing first to send announcements');
      else if (result.ok) toast.success('Test IPO announcement published to MQTT');
      else toast.error('Announcement failed — check the broker connection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send IPO announcement');
    } finally {
      setTestingIpoAnnouncement(false);
    }
  };

  const handleSaveNotif = async () => {
    setSavingNotif(true);
    try {
      const saved = await apis.settings.saveNotificationConfig(draftNotif);
      setSavedNotif(saved);
      setDraftNotif(saved);
      toast.success('Notification settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save notification settings');
    } finally {
      setSavingNotif(false);
    }
  };

  const handleResetNotif = () => setDraftNotif(savedNotif);

  const handleTestNotif = async () => {
    setTestingNotif(true);
    try {
      const result = await apis.settings.testNotification();
      if (result.mqtt.ok) toast.success('Test notification published to MQTT');
      else toast.error(result.mqtt.error || 'Test notification failed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test notification');
    } finally {
      setTestingNotif(false);
    }
  };

  const handleSaveSummary = async () => {
    setSavingSummary(true);
    try {
      const saved = await apis.settings.saveTradingSummaryConfig(draftSummary);
      setSavedSummary(saved);
      setDraftSummary(saved);
      toast.success('Trading summary settings saved');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save trading summary settings');
    } finally {
      setSavingSummary(false);
    }
  };

  const handleResetSummary = () => setDraftSummary(savedSummary);

  const handleTestSummary = async () => {
    setTestingSummary(true);
    try {
      const result = await apis.settings.testTradingSummary();
      if (!result.mqttEnabled) toast.error('Enable MQTT publishing first to send summaries');
      else if (result.published > 0) toast.success(`Published ${result.published} summary message(s) to MQTT`);
      else toast.error('No summaries published — add holdings or check the broker connection');
    } catch (err: any) {
      toast.error(err.message || 'Failed to send trading summary');
    } finally {
      setTestingSummary(false);
    }
  };

  const handleAddAccount = async () => {
    const name = newAccountName.trim();
    if (!name) return;
    setAddingAccount(true);
    try {
      const created = await apis.accounts.create({
        name,
        id: name.replace(/\s/g, ''),
      } as IAccount);
      setAccounts((prev) => [...prev, created]);
      setNewAccountName('');
      toast.success(`Account "${name}" created`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create account');
    } finally {
      setAddingAccount(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteConfirm) return;
    try {
      await apis.accounts.deleteById(deleteConfirm.id);
      setAccounts((prev) => prev.filter((a) => a.id !== deleteConfirm.id));
      toast.success(`Account "${deleteConfirm.name}" deleted`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete account');
    } finally {
      setDeleteConfirm(null);
    }
  };

  return (
    <Box sx={{ maxWidth: { xs: '100%', md: 960 } }}>
      <PageHeader title="Settings" subtitle="Accounts, appearance, integrations and backups" />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 4 }} sx={{ alignItems: 'flex-start' }}>
        <Tabs
          orientation={isDesktop ? 'vertical' : 'horizontal'}
          variant={isDesktop ? 'standard' : 'scrollable'}
          scrollButtons={false}
          value={category}
          onChange={(_, val) => setCategory(val)}
          sx={{
            flexShrink: 0,
            width: { xs: '100%', md: 210 },
            position: { md: 'sticky' },
            top: { md: 16 },
            borderRight: { md: '1px solid' },
            borderColor: { md: 'divider' },
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontSize: '0.82rem',
              fontWeight: 500,
              justifyContent: { md: 'flex-start' },
            },
          }}
        >
          {CATEGORIES.map((c) => (
            <Tab
              key={c.id}
              value={c.id}
              iconPosition="start"
              icon={<Iconify icon={c.icon} width={18} />}
              label={c.label}
            />
          ))}
        </Tabs>

        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%', maxWidth: { md: 680 } }}>
          {category === 'general' && (
            <>
              <SettingsSection title="Appearance">
                <SettingRow label="Theme" description="Follow system appearance or set manually">
                  <ToggleButtonGroup
                    size="small"
                    value={mode}
                    exclusive
                    onChange={(_, val) => {
                      if (val) setMode(val);
                    }}
                  >
                    <ToggleButton value="system" sx={{ px: 2, fontSize: '0.78rem' }}>
                      System
                    </ToggleButton>
                    <ToggleButton value="dark" sx={{ px: 2, fontSize: '0.78rem' }}>
                      Dark
                    </ToggleButton>
                    <ToggleButton value="light" sx={{ px: 2, fontSize: '0.78rem' }}>
                      Light
                    </ToggleButton>
                  </ToggleButtonGroup>
                </SettingRow>

                <SettingRow label="Density" description="Row height and card padding across tables and lists">
                  <ToggleButtonGroup
                    size="small"
                    value={density}
                    exclusive
                    onChange={(_, val) => {
                      if (val) setDensity(val);
                    }}
                    aria-label="Interface density"
                  >
                    <ToggleButton value="comfortable" sx={{ px: 2, fontSize: '0.78rem' }}>
                      Comfortable
                    </ToggleButton>
                    <ToggleButton value="compact" sx={{ px: 2, fontSize: '0.78rem' }}>
                      Compact
                    </ToggleButton>
                  </ToggleButtonGroup>
                </SettingRow>
              </SettingsSection>

              <SettingsSection title="Dashboard">
                <SettingRow
                  label="Price Alert Threshold"
                  description="Show 'Near Target' badge when price is within this % of target"
                >
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <TextField
                      size="small"
                      type="number"
                      value={draftThreshold}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(50, Number(e.target.value)));
                        setDraftThreshold(val);
                      }}
                      slotProps={{ htmlInput: { min: 1, max: 50 } }}
                      sx={{ width: 80, '& input': { fontSize: '0.82rem' } }}
                    />
                    <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>%</Typography>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveThreshold}
                      disabled={!isThresholdDirty}
                      sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                    >
                      Save
                    </Button>
                  </Stack>
                </SettingRow>
                {notificationsSupported() && (
                  <SettingRow
                    label="Browser Price Alerts"
                    description="Send a desktop notification when a holding reaches or nears its target price (stays on this device)"
                  >
                    <Switch checked={notificationsOn} onChange={(_, checked) => handleToggleNotifications(checked)} />
                  </SettingRow>
                )}
                <SettingRow label="Default Rows Per Page" description="Number of holdings shown per page">
                  <Typography
                    sx={{
                      fontSize: '0.82rem',
                      color: 'text.secondary',
                      fontWeight: 600,
                    }}
                  >
                    50
                  </Typography>
                </SettingRow>
              </SettingsSection>

              <SettingsSection title="API">
                <SettingRow
                  label="Backend URL"
                  description="Override the backend API host. Requires page reload to take effect."
                >
                  <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    {apiHostSaved && <Typography sx={{ fontSize: '0.72rem', color: 'success.main' }}>Saved</Typography>}
                    <TextField
                      size="small"
                      value={apiHost}
                      onChange={(e) => setApiHost(e.target.value)}
                      sx={{ width: { xs: '100%', sm: 240 }, '& input': { fontSize: '0.78rem' } }}
                    />
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleApiHostSave}
                      disabled={!isApiHostDirty || !apiHost.trim()}
                      sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                    >
                      Save
                    </Button>
                  </Stack>
                </SettingRow>
              </SettingsSection>

              <SettingsSection title="About">
                <SettingRow label="Application" description="Portfolio Dashboard">
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>v{__APP_VERSION__}</Typography>
                </SettingRow>
                <SettingRow label="Data Provider" description="Real-time market data">
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>Finnhub + NASDAQ</Typography>
                </SettingRow>
                <SettingRow label="Charts" description="Charting libraries">
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.disabled' }}>ApexCharts + MUI X</Typography>
                </SettingRow>
              </SettingsSection>
            </>
          )}

          {category === 'accounts' && (
            <>
              <SettingsSection title="Accounts">
                {accounts.length === 0 ? (
                  <Stack sx={{ alignItems: 'center', py: 3 }}>
                    <Iconify icon="mdi:account-group-outline" width={28} sx={{ color: 'text.disabled', mb: 1 }} />
                    <Typography
                      sx={{
                        fontSize: '0.82rem',
                        color: 'text.disabled',
                        textAlign: 'center',
                      }}
                    >
                      No accounts yet. Create one to start adding holdings.
                    </Typography>
                  </Stack>
                ) : (
                  accounts.map((account) => (
                    <Stack
                      key={account.id}
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 1,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
                        <Iconify icon="mdi:account-outline" width={18} sx={{ color: 'text.secondary' }} />
                        <Box>
                          <Typography
                            sx={{
                              fontSize: '0.85rem',
                              fontWeight: 500,
                              color: 'text.primary',
                            }}
                          >
                            {account.name}
                          </Typography>
                          <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>{account.id}</Typography>
                        </Box>
                      </Stack>
                      <Tooltip title="Delete account">
                        <IconButton
                          size="small"
                          onClick={() => setDeleteConfirm(account)}
                          sx={{
                            color: 'text.disabled',
                            '&:hover': { color: 'error.main' },
                          }}
                        >
                          <Iconify icon="mdi:delete-outline" width={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))
                )}

                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', px: 2, py: 1.5 }}>
                  <TextField
                    size="small"
                    placeholder="Account name"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddAccount();
                    }}
                    disabled={addingAccount}
                    sx={{ flexGrow: 1, '& input': { fontSize: '0.78rem' } }}
                  />
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleAddAccount}
                    disabled={!newAccountName.trim() || addingAccount}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {addingAccount ? 'Adding...' : 'Add'}
                  </Button>
                </Stack>
              </SettingsSection>
            </>
          )}

          {category === 'portfolio' && (
            <>
              <SettingsSection title="Portfolio Value Tracker">
                <SettingRow
                  label="Enable Auto-Tracking"
                  description="Automatically record portfolio value during market hours (Mon–Fri 9:30 AM – 4:00 PM ET)"
                >
                  <Switch
                    checked={draftValueCalc.enabled}
                    onChange={(_, checked) => setDraftValueCalc((prev) => ({ ...prev, enabled: checked }))}
                  />
                </SettingRow>
                {draftValueCalc.enabled && (
                  <SettingRow
                    label="Update Interval"
                    description="How often to recalculate and save the portfolio value"
                  >
                    <Select
                      size="small"
                      value={draftValueCalc.intervalMinutes}
                      onChange={(e) =>
                        setDraftValueCalc((prev) => ({
                          ...prev,
                          intervalMinutes: Number(e.target.value),
                        }))
                      }
                      sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                    >
                      <MenuItem value={5}>Every 5 minutes</MenuItem>
                      <MenuItem value={10}>Every 10 minutes</MenuItem>
                      <MenuItem value={15}>Every 15 minutes</MenuItem>
                      <MenuItem value={30}>Every 30 minutes</MenuItem>
                      <MenuItem value={60}>Every 60 minutes</MenuItem>
                      <MenuItem value={120}>Every 2 hours</MenuItem>
                      <MenuItem value={240}>Every 4 hours</MenuItem>
                    </Select>
                  </SettingRow>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isValueCalcDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetValueCalc}
                    disabled={!isValueCalcDirty || savingValueCalc}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveValueCalc}
                    disabled={!isValueCalcDirty || savingValueCalc}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingValueCalc ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>
            </>
          )}

          {category === 'alerts' && (
            <>
              <SettingsSection title="Price Alert Monitor">
                <SettingRow
                  label="Enable Background Monitoring"
                  description="Continuously check your alerts on the server. Stock alerts are evaluated only during US market hours (Mon–Fri 9:30 AM – 4:00 PM ET, excluding holidays); crypto alerts are checked 24/7."
                >
                  <Switch
                    checked={draftAlertMonitor.enabled}
                    onChange={(_, checked) => setDraftAlertMonitor((prev) => ({ ...prev, enabled: checked }))}
                  />
                </SettingRow>
                {draftAlertMonitor.enabled && (
                  <SettingRow
                    label="Check Interval"
                    description="How often the server polls live prices to evaluate alerts"
                  >
                    <Select
                      size="small"
                      value={draftAlertMonitor.intervalMinutes}
                      onChange={(e) =>
                        setDraftAlertMonitor((prev) => ({
                          ...prev,
                          intervalMinutes: Number(e.target.value),
                        }))
                      }
                      sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                    >
                      <MenuItem value={1}>Every minute</MenuItem>
                      <MenuItem value={5}>Every 5 minutes</MenuItem>
                      <MenuItem value={10}>Every 10 minutes</MenuItem>
                      <MenuItem value={15}>Every 15 minutes</MenuItem>
                      <MenuItem value={30}>Every 30 minutes</MenuItem>
                      <MenuItem value={60}>Every 60 minutes</MenuItem>
                    </Select>
                  </SettingRow>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isAlertMonitorDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetAlertMonitor}
                    disabled={!isAlertMonitorDirty || savingAlertMonitor}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveAlertMonitor}
                    disabled={!isAlertMonitorDirty || savingAlertMonitor}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingAlertMonitor ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Move Alerts">
                <SettingRow
                  label="Enable Move Alerts"
                  description="Notify when a holding or your total portfolio makes a big move. Escalates as a move grows, and can keep watching outside US market hours."
                >
                  <Switch checked={draftMoveAlert.enabled} onChange={(_, checked) => setMoveAlert({ enabled: checked })} />
                </SettingRow>
                {draftMoveAlert.enabled && (
                  <>
                    <SettingRow
                      label="Check Interval"
                      description="How often the server checks holdings and portfolio total for a threshold-crossing move"
                    >
                      <Select
                        size="small"
                        value={draftMoveAlert.intervalMinutes}
                        onChange={(e) => setMoveAlert({ intervalMinutes: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={1}>Every minute</MenuItem>
                        <MenuItem value={5}>Every 5 minutes</MenuItem>
                        <MenuItem value={10}>Every 10 minutes</MenuItem>
                        <MenuItem value={15}>Every 15 minutes</MenuItem>
                        <MenuItem value={30}>Every 30 minutes</MenuItem>
                        <MenuItem value={60}>Every 60 minutes</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Move Threshold (%)" description="The day move that triggers the first alert">
                      <TextField
                        size="small"
                        type="number"
                        value={draftMoveAlert.thresholdPercent}
                        onChange={(e) => setMoveAlert({ thresholdPercent: Number(e.target.value) })}
                        slotProps={{ htmlInput: { min: 0.1, step: 0.1 } }}
                        sx={{ width: { xs: '100%', sm: 160 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Escalation Step (%)"
                      description="Alert again each time the move grows by this much beyond the last alert. Set to 0 to alert only once per day."
                    >
                      <TextField
                        size="small"
                        type="number"
                        value={draftMoveAlert.escalationStepPercent}
                        onChange={(e) => setMoveAlert({ escalationStepPercent: Number(e.target.value) })}
                        slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                        sx={{ width: { xs: '100%', sm: 160 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Spike Threshold (%)"
                      description="Alert when a holding moves this much inside the spike window, even if its day change is small. Set to 0 to disable."
                    >
                      <TextField
                        size="small"
                        type="number"
                        value={draftMoveAlert.spikePercent}
                        onChange={(e) => setMoveAlert({ spikePercent: Number(e.target.value) })}
                        slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                        sx={{ width: { xs: '100%', sm: 160 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow label="Spike Window" description="The rolling window a spike is measured over">
                      <Select
                        size="small"
                        value={draftMoveAlert.spikeWindowMinutes}
                        onChange={(e) => setMoveAlert({ spikeWindowMinutes: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={10}>10 minutes</MenuItem>
                        <MenuItem value={15}>15 minutes</MenuItem>
                        <MenuItem value={30}>30 minutes</MenuItem>
                        <MenuItem value={60}>60 minutes</MenuItem>
                        <MenuItem value={120}>2 hours</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Watch Crypto 24/7"
                      description="Keep evaluating crypto holdings around the clock, not just during US market hours"
                    >
                      <Switch
                        checked={draftMoveAlert.cryptoAlwaysOn}
                        onChange={(_, checked) => setMoveAlert({ cryptoAlwaysOn: checked })}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Cover After Hours"
                      description="Keep evaluating stocks once the session closes, so a move that landed at the close still reaches you"
                    >
                      <Switch
                        checked={draftMoveAlert.includeAfterHours}
                        onChange={(_, checked) => setMoveAlert({ includeAfterHours: checked })}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isMoveAlertDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetMoveAlert}
                    disabled={!isMoveAlertDirty || savingMoveAlert}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveMoveAlert}
                    disabled={!isMoveAlertDirty || savingMoveAlert}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingMoveAlert ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Breaking News Alerts">
                <SettingRow
                  label="Enable News Alerts"
                  description="Watch company news for the tickers you hold plus the broad market wire, and push new headlines as they land. Runs around the clock — news breaks overnight and at weekends. Only public headlines are sent."
                >
                  <Switch
                    checked={draftNewsWatch.enabled}
                    onChange={(_, checked) => setNewsWatch({ enabled: checked })}
                  />
                </SettingRow>
                {draftNewsWatch.enabled && (
                  <>
                    <SettingRow label="Check Interval" description="How often the server polls for new headlines">
                      <Select
                        size="small"
                        value={draftNewsWatch.intervalMinutes}
                        onChange={(e) => setNewsWatch({ intervalMinutes: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={5}>Every 5 minutes</MenuItem>
                        <MenuItem value={10}>Every 10 minutes</MenuItem>
                        <MenuItem value={15}>Every 15 minutes</MenuItem>
                        <MenuItem value={30}>Every 30 minutes</MenuItem>
                        <MenuItem value={60}>Every 60 minutes</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Watch Your Holdings"
                      description="Poll company news for every stock ticker you hold"
                    >
                      <Switch
                        checked={draftNewsWatch.watchHoldings}
                        onChange={(_, checked) => setNewsWatch({ watchHoldings: checked })}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Watch Market Headlines"
                      description="Include the broad market wire, tagged with one of your holdings when a story names it"
                    >
                      <Switch
                        checked={draftNewsWatch.watchMarket}
                        onChange={(_, checked) => setNewsWatch({ watchMarket: checked })}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Breaking Only"
                      description="Only push headlines that match a market-moving pattern — halts, guidance, downgrades, M&A, lawsuits, big price moves. Turn off to get every new headline."
                    >
                      <Switch
                        checked={draftNewsWatch.breakingOnly}
                        onChange={(_, checked) => setNewsWatch({ breakingOnly: checked })}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Max Alerts Per Check"
                      description="Ceiling on notifications per cycle, so a busy news hour cannot flood you"
                    >
                      <TextField
                        size="small"
                        type="number"
                        value={draftNewsWatch.maxPerRun}
                        onChange={(e) => setNewsWatch({ maxPerRun: Number(e.target.value) })}
                        slotProps={{ htmlInput: { min: 1, max: 25, step: 1 } }}
                        sx={{ width: { xs: '100%', sm: 160 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow
                      label="Lookback Window"
                      description="Ignore anything published longer ago than this, so a restart delivers recent news rather than a backlog"
                    >
                      <Select
                        size="small"
                        value={draftNewsWatch.lookbackHours}
                        onChange={(e) => setNewsWatch({ lookbackHours: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={1}>Last hour</MenuItem>
                        <MenuItem value={3}>Last 3 hours</MenuItem>
                        <MenuItem value={6}>Last 6 hours</MenuItem>
                        <MenuItem value={12}>Last 12 hours</MenuItem>
                        <MenuItem value={24}>Last 24 hours</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow label="MQTT Topic" description="Topic news alerts are published to">
                      <TextField
                        size="small"
                        value={draftNewsWatch.topic}
                        onChange={(e) => setNewsWatch({ topic: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 320 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isNewsWatchDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestNewsWatch}
                    disabled={!savedNotif.mqtt.enabled || isNewsWatchDirty || testingNewsWatch}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingNewsWatch ? 'Sending...' : 'Send now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetNewsWatch}
                    disabled={!isNewsWatchDirty || savingNewsWatch}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveNewsWatch}
                    disabled={!isNewsWatchDirty || savingNewsWatch}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingNewsWatch ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Earnings Alerts">
                <SettingRow
                  label="Enable Earnings Alerts"
                  description="Tell you ahead of time when a company you hold is about to report, then follow up with the actual numbers against consensus."
                >
                  <Switch checked={draftEarnings.enabled} onChange={(_, checked) => setEarnings({ enabled: checked })} />
                </SettingRow>
                {draftEarnings.enabled && (
                  <>
                    <SettingRow label="Notify Ahead" description="How far in advance of the report to warn you">
                      <Select
                        size="small"
                        value={draftEarnings.daysBefore}
                        onChange={(e) => setEarnings({ daysBefore: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={0}>On the day</MenuItem>
                        <MenuItem value={1}>1 day before</MenuItem>
                        <MenuItem value={2}>2 days before</MenuItem>
                        <MenuItem value={3}>3 days before</MenuItem>
                        <MenuItem value={7}>1 week before</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Follow Up With Results"
                      description="Send a second alert once the actual EPS lands, with the beat or miss against consensus"
                    >
                      <Switch
                        checked={draftEarnings.notifyResults}
                        onChange={(_, checked) => setEarnings({ notifyResults: checked })}
                      />
                    </SettingRow>
                    <SettingRow label="MQTT Topic" description="Topic earnings alerts are published to">
                      <TextField
                        size="small"
                        value={draftEarnings.topic}
                        onChange={(e) => setEarnings({ topic: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 320 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isEarningsDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestEarnings}
                    disabled={!savedNotif.mqtt.enabled || isEarningsDirty || testingEarnings}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingEarnings ? 'Sending...' : 'Send now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetEarnings}
                    disabled={!isEarningsDirty || savingEarnings}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveEarnings}
                    disabled={!isEarningsDirty || savingEarnings}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingEarnings ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Dividend Alerts">
                <SettingRow
                  label="Enable Dividend Alerts"
                  description="Notify ahead of an ex-dividend date or a payment on the stocks you hold, with the amount you can expect."
                >
                  <Switch
                    checked={draftDividends.enabled}
                    onChange={(_, checked) => setDividends({ enabled: checked })}
                  />
                </SettingRow>
                {draftDividends.enabled && (
                  <>
                    <SettingRow label="Notify Ahead" description="How far in advance of the date to notify you">
                      <Select
                        size="small"
                        value={draftDividends.daysBefore}
                        onChange={(e) => setDividends({ daysBefore: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={0}>On the day</MenuItem>
                        <MenuItem value={1}>1 day before</MenuItem>
                        <MenuItem value={2}>2 days before</MenuItem>
                        <MenuItem value={3}>3 days before</MenuItem>
                        <MenuItem value={7}>1 week before</MenuItem>
                        <MenuItem value={14}>2 weeks before</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Ex-Dividend Dates"
                      description="Owning through the ex-date is what earns the payment, so this is the one worth knowing in advance"
                    >
                      <Switch
                        checked={draftDividends.notifyExDate}
                        onChange={(_, checked) => setDividends({ notifyExDate: checked })}
                      />
                    </SettingRow>
                    <SettingRow label="Payment Dates" description="Notify when the cash actually lands">
                      <Switch
                        checked={draftDividends.notifyPayment}
                        onChange={(_, checked) => setDividends({ notifyPayment: checked })}
                      />
                    </SettingRow>
                    <SettingRow label="MQTT Topic" description="Topic dividend alerts are published to">
                      <TextField
                        size="small"
                        value={draftDividends.topic}
                        onChange={(e) => setDividends({ topic: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 320 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isDividendsDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestDividends}
                    disabled={!savedNotif.mqtt.enabled || isDividendsDirty || testingDividends}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingDividends ? 'Sending...' : 'Send now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetDividends}
                    disabled={!isDividendsDirty || savingDividends}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveDividends}
                    disabled={!isDividendsDirty || savingDividends}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingDividends ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Quiet Hours">
                <SettingRow
                  label="Enable Quiet Hours"
                  description="Hold back alerts overnight. Scheduled trading summaries and test sends always go through."
                >
                  <Switch
                    checked={draftQuietHours.enabled}
                    onChange={(_, checked) => setQuietHours({ enabled: checked })}
                  />
                </SettingRow>
                {draftQuietHours.enabled && (
                  <>
                    <SettingRow label="Quiet From" description="Start of the quiet window, US Eastern time">
                      <Select
                        size="small"
                        value={draftQuietHours.startHour}
                        onChange={(e) => setQuietHours({ startHour: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 160 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={0}>00:00</MenuItem>
                        <MenuItem value={1}>01:00</MenuItem>
                        <MenuItem value={2}>02:00</MenuItem>
                        <MenuItem value={3}>03:00</MenuItem>
                        <MenuItem value={4}>04:00</MenuItem>
                        <MenuItem value={5}>05:00</MenuItem>
                        <MenuItem value={6}>06:00</MenuItem>
                        <MenuItem value={7}>07:00</MenuItem>
                        <MenuItem value={8}>08:00</MenuItem>
                        <MenuItem value={9}>09:00</MenuItem>
                        <MenuItem value={10}>10:00</MenuItem>
                        <MenuItem value={11}>11:00</MenuItem>
                        <MenuItem value={12}>12:00</MenuItem>
                        <MenuItem value={13}>13:00</MenuItem>
                        <MenuItem value={14}>14:00</MenuItem>
                        <MenuItem value={15}>15:00</MenuItem>
                        <MenuItem value={16}>16:00</MenuItem>
                        <MenuItem value={17}>17:00</MenuItem>
                        <MenuItem value={18}>18:00</MenuItem>
                        <MenuItem value={19}>19:00</MenuItem>
                        <MenuItem value={20}>20:00</MenuItem>
                        <MenuItem value={21}>21:00</MenuItem>
                        <MenuItem value={22}>22:00</MenuItem>
                        <MenuItem value={23}>23:00</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Quiet Until" description="End of the quiet window, US Eastern time">
                      <Select
                        size="small"
                        value={draftQuietHours.endHour}
                        onChange={(e) => setQuietHours({ endHour: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 160 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={0}>00:00</MenuItem>
                        <MenuItem value={1}>01:00</MenuItem>
                        <MenuItem value={2}>02:00</MenuItem>
                        <MenuItem value={3}>03:00</MenuItem>
                        <MenuItem value={4}>04:00</MenuItem>
                        <MenuItem value={5}>05:00</MenuItem>
                        <MenuItem value={6}>06:00</MenuItem>
                        <MenuItem value={7}>07:00</MenuItem>
                        <MenuItem value={8}>08:00</MenuItem>
                        <MenuItem value={9}>09:00</MenuItem>
                        <MenuItem value={10}>10:00</MenuItem>
                        <MenuItem value={11}>11:00</MenuItem>
                        <MenuItem value={12}>12:00</MenuItem>
                        <MenuItem value={13}>13:00</MenuItem>
                        <MenuItem value={14}>14:00</MenuItem>
                        <MenuItem value={15}>15:00</MenuItem>
                        <MenuItem value={16}>16:00</MenuItem>
                        <MenuItem value={17}>17:00</MenuItem>
                        <MenuItem value={18}>18:00</MenuItem>
                        <MenuItem value={19}>19:00</MenuItem>
                        <MenuItem value={20}>20:00</MenuItem>
                        <MenuItem value={21}>21:00</MenuItem>
                        <MenuItem value={22}>22:00</MenuItem>
                        <MenuItem value={23}>23:00</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="What To Do"
                      description="Hold everything and send one summary when the window ends, or drop it entirely"
                    >
                      <Select
                        size="small"
                        value={draftQuietHours.mode}
                        onChange={(e) => setQuietHours({ mode: e.target.value as QuietHoursConfig['mode'] })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value="digest">Hold and send a digest</MenuItem>
                        <MenuItem value="suppress">Drop them</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Let Big Moves Through"
                      description="A move past the threshold below still wakes you during quiet hours"
                    >
                      <Switch
                        checked={draftQuietHours.allowCritical}
                        onChange={(_, checked) => setQuietHours({ allowCritical: checked })}
                      />
                    </SettingRow>
                    {draftQuietHours.allowCritical && (
                      <SettingRow
                        label="Wake Me Threshold (%)"
                        description="Move size that overrides quiet hours"
                      >
                        <TextField
                          size="small"
                          type="number"
                          value={draftQuietHours.criticalThresholdPercent}
                          onChange={(e) => setQuietHours({ criticalThresholdPercent: Number(e.target.value) })}
                          slotProps={{ htmlInput: { min: 0.1, step: 0.5 } }}
                          sx={{ width: { xs: '100%', sm: 160 }, '& input': { fontSize: '0.78rem' } }}
                        />
                      </SettingRow>
                    )}
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isQuietHoursDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleFlushQuietHours}
                    disabled={!savedNotif.mqtt.enabled || flushingQuietHours}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {flushingQuietHours ? 'Sending...' : 'Send held now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetQuietHours}
                    disabled={!isQuietHoursDirty || savingQuietHours}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveQuietHours}
                    disabled={!isQuietHoursDirty || savingQuietHours}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingQuietHours ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Alert Notifications">
                <SettingRow
                  label="MQTT Publishing"
                  description="Publish triggered alerts to an MQTT broker (e.g. for Home Assistant to turn into mobile notifications). Only public data — ticker, price, target — is sent."
                >
                  <Switch checked={draftNotif.mqtt.enabled} onChange={(_, checked) => setMqtt({ enabled: checked })} />
                </SettingRow>
                {draftNotif.mqtt.enabled && (
                  <>
                    <SettingRow label="Broker URL" description="e.g. mqtt://homeassistant.local:1883">
                      <TextField
                        size="small"
                        value={draftNotif.mqtt.url}
                        onChange={(e) => setMqtt({ url: e.target.value })}
                        placeholder="mqtt://host:1883"
                        sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow label="Username" description="Leave blank for anonymous brokers">
                      <TextField
                        size="small"
                        value={draftNotif.mqtt.username}
                        onChange={(e) => setMqtt({ username: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow label="Password" description="Stored on the server; sent masked back to this page">
                      <TextField
                        size="small"
                        type="password"
                        value={draftNotif.mqtt.password}
                        onChange={(e) => setMqtt({ password: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow label="Topic" description="Topic alerts are published to">
                      <TextField
                        size="small"
                        value={draftNotif.mqtt.topic}
                        onChange={(e) => setMqtt({ topic: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                    <SettingRow label="QoS" description="Delivery guarantee (1 = at least once)">
                      <Select
                        size="small"
                        value={draftNotif.mqtt.qos}
                        onChange={(e) => setMqtt({ qos: Number(e.target.value) as 0 | 1 })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={0}>0 — at most once</MenuItem>
                        <MenuItem value={1}>1 — at least once</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Retain" description="Broker keeps the last message for new subscribers">
                      <Switch
                        checked={draftNotif.mqtt.retain}
                        onChange={(_, checked) => setMqtt({ retain: checked })}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isNotifDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestNotif}
                    disabled={!savedNotif.mqtt.enabled || isNotifDirty || testingNotif}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingNotif ? 'Sending...' : 'Send test'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetNotif}
                    disabled={!isNotifDirty || savingNotif}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveNotif}
                    disabled={!isNotifDirty || savingNotif}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingNotif ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="Daily Trading Summary">
                <SettingRow
                  label="Daily Summary Notifications"
                  description="Publish three daily summaries to MQTT on each trading day (morning ~9:35, midday 12:30, and at market close ET): how the market moved, today's profit/loss per account, and how your largest holdings moved. Personal P&L is sent only to your own broker configured under Alert Notifications."
                >
                  <Switch checked={draftSummary.enabled} onChange={(_, checked) => setSummary({ enabled: checked })} />
                </SettingRow>
                {draftSummary.enabled && (
                  <>
                    <SettingRow
                      label="Majority Holdings"
                      description="How many of your largest holdings (by market value) to report movement for"
                    >
                      <Select
                        size="small"
                        value={draftSummary.topHoldingsCount}
                        onChange={(e) => setSummary({ topHoldingsCount: Number(e.target.value) })}
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={3}>Top 3 holdings</MenuItem>
                        <MenuItem value={5}>Top 5 holdings</MenuItem>
                        <MenuItem value={10}>Top 10 holdings</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow
                      label="Topic"
                      description="Base MQTT topic. Each summary publishes to a subtopic — <topic>/market, <topic>/pnl, <topic>/holdings — so subscribe to <topic>/# to receive all three."
                    >
                      <TextField
                        size="small"
                        value={draftSummary.topic}
                        onChange={(e) => setSummary({ topic: e.target.value })}
                        sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                      />
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isSummaryDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestSummary}
                    disabled={!savedNotif.mqtt.enabled || isSummaryDirty || testingSummary}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingSummary ? 'Sending...' : 'Send now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetSummary}
                    disabled={!isSummaryDirty || savingSummary}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveSummary}
                    disabled={!isSummaryDirty || savingSummary}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingSummary ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="IPO Reminders">
                <SettingRow
                  label="Enable IPO Reminders"
                  description="Get an MQTT reminder as the listing date approaches for any IPO you mark as watched on the IPO Calendar page."
                >
                  <Switch
                    checked={draftIpoReminder.enabled}
                    onChange={(_, checked) => setDraftIpoReminder((prev) => ({ ...prev, enabled: checked }))}
                  />
                </SettingRow>
                {draftIpoReminder.enabled && (
                  <SettingRow label="Remind Me" description="How far ahead of the expected IPO date to send the reminder">
                    <Select
                      size="small"
                      value={draftIpoReminder.daysBefore}
                      onChange={(e) =>
                        setDraftIpoReminder((prev) => ({ ...prev, daysBefore: Number(e.target.value) }))
                      }
                      sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                    >
                      <MenuItem value={0}>On the day</MenuItem>
                      <MenuItem value={1}>1 day before</MenuItem>
                      <MenuItem value={2}>2 days before</MenuItem>
                      <MenuItem value={3}>3 days before</MenuItem>
                      <MenuItem value={7}>1 week before</MenuItem>
                    </Select>
                  </SettingRow>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isIpoReminderDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetIpoReminder}
                    disabled={!isIpoReminderDirty || savingIpoReminder}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveIpoReminder}
                    disabled={!isIpoReminderDirty || savingIpoReminder}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingIpoReminder ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>

              <SettingsSection title="IPO Announcements">
                <SettingRow
                  label="Announce New IPOs"
                  description="Publish an MQTT message whenever a new company appears on the IPO calendar, with its symbol, name, expected listing date, exchange, and offering details. Public market data only."
                >
                  <Switch
                    checked={draftIpoAnnouncement.enabled}
                    onChange={(_, checked) => setIpoAnnouncement({ enabled: checked })}
                  />
                </SettingRow>
                {draftIpoAnnouncement.enabled && (
                  <SettingRow label="Topic" description="MQTT topic new-IPO announcements are published to">
                    <TextField
                      size="small"
                      value={draftIpoAnnouncement.topic}
                      onChange={(e) => setIpoAnnouncement({ topic: e.target.value })}
                      sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                    />
                  </SettingRow>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isIpoAnnouncementDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleTestIpoAnnouncement}
                    disabled={!savedNotif.mqtt.enabled || isIpoAnnouncementDirty || testingIpoAnnouncement}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {testingIpoAnnouncement ? 'Sending...' : 'Send now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetIpoAnnouncement}
                    disabled={!isIpoAnnouncementDirty || savingIpoAnnouncement}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveIpoAnnouncement}
                    disabled={!isIpoAnnouncementDirty || savingIpoAnnouncement}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingIpoAnnouncement ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>
            </>
          )}

          {category === 'data' && (
            <>
              <SettingsSection title="Demo Mode">
                <SettingRow
                  label="Show Sample Data"
                  description="Switch the whole app to a bundled set of sample accounts, holdings and transactions so you can show it off without exposing your real portfolio. A 'Mock Data' badge appears on every page while this is on; your real data is untouched and returns the moment you switch it off."
                >
                  <Switch
                    checked={demoModeEnabled}
                    onChange={(_, checked) => handleToggleDemoMode(checked)}
                    disabled={savingDemoMode}
                  />
                </SettingRow>
                {demoModeEnabled && (
                  <SettingRow
                    label="Reset Demo Data"
                    description="Restore the bundled sample accounts, holdings and transactions to their original state"
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetDemoData}
                      disabled={resettingDemoData}
                      sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                    >
                      {resettingDemoData ? 'Resetting...' : 'Reset Demo Data'}
                    </Button>
                  </SettingRow>
                )}
              </SettingsSection>

              <SettingsSection title="Data">
                <SettingRow label="Export Database" description="Download a zip backup of all your portfolio data">
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
                <SettingRow label="Import Database" description="Restore from a previously exported zip backup">
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

              <SettingsSection title="Scheduled Backups">
                <SettingRow
                  label="Enable Automatic Backups"
                  description="Periodically zip your data to the server's backups folder, keeping the most recent copies"
                >
                  <Switch
                    checked={draftScheduledBackup.enabled}
                    onChange={(_, checked) => setDraftScheduledBackup((prev) => ({ ...prev, enabled: checked }))}
                  />
                </SettingRow>
                {draftScheduledBackup.enabled && (
                  <>
                    <SettingRow label="Backup Interval" description="How often a new backup is created">
                      <Select
                        size="small"
                        value={draftScheduledBackup.intervalHours}
                        onChange={(e) =>
                          setDraftScheduledBackup((prev) => ({ ...prev, intervalHours: Number(e.target.value) }))
                        }
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={6}>Every 6 hours</MenuItem>
                        <MenuItem value={12}>Every 12 hours</MenuItem>
                        <MenuItem value={24}>Daily</MenuItem>
                        <MenuItem value={48}>Every 2 days</MenuItem>
                        <MenuItem value={168}>Weekly</MenuItem>
                      </Select>
                    </SettingRow>
                    <SettingRow label="Keep" description="Older backups beyond this count are automatically deleted">
                      <Select
                        size="small"
                        value={draftScheduledBackup.retentionCount}
                        onChange={(e) =>
                          setDraftScheduledBackup((prev) => ({ ...prev, retentionCount: Number(e.target.value) }))
                        }
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value={3}>Last 3 backups</MenuItem>
                        <MenuItem value={5}>Last 5 backups</MenuItem>
                        <MenuItem value={7}>Last 7 backups</MenuItem>
                        <MenuItem value={14}>Last 14 backups</MenuItem>
                        <MenuItem value={30}>Last 30 backups</MenuItem>
                      </Select>
                    </SettingRow>
                  </>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                >
                  {isScheduledBackupDirty && (
                    <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRunBackupNow}
                    disabled={backingUp}
                    sx={{ fontSize: '0.78rem', textTransform: 'none', mr: 'auto' }}
                  >
                    {backingUp ? 'Backing up...' : 'Back Up Now'}
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetScheduledBackup}
                    disabled={!isScheduledBackupDirty || savingScheduledBackup}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveScheduledBackup}
                    disabled={!isScheduledBackupDirty || savingScheduledBackup}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingScheduledBackup ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
                <Divider />
                {backups.length === 0 ? (
                  <Typography sx={{ px: 2, py: 1.5, fontSize: '0.78rem', color: 'text.disabled' }}>
                    No backups yet.
                  </Typography>
                ) : (
                  backups.map((b) => (
                    <Stack
                      key={b.file}
                      direction="row"
                      sx={{
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        px: 2,
                        py: 1,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      <Box>
                        <Typography sx={{ fontSize: '0.82rem', color: 'text.primary' }}>{b.file}</Typography>
                        <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                          {new Date(b.createdAt).toLocaleString()} · {formatBytes(b.size)}
                        </Typography>
                      </Box>
                      <Tooltip title="Download">
                        <IconButton size="small" onClick={() => handleDownloadBackup(b.file)}>
                          <Iconify icon="eva:download-outline" width={18} />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  ))
                )}
              </SettingsSection>
            </>
          )}

          {category === 'ai' && (
            <>
              <SettingsSection title="AI Agent">
                <SettingRow label="Enable AI Insights" description="Show AI-powered analysis on the Research page">
                  <Switch
                    checked={draftAiConfig?.enabled ?? false}
                    onChange={(_, checked) => updateDraft({ enabled: checked })}
                  />
                </SettingRow>

                {draftAiConfig?.enabled && (
                  <>
                    <SettingRow label="Provider" description="Select which AI provider to use">
                      <Select
                        size="small"
                        value={draftAiConfig.provider}
                        onChange={(e) =>
                          updateDraft({
                            provider: e.target.value as AiConfig['provider'],
                          })
                        }
                        sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                      >
                        <MenuItem value="ollama">Ollama (Local)</MenuItem>
                        <MenuItem value="gemini">Gemini (Google)</MenuItem>
                        <MenuItem value="claude">Claude (Anthropic)</MenuItem>
                      </Select>
                    </SettingRow>

                    {draftAiConfig.provider === 'claude' && (
                      <>
                        <SettingRow label="API Key" description="Your Anthropic API key">
                          <TextField
                            size="small"
                            type="password"
                            value={draftAiConfig.claudeApiKey}
                            onChange={(e) => updateDraft({ claudeApiKey: e.target.value })}
                            placeholder="sk-ant-..."
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                        <SettingRow label="Model" description="Claude model to use">
                          <TextField
                            size="small"
                            value={draftAiConfig.claudeModel}
                            onChange={(e) => updateDraft({ claudeModel: e.target.value })}
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                      </>
                    )}

                    {draftAiConfig.provider === 'gemini' && (
                      <>
                        <SettingRow label="API Key" description="Your Google Gemini API key">
                          <TextField
                            size="small"
                            type="password"
                            value={draftAiConfig.geminiApiKey}
                            onChange={(e) => updateDraft({ geminiApiKey: e.target.value })}
                            placeholder="AIza..."
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                        <SettingRow label="Model" description="Gemini model to use">
                          <TextField
                            size="small"
                            value={draftAiConfig.geminiModel}
                            onChange={(e) => updateDraft({ geminiModel: e.target.value })}
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                      </>
                    )}

                    {draftAiConfig.provider === 'ollama' && (
                      <>
                        <SettingRow label="Host" description="Ollama server URL">
                          <TextField
                            size="small"
                            value={draftAiConfig.ollamaHost}
                            onChange={(e) => updateDraft({ ollamaHost: e.target.value })}
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                        <SettingRow label="Model" description="Ollama model name (e.g. llama3.1, mistral)">
                          <TextField
                            size="small"
                            value={draftAiConfig.ollamaModel}
                            onChange={(e) => updateDraft({ ollamaModel: e.target.value })}
                            sx={{ width: { xs: '100%', sm: 260 }, '& input': { fontSize: '0.78rem' } }}
                          />
                        </SettingRow>
                      </>
                    )}
                  </>
                )}

                {draftAiConfig && (
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: 'flex-end', alignItems: 'center', px: 2, py: 1.5 }}
                  >
                    {isAiConfigDirty && (
                      <Typography sx={{ fontSize: '0.72rem', color: 'warning.main', mr: 'auto' }}>
                        Unsaved changes
                      </Typography>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleResetAiConfig}
                      disabled={!isAiConfigDirty || saving}
                      sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                    >
                      Reset
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      onClick={handleSaveAiConfig}
                      disabled={!isAiConfigDirty || saving}
                      sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </Button>
                  </Stack>
                )}
              </SettingsSection>
            </>
          )}

          {category === 'security' && (
            <>
              <SettingsSection title="Security">
                <SettingRow label="Enable lock" description="Require a 6-digit code to access this dashboard">
                  <Switch
                    checked={draftLock.enabled}
                    onChange={(_, checked) => setDraftLock((prev) => ({ ...prev, enabled: checked }))}
                  />
                </SettingRow>

                {savedLock.enabled && (isDisabling || isChangingCode) && (
                  <SettingRow label="Current code" description="Confirm the code currently in use">
                    <TextField
                      size="small"
                      type="password"
                      inputMode="numeric"
                      value={lockCurrentCode}
                      onChange={(e) => setLockCurrentCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      slotProps={{ htmlInput: { maxLength: 6 } }}
                      sx={{
                        width: { xs: '100%', sm: 200 },
                        '& input': { fontSize: '0.82rem', letterSpacing: '0.15em' },
                      }}
                    />
                  </SettingRow>
                )}

                {(isEnabling || (savedLock.enabled && draftLock.enabled)) && (
                  <>
                    <SettingRow label="New code" description="6 digits — keep it private">
                      <TextField
                        size="small"
                        type="password"
                        inputMode="numeric"
                        value={lockNewCode}
                        onChange={(e) => setLockNewCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        slotProps={{ htmlInput: { maxLength: 6 } }}
                        placeholder={savedLock.enabled ? 'Leave blank to keep current' : ''}
                        sx={{
                          width: { xs: '100%', sm: 200 },
                          '& input': { fontSize: '0.82rem', letterSpacing: '0.15em' },
                        }}
                      />
                    </SettingRow>
                    <SettingRow label="Confirm new code" description="Re-enter the new code">
                      <TextField
                        size="small"
                        type="password"
                        inputMode="numeric"
                        value={lockConfirmCode}
                        onChange={(e) => setLockConfirmCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        slotProps={{ htmlInput: { maxLength: 6 } }}
                        sx={{
                          width: { xs: '100%', sm: 200 },
                          '& input': { fontSize: '0.82rem', letterSpacing: '0.15em' },
                        }}
                      />
                    </SettingRow>
                  </>
                )}

                <SettingRow label="Auto-lock after" description="Lock the dashboard after this much idle time">
                  <Select
                    size="small"
                    value={draftLock.idleTimeoutMinutes}
                    onChange={(e) =>
                      setDraftLock((prev) => ({
                        ...prev,
                        idleTimeoutMinutes: Number(e.target.value),
                      }))
                    }
                    sx={{ minWidth: { xs: '100%', sm: 200 }, fontSize: '0.82rem' }}
                  >
                    {IDLE_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                </SettingRow>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    px: 2,
                    py: 1.5,
                  }}
                >
                  {isLockDirty && (
                    <Typography
                      sx={{
                        fontSize: '0.72rem',
                        color: 'warning.main',
                        mr: 'auto',
                      }}
                    >
                      Unsaved changes
                    </Typography>
                  )}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleResetLock}
                    disabled={!isLockDirty || savingLock}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    Reset
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={handleSaveLock}
                    disabled={!isLockDirty || savingLock}
                    sx={{ fontSize: '0.78rem', textTransform: 'none' }}
                  >
                    {savingLock ? 'Saving...' : 'Save'}
                  </Button>
                </Stack>
              </SettingsSection>
            </>
          )}
        </Box>
      </Stack>

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? This will not remove any holdings
            associated with this account.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={importConfirmOpen} onClose={() => setImportConfirmOpen(false)}>
        <DialogTitle>Confirm Import</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will <strong>overwrite all existing data</strong> with the contents of the backup file. This action
            cannot be undone. Are you sure you want to continue?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setImportConfirmOpen(false);
              setPendingImportFile(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleImportConfirm} color="warning" variant="contained">
            Overwrite &amp; Import
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
