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
	TextField,
	ToggleButton,
	ToggleButtonGroup,
	Tooltip,
	Typography,
} from "@mui/material";
import * as React from "react";
import { toast } from "react-toastify";
import apis from "@/api";
import type { AiConfig } from "@/api/live";
import type { AlertMonitorConfig, LockStatus, ValueCalcConfig } from "@/api/settings";
import { Iconify } from "@/components/Iconify";
import { useThemeMode } from "@/components/ThemeRegistry/ThemeModeContext";
import { DB_HOST } from "@/config";
import { useAuth } from "@/contexts/AuthContext";
import type { IAccount } from "@/models/AccountsModel";
import LocalStorageUtil from "@/utils/localStorage";
import {
	NOTIFICATIONS_ENABLED_KEY,
	notificationsSupported,
	requestNotificationPermission,
} from "@/utils/priceAlertNotifications";

function SettingsSection({
	title,
	children,
}: {
	title: string;
	children: React.ReactNode;
}) {
	return (
		<Card variant="outlined" sx={{ mb: 2 }}>
			<Typography
				sx={{
					p: "10px 16px",
					color: "text.secondary",
					fontWeight: 700,
					fontSize: "0.72rem",
					letterSpacing: "0.06em",
					textTransform: "uppercase",
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

const IDLE_OPTIONS: Array<{ label: string; value: number }> = [
	{ label: "1 minute", value: 1 },
	{ label: "5 minutes", value: 5 },
	{ label: "15 minutes", value: 15 },
	{ label: "30 minutes", value: 30 },
	{ label: "Never", value: 0 },
];

const DEFAULT_LOCK: LockStatus = { enabled: false, idleTimeoutMinutes: 15 };

export default function Settings() {
	const { mode, setMode } = useThemeMode();
	const { refreshStatus } = useAuth();
	const savedApiHost = LocalStorageUtil.getItem<string>("api_host") ?? DB_HOST;
	const [apiHost, setApiHost] = React.useState(savedApiHost);
	const [apiHostSaved, setApiHostSaved] = React.useState(false);
	const isApiHostDirty = apiHost.trim() !== savedApiHost;
	const [aiConfig, setAiConfig] = React.useState<AiConfig | null>(null);
	const [draftAiConfig, setDraftAiConfig] = React.useState<AiConfig | null>(
		null,
	);
	const [saving, setSaving] = React.useState(false);

	const [savedLock, setSavedLock] = React.useState<LockStatus>(DEFAULT_LOCK);
	const [draftLock, setDraftLock] = React.useState<LockStatus>(DEFAULT_LOCK);
	const [lockCurrentCode, setLockCurrentCode] = React.useState("");
	const [lockNewCode, setLockNewCode] = React.useState("");
	const [lockConfirmCode, setLockConfirmCode] = React.useState("");
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
		LocalStorageUtil.getItem<boolean>(NOTIFICATIONS_ENABLED_KEY) === true,
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

	const [exporting, setExporting] = React.useState(false);
	const [importing, setImporting] = React.useState(false);
	const [importConfirmOpen, setImportConfirmOpen] = React.useState(false);
	const [pendingImportFile, setPendingImportFile] = React.useState<File | null>(
		null,
	);
	const fileInputRef = React.useRef<HTMLInputElement>(null);

	const [accounts, setAccounts] = React.useState<IAccount[]>([]);
	const [newAccountName, setNewAccountName] = React.useState("");
	const [addingAccount, setAddingAccount] = React.useState(false);
	const [deleteConfirm, setDeleteConfirm] = React.useState<IAccount | null>(
		null,
	);

	const isAiConfigDirty =
		!!aiConfig &&
		!!draftAiConfig &&
		JSON.stringify(aiConfig) !== JSON.stringify(draftAiConfig);

	React.useEffect(() => {
		apis.live
			.getAiConfig()
			.then((config) => {
				setAiConfig(config);
				setDraftAiConfig(config);
			})
			.catch((err) => {
				toast.error(err.message || "Failed to load AI configuration");
			});

		apis.accounts
			.getAll()
			.then(setAccounts)
			.catch((err) => toast.error(err.message || "Failed to load accounts"));

		apis.settings
			.getLock()
			.then((lock) => {
				setSavedLock(lock);
				setDraftLock(lock);
			})
			.catch((err) =>
				toast.error(err.message || "Failed to load security settings"),
			);

		apis.settings
			.getValueCalcConfig()
			.then((cfg) => {
				setSavedValueCalc(cfg);
				setDraftValueCalc(cfg);
			})
			.catch((err) => toast.error(err.message || "Failed to load portfolio tracker settings"));

		apis.settings
			.getAlertMonitorConfig()
			.then((cfg) => {
				setSavedAlertMonitor(cfg);
				setDraftAlertMonitor(cfg);
			})
			.catch((err) => toast.error(err.message || "Failed to load alert monitor settings"));
	}, []);

	const isLockDirty =
		JSON.stringify(savedLock) !== JSON.stringify(draftLock) ||
		lockCurrentCode.length > 0 ||
		lockNewCode.length > 0 ||
		lockConfirmCode.length > 0;

	const togglingEnabled = draftLock.enabled !== savedLock.enabled;
	const isEnabling = togglingEnabled && draftLock.enabled;
	const isDisabling = togglingEnabled && !draftLock.enabled;
	const isChangingCode =
		savedLock.enabled && draftLock.enabled && lockNewCode.length > 0;

	const handleSaveLock = async () => {
		if (isEnabling || isChangingCode) {
			if (!/^\d{6}$/.test(lockNewCode)) {
				toast.error("New code must be 6 digits");
				return;
			}
			if (lockNewCode !== lockConfirmCode) {
				toast.error("New code and confirmation do not match");
				return;
			}
		}
		if ((isDisabling || isChangingCode) && !lockCurrentCode) {
			toast.error("Current code is required");
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
			setLockCurrentCode("");
			setLockNewCode("");
			setLockConfirmCode("");
			await refreshStatus();
			toast.success("Security settings saved");
		} catch (err: any) {
			toast.error(err.message || "Failed to save security settings");
		} finally {
			setSavingLock(false);
		}
	};

	const handleResetLock = () => {
		setDraftLock(savedLock);
		setLockCurrentCode("");
		setLockNewCode("");
		setLockConfirmCode("");
	};

	const handleApiHostSave = () => {
		if (!apiHost.trim() || !isApiHostDirty) return;
		LocalStorageUtil.setItem("api_host", apiHost.trim());
		setApiHostSaved(true);
		setTimeout(() => setApiHostSaved(false), 2000);
		toast.success("Backend URL saved — reload the page to apply");
	};

	const handleExport = async () => {
		setExporting(true);
		try {
			const blob = await apis.live.exportDb();
			const url = URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `portfolio-backup-${new Date().toISOString().slice(0, 10)}.zip`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toast.success("Database exported successfully");
		} catch (err: any) {
			toast.error(err.message || "Export failed");
		} finally {
			setExporting(false);
		}
	};

	const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		if (!file.name.endsWith(".zip")) {
			toast.error("Please select a .zip backup file");
			return;
		}
		setPendingImportFile(file);
		setImportConfirmOpen(true);
		if (fileInputRef.current) fileInputRef.current.value = "";
	};

	const handleImportConfirm = async () => {
		if (!pendingImportFile) return;
		setImportConfirmOpen(false);
		setImporting(true);
		try {
			const result = await apis.live.importDb(pendingImportFile);
			toast.success(result.message || "Import completed");
		} catch (err: any) {
			toast.error(err.message || "Import failed");
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
				toast.success("AI configuration saved");
			})
			.catch((err) => {
				toast.error(err.message || "Failed to save AI configuration");
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
			toast.success("Portfolio tracker settings saved");
		} catch (err: any) {
			toast.error(err.message || "Failed to save portfolio tracker settings");
		} finally {
			setSavingValueCalc(false);
		}
	};

	const handleResetValueCalc = () => setDraftValueCalc(savedValueCalc);

	const handleSaveAlertMonitor = async () => {
		setSavingAlertMonitor(true);
		try {
			const saved = await apis.settings.saveAlertMonitorConfig(draftAlertMonitor);
			setSavedAlertMonitor(saved);
			setDraftAlertMonitor(saved);
			toast.success("Alert monitor settings saved");
		} catch (err: any) {
			toast.error(err.message || "Failed to save alert monitor settings");
		} finally {
			setSavingAlertMonitor(false);
		}
	};

	const handleResetAlertMonitor = () => setDraftAlertMonitor(savedAlertMonitor);

	const handleAddAccount = async () => {
		const name = newAccountName.trim();
		if (!name) return;
		setAddingAccount(true);
		try {
			const created = await apis.accounts.create({
				name,
				id: name.replace(/\s/g, ""),
			} as IAccount);
			setAccounts((prev) => [...prev, created]);
			setNewAccountName("");
			toast.success(`Account "${name}" created`);
		} catch (err: any) {
			toast.error(err.message || "Failed to create account");
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
			toast.error(err.message || "Failed to delete account");
		} finally {
			setDeleteConfirm(null);
		}
	};

	return (
		<Box sx={{ maxWidth: { xs: "100%", sm: 680 } }}>
			<Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
				Settings
			</Typography>

			<SettingsSection title="Appearance">
				<SettingRow
					label="Theme"
					description="Follow system appearance or set manually"
				>
					<ToggleButtonGroup
						size="small"
						value={mode}
						exclusive
						onChange={(_, val) => {
							if (val) setMode(val);
						}}
					>
						<ToggleButton value="system" sx={{ px: 2, fontSize: "0.78rem" }}>
							System
						</ToggleButton>
						<ToggleButton value="dark" sx={{ px: 2, fontSize: "0.78rem" }}>
							Dark
						</ToggleButton>
						<ToggleButton value="light" sx={{ px: 2, fontSize: "0.78rem" }}>
							Light
						</ToggleButton>
					</ToggleButtonGroup>
				</SettingRow>
			</SettingsSection>

			<SettingsSection title="Accounts">
				{accounts.length === 0 ? (
					<Stack sx={{ alignItems: "center", py: 3 }}>
						<Iconify
							icon="mdi:account-group-outline"
							width={28}
							sx={{ color: "text.disabled", mb: 1 }}
						/>
						<Typography
							sx={{
								fontSize: "0.82rem",
								color: "text.disabled",
								textAlign: "center",
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
								alignItems: "center",
								justifyContent: "space-between",
								px: 2,
								py: 1,
								borderBottom: "1px solid",
								borderColor: "divider",
							}}
						>
							<Stack direction="row" sx={{ alignItems: "center" }} spacing={1.5}>
								<Iconify
									icon="mdi:account-outline"
									width={18}
									sx={{ color: "text.secondary" }}
								/>
								<Box>
									<Typography
										sx={{
											fontSize: "0.85rem",
											fontWeight: 500,
											color: "text.primary",
										}}
									>
										{account.name}
									</Typography>
									<Typography
										sx={{ fontSize: "0.68rem", color: "text.disabled" }}
									>
										{account.id}
									</Typography>
								</Box>
							</Stack>
							<Tooltip title="Delete account">
								<IconButton
									size="small"
									onClick={() => setDeleteConfirm(account)}
									sx={{
										color: "text.disabled",
										"&:hover": { color: "error.main" },
									}}
								>
									<Iconify icon="mdi:delete-outline" width={18} />
								</IconButton>
							</Tooltip>
						</Stack>
					))
				)}

				<Stack
					direction="row"
					spacing={1}
					sx={{ alignItems: "center", px: 2, py: 1.5 }}
				>
					<TextField
						size="small"
						placeholder="Account name"
						value={newAccountName}
						onChange={(e) => setNewAccountName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleAddAccount();
						}}
						disabled={addingAccount}
						sx={{ flexGrow: 1, "& input": { fontSize: "0.78rem" } }}
					/>
					<Button
						size="small"
						variant="contained"
						onClick={handleAddAccount}
						disabled={!newAccountName.trim() || addingAccount}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{addingAccount ? "Adding..." : "Add"}
					</Button>
				</Stack>
			</SettingsSection>

			<Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
				<DialogTitle>Delete Account</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to delete{" "}
						<strong>{deleteConfirm?.name}</strong>? This will not remove any
						holdings associated with this account.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
					<Button
						onClick={handleDeleteAccount}
						color="error"
						variant="contained"
					>
						Delete
					</Button>
				</DialogActions>
			</Dialog>

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
						<Switch
							checked={notificationsOn}
							onChange={(_, checked) => handleToggleNotifications(checked)}
						/>
					</SettingRow>
				)}
				<SettingRow
					label="Default Rows Per Page"
					description="Number of holdings shown per page"
				>
					<Typography
						sx={{
							fontSize: "0.82rem",
							color: "text.secondary",
							fontWeight: 600,
						}}
					>
						50
					</Typography>
				</SettingRow>
			</SettingsSection>

			<SettingsSection title="Portfolio Value Tracker">
				<SettingRow
					label="Enable Auto-Tracking"
					description="Automatically record portfolio value during market hours (Mon–Fri 9:30 AM – 4:00 PM ET)"
				>
					<Switch
						checked={draftValueCalc.enabled}
						onChange={(_, checked) =>
							setDraftValueCalc((prev) => ({ ...prev, enabled: checked }))
						}
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
							sx={{ minWidth: { xs: "100%", sm: 200 }, fontSize: "0.82rem" }}
						>
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
					sx={{ justifyContent: "flex-end", alignItems: "center", px: 2, py: 1.5 }}
				>
					{isValueCalcDirty && (
						<Typography
							sx={{ fontSize: "0.72rem", color: "warning.main", mr: "auto" }}
						>
							Unsaved changes
						</Typography>
					)}
					<Button
						size="small"
						variant="outlined"
						onClick={handleResetValueCalc}
						disabled={!isValueCalcDirty || savingValueCalc}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						Reset
					</Button>
					<Button
						size="small"
						variant="contained"
						onClick={handleSaveValueCalc}
						disabled={!isValueCalcDirty || savingValueCalc}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{savingValueCalc ? "Saving..." : "Save"}
					</Button>
				</Stack>
			</SettingsSection>

			<SettingsSection title="Price Alert Monitor">
				<SettingRow
					label="Enable Background Monitoring"
					description="Continuously check your alerts on the server. Stock alerts are evaluated only during US market hours (Mon–Fri 9:30 AM – 4:00 PM ET, excluding holidays); crypto alerts are checked 24/7."
				>
					<Switch
						checked={draftAlertMonitor.enabled}
						onChange={(_, checked) =>
							setDraftAlertMonitor((prev) => ({ ...prev, enabled: checked }))
						}
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
							sx={{ minWidth: { xs: "100%", sm: 200 }, fontSize: "0.82rem" }}
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
					sx={{ justifyContent: "flex-end", alignItems: "center", px: 2, py: 1.5 }}
				>
					{isAlertMonitorDirty && (
						<Typography sx={{ fontSize: "0.72rem", color: "warning.main", mr: "auto" }}>
							Unsaved changes
						</Typography>
					)}
					<Button
						size="small"
						variant="outlined"
						onClick={handleResetAlertMonitor}
						disabled={!isAlertMonitorDirty || savingAlertMonitor}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						Reset
					</Button>
					<Button
						size="small"
						variant="contained"
						onClick={handleSaveAlertMonitor}
						disabled={!isAlertMonitorDirty || savingAlertMonitor}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{savingAlertMonitor ? "Saving..." : "Save"}
					</Button>
				</Stack>
			</SettingsSection>

			<SettingsSection title="API">
				<SettingRow
					label="Backend URL"
					description="Override the backend API host. Requires page reload to take effect."
				>
					<Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
						{apiHostSaved && (
							<Typography sx={{ fontSize: "0.72rem", color: "success.main" }}>
								Saved
							</Typography>
						)}
						<TextField
							size="small"
							value={apiHost}
							onChange={(e) => setApiHost(e.target.value)}
							sx={{ width: { xs: "100%", sm: 240 }, "& input": { fontSize: "0.78rem" } }}
						/>
						<Button
							size="small"
							variant="contained"
							onClick={handleApiHostSave}
							disabled={!isApiHostDirty || !apiHost.trim()}
							sx={{ fontSize: "0.78rem", textTransform: "none" }}
						>
							Save
						</Button>
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
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{exporting ? "Exporting..." : "Export"}
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
						style={{ display: "none" }}
					/>
					<Button
						variant="outlined"
						size="small"
						color="warning"
						onClick={() => fileInputRef.current?.click()}
						disabled={importing}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{importing ? "Importing..." : "Import"}
					</Button>
				</SettingRow>
			</SettingsSection>

			<Dialog
				open={importConfirmOpen}
				onClose={() => setImportConfirmOpen(false)}
			>
				<DialogTitle>Confirm Import</DialogTitle>
				<DialogContent>
					<DialogContentText>
						This will <strong>overwrite all existing data</strong> with the
						contents of the backup file. This action cannot be undone. Are you
						sure you want to continue?
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
					<Button
						onClick={handleImportConfirm}
						color="warning"
						variant="contained"
					>
						Overwrite &amp; Import
					</Button>
				</DialogActions>
			</Dialog>

			<SettingsSection title="AI Agent">
				<SettingRow
					label="Enable AI Insights"
					description="Show AI-powered analysis on the Research page"
				>
					<Switch
						checked={draftAiConfig?.enabled ?? false}
						onChange={(_, checked) => updateDraft({ enabled: checked })}
					/>
				</SettingRow>

				{draftAiConfig?.enabled && (
					<>
						<SettingRow
							label="Provider"
							description="Select which AI provider to use"
						>
							<Select
								size="small"
								value={draftAiConfig.provider}
								onChange={(e) =>
									updateDraft({
										provider: e.target.value as AiConfig["provider"],
									})
								}
								sx={{ minWidth: { xs: "100%", sm: 200 }, fontSize: "0.82rem" }}
							>
								<MenuItem value="ollama">Ollama (Local)</MenuItem>
								<MenuItem value="gemini">Gemini (Google)</MenuItem>
								<MenuItem value="claude">Claude (Anthropic)</MenuItem>
							</Select>
						</SettingRow>

						{draftAiConfig.provider === "claude" && (
							<>
								<SettingRow
									label="API Key"
									description="Your Anthropic API key"
								>
									<TextField
										size="small"
										type="password"
										value={draftAiConfig.claudeApiKey}
										onChange={(e) =>
											updateDraft({ claudeApiKey: e.target.value })
										}
										placeholder="sk-ant-..."
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
									/>
								</SettingRow>
								<SettingRow label="Model" description="Claude model to use">
									<TextField
										size="small"
										value={draftAiConfig.claudeModel}
										onChange={(e) =>
											updateDraft({ claudeModel: e.target.value })
										}
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
									/>
								</SettingRow>
							</>
						)}

						{draftAiConfig.provider === "gemini" && (
							<>
								<SettingRow
									label="API Key"
									description="Your Google Gemini API key"
								>
									<TextField
										size="small"
										type="password"
										value={draftAiConfig.geminiApiKey}
										onChange={(e) =>
											updateDraft({ geminiApiKey: e.target.value })
										}
										placeholder="AIza..."
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
									/>
								</SettingRow>
								<SettingRow label="Model" description="Gemini model to use">
									<TextField
										size="small"
										value={draftAiConfig.geminiModel}
										onChange={(e) =>
											updateDraft({ geminiModel: e.target.value })
										}
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
									/>
								</SettingRow>
							</>
						)}

						{draftAiConfig.provider === "ollama" && (
							<>
								<SettingRow label="Host" description="Ollama server URL">
									<TextField
										size="small"
										value={draftAiConfig.ollamaHost}
										onChange={(e) =>
											updateDraft({ ollamaHost: e.target.value })
										}
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
									/>
								</SettingRow>
								<SettingRow
									label="Model"
									description="Ollama model name (e.g. llama3.1, mistral)"
								>
									<TextField
										size="small"
										value={draftAiConfig.ollamaModel}
										onChange={(e) =>
											updateDraft({ ollamaModel: e.target.value })
										}
										sx={{ width: { xs: "100%", sm: 260 }, "& input": { fontSize: "0.78rem" } }}
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
						sx={{ justifyContent: "flex-end", alignItems: "center", px: 2, py: 1.5 }}
					>
						{isAiConfigDirty && (
							<Typography
								sx={{ fontSize: "0.72rem", color: "warning.main", mr: "auto" }}
							>
								Unsaved changes
							</Typography>
						)}
						<Button
							size="small"
							variant="outlined"
							onClick={handleResetAiConfig}
							disabled={!isAiConfigDirty || saving}
							sx={{ fontSize: "0.78rem", textTransform: "none" }}
						>
							Reset
						</Button>
						<Button
							size="small"
							variant="contained"
							onClick={handleSaveAiConfig}
							disabled={!isAiConfigDirty || saving}
							sx={{ fontSize: "0.78rem", textTransform: "none" }}
						>
							{saving ? "Saving..." : "Save"}
						</Button>
					</Stack>
				)}
			</SettingsSection>

			<SettingsSection title="Security">
				<SettingRow
					label="Enable lock"
					description="Require a 6-digit code to access this dashboard"
				>
					<Switch
						checked={draftLock.enabled}
						onChange={(_, checked) =>
							setDraftLock((prev) => ({ ...prev, enabled: checked }))
						}
					/>
				</SettingRow>

				{savedLock.enabled && (isDisabling || isChangingCode) && (
					<SettingRow
						label="Current code"
						description="Confirm the code currently in use"
					>
						<TextField
							size="small"
							type="password"
							inputMode="numeric"
							value={lockCurrentCode}
							onChange={(e) =>
								setLockCurrentCode(e.target.value.replace(/\D/g, "").slice(0, 6))
							}
							slotProps={{ htmlInput: { maxLength: 6 } }}
							sx={{
								width: { xs: "100%", sm: 200 },
								"& input": { fontSize: "0.82rem", letterSpacing: "0.15em" },
							}}
						/>
					</SettingRow>
				)}

				{(isEnabling || (savedLock.enabled && draftLock.enabled)) && (
					<>
						<SettingRow
							label="New code"
							description="6 digits — keep it private"
						>
							<TextField
								size="small"
								type="password"
								inputMode="numeric"
								value={lockNewCode}
								onChange={(e) =>
									setLockNewCode(e.target.value.replace(/\D/g, "").slice(0, 6))
								}
								slotProps={{ htmlInput: { maxLength: 6 } }}
								placeholder={
									savedLock.enabled ? "Leave blank to keep current" : ""
								}
								sx={{
									width: { xs: "100%", sm: 200 },
									"& input": { fontSize: "0.82rem", letterSpacing: "0.15em" },
								}}
							/>
						</SettingRow>
						<SettingRow label="Confirm new code" description="Re-enter the new code">
							<TextField
								size="small"
								type="password"
								inputMode="numeric"
								value={lockConfirmCode}
								onChange={(e) =>
									setLockConfirmCode(
										e.target.value.replace(/\D/g, "").slice(0, 6),
									)
								}
								slotProps={{ htmlInput: { maxLength: 6 } }}
								sx={{
									width: { xs: "100%", sm: 200 },
									"& input": { fontSize: "0.82rem", letterSpacing: "0.15em" },
								}}
							/>
						</SettingRow>
					</>
				)}

				<SettingRow
					label="Auto-lock after"
					description="Lock the dashboard after this much idle time"
				>
					<Select
						size="small"
						value={draftLock.idleTimeoutMinutes}
						onChange={(e) =>
							setDraftLock((prev) => ({
								...prev,
								idleTimeoutMinutes: Number(e.target.value),
							}))
						}
						sx={{ minWidth: { xs: "100%", sm: 200 }, fontSize: "0.82rem" }}
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
						justifyContent: "flex-end",
						alignItems: "center",
						px: 2,
						py: 1.5,
					}}
				>
					{isLockDirty && (
						<Typography
							sx={{
								fontSize: "0.72rem",
								color: "warning.main",
								mr: "auto",
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
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						Reset
					</Button>
					<Button
						size="small"
						variant="contained"
						onClick={handleSaveLock}
						disabled={!isLockDirty || savingLock}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{savingLock ? "Saving..." : "Save"}
					</Button>
				</Stack>
			</SettingsSection>

			<SettingsSection title="About">
				<SettingRow label="Application" description="Portfolio Dashboard">
					<Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>
						v{__APP_VERSION__}
					</Typography>
				</SettingRow>
				<SettingRow label="Data Provider" description="Real-time market data">
					<Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>
						Finnhub + NASDAQ
					</Typography>
				</SettingRow>
				<SettingRow label="Charts" description="Charting libraries">
					<Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>
						ApexCharts + MUI X
					</Typography>
				</SettingRow>
			</SettingsSection>
		</Box>
	);
}
