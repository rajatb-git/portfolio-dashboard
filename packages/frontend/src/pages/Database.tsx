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
	TableRow as MuiTableRow,
	Select,
	Skeleton,
	Stack,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TextField,
	Tooltip,
	Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import * as React from "react";
import { toast } from "react-toastify";

import apis from "@/api";
import CashDialog from "@/components/CashDialog";
import GenericGrid from "@/components/DataGrid";
import ImportDialog from "@/components/DataGrid/DBImportDialog";
import { Iconify } from "@/components/Iconify";
import type { IAccount } from "@/models/AccountsModel";
import type { IHoldings } from "@/models/HoldingsModel";
import type { ITransaction } from "@/models/TransactionsModel";
import { fnCurrency } from "@/utils/formatNumber";

const columns: { [collection: string]: Array<GridColDef> } = {
	holdings: [
		{
			field: "accountId",
			headerName: "Account",
			flex: 1,
			minWidth: 80,
			editable: true,
		},
		{
			field: "name",
			headerName: "Name",
			flex: 2,
			minWidth: 120,
			editable: true,
		},
		{
			field: "symbol",
			headerName: "SYM",
			flex: 1,
			minWidth: 70,
			editable: true,
		},
		{
			field: "qty",
			headerName: "Quantity",
			flex: 1,
			minWidth: 80,
			editable: true,
		},
		{
			field: "averagePrice",
			headerName: "Avg Price",
			flex: 1,
			minWidth: 90,
			editable: true,
			align: "right",
			headerAlign: "right",
		},
		{
			field: "type",
			headerName: "Type",
			flex: 1,
			minWidth: 70,
			editable: true,
		},
	],
	accounts: [
		{
			field: "id",
			headerName: "Id",
			flex: 1,
			minWidth: 80,
			editable: true,
		},
		{
			field: "name",
			headerName: "Name",
			flex: 2,
			minWidth: 140,
			editable: true,
		},
		{
			field: "cashBalance",
			headerName: "Cash",
			flex: 1,
			minWidth: 100,
			type: "number",
			editable: true,
			align: "right",
			headerAlign: "right",
			valueFormatter: (value: number | undefined) => fnCurrency(value ?? 0),
		},
	],
	transactions: [
		{
			field: "accountId",
			headerName: "Account",
			flex: 1,
			minWidth: 80,
			editable: true,
		},
		{
			field: "symbol",
			headerName: "SYM",
			flex: 1,
			minWidth: 70,
			editable: true,
		},
		{
			field: "qty",
			headerName: "Quantity",
			flex: 1,
			minWidth: 80,
			editable: true,
			align: "right",
		},
		{
			field: "action",
			headerName: "Action",
			flex: 1,
			minWidth: 80,
			editable: true,
		},
		{
			field: "price",
			headerName: "Price",
			flex: 1,
			minWidth: 80,
			editable: true,
			align: "right",
			headerAlign: "right",
		},
		{
			field: "pnl",
			headerName: "P/L",
			flex: 1,
			minWidth: 90,
			type: "number",
			editable: false,
			align: "right",
			headerAlign: "right",
			renderCell: (params) => {
				const v = params.value as number | undefined;
				if (v === undefined || v === null) return "—";
				const isGain = v >= 0;
				return (
					<Box
						component="span"
						sx={{
							fontWeight: 600,
							color: isGain ? "#4ade80" : "#f87171",
							fontVariantNumeric: "tabular-nums",
						}}
					>
						{isGain ? "+" : ""}
						{fnCurrency(v)}
					</Box>
				);
			},
		},
		{
			field: "type",
			headerName: "Type",
			flex: 1,
			minWidth: 70,
			editable: true,
		},
	],
};

function AccountsManager({
	accounts,
	isLoading,
	onRefresh,
}: {
	accounts: IAccount[];
	isLoading: boolean;
	onRefresh: () => void;
}) {
	const [newName, setNewName] = React.useState("");
	const [adding, setAdding] = React.useState(false);
	const [deleteTarget, setDeleteTarget] = React.useState<IAccount | null>(null);
	const [cashTarget, setCashTarget] = React.useState<IAccount | null>(null);

	const handleAdd = async () => {
		const name = newName.trim();
		if (!name) return;
		setAdding(true);
		try {
			await apis.accounts.create({
				name,
				id: name.replace(/\s/g, ""),
				cashBalance: 0,
			} as IAccount);
			setNewName("");
			toast.success(`Account "${name}" created`);
			onRefresh();
		} catch (err: any) {
			toast.error(err.message || "Failed to create account");
		} finally {
			setAdding(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget) return;
		try {
			await apis.accounts.deleteById(deleteTarget.id);
			toast.success(`Account "${deleteTarget.name}" deleted`);
			onRefresh();
		} catch (err: any) {
			toast.error(err.message || "Failed to delete account");
		} finally {
			setDeleteTarget(null);
		}
	};

	const totalCash = accounts.reduce((sum, a) => sum + (a.cashBalance ?? 0), 0);

	return (
		<>
			<Card variant="outlined" sx={{ background: "transparent" }}>
				<Stack
					direction="row"
					spacing={1}
					sx={{ alignItems: 'center', px: 2, py: 1.5 }}
				>
					<TextField
						size="small"
						placeholder="New account name"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleAdd();
						}}
						disabled={adding}
						sx={{ width: 280, "& input": { fontSize: "0.82rem" } }}
					/>
					<Button
						size="small"
						variant="contained"
						startIcon={<Iconify icon="mdi:plus" width={16} />}
						onClick={handleAdd}
						disabled={adding}
						sx={{ fontSize: "0.78rem", textTransform: "none" }}
					>
						{adding ? "Adding..." : "Add Account"}
					</Button>
					<Box sx={{ flexGrow: 1 }} />
					{accounts.length > 0 && (
						<Box sx={{ textAlign: 'right', mr: 1 }}>
							<Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
								Total Cash
							</Typography>
							<Typography sx={{ fontSize: '0.92rem', fontWeight: 700, color: 'text.primary' }}>
								{fnCurrency(totalCash)}
							</Typography>
						</Box>
					)}
					<IconButton onClick={onRefresh} size="small">
						<Iconify icon="fa:refresh" width={16} />
					</IconButton>
				</Stack>

				<Divider />

				<TableContainer sx={{ maxHeight: "70vh" }}>
					<Table stickyHeader size="small">
						<TableHead>
							<MuiTableRow>
								<TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
									Name
								</TableCell>
								<TableCell sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
									ID
								</TableCell>
								<TableCell align="right" sx={{ fontWeight: 700, fontSize: "0.78rem" }}>
									Cash Balance
								</TableCell>
								<TableCell
									align="right"
									sx={{ fontWeight: 700, fontSize: "0.78rem", width: 140 }}
								>
									Actions
								</TableCell>
							</MuiTableRow>
						</TableHead>
						<TableBody>
							{isLoading ? (
								Array.from({ length: 3 }).map((_, i) => (
									<MuiTableRow key={i}>
										<TableCell>
											<Skeleton width="60%" />
										</TableCell>
										<TableCell>
											<Skeleton width="80%" />
										</TableCell>
										<TableCell>
											<Skeleton width="60%" />
										</TableCell>
										<TableCell />
									</MuiTableRow>
								))
							) : accounts.length === 0 ? (
								<MuiTableRow>
									<TableCell colSpan={4} align="center" sx={{ py: 4 }}>
										<Typography
											sx={{ fontSize: "0.82rem", color: "text.disabled" }}
										>
											No accounts yet. Add one above to get started.
										</Typography>
									</TableCell>
								</MuiTableRow>
							) : (
								accounts.map((account) => {
									const cash = account.cashBalance ?? 0;
									const isNegative = cash < 0;
									return (
										<MuiTableRow key={account.id} hover>
											<TableCell sx={{ fontSize: "0.82rem" }}>
												{account.name}
											</TableCell>
											<TableCell
												sx={{ fontSize: "0.78rem", color: "text.secondary" }}
											>
												{account.id}
											</TableCell>
											<TableCell
												align="right"
												sx={{
													fontSize: "0.82rem",
													fontWeight: 600,
													color: isNegative ? "#f87171" : "text.primary",
													fontVariantNumeric: "tabular-nums",
												}}
											>
												{fnCurrency(cash)}
											</TableCell>
											<TableCell align="right">
												<Tooltip title="Deposit / Withdraw cash">
													<IconButton
														size="small"
														onClick={() => setCashTarget(account)}
														sx={{
															color: "text.disabled",
															"&:hover": { color: "primary.main" },
														}}
													>
														<Iconify icon="mdi:cash-multiple" width={18} />
													</IconButton>
												</Tooltip>
												<Tooltip title="Delete account">
													<IconButton
														size="small"
														onClick={() => setDeleteTarget(account)}
														sx={{
															color: "text.disabled",
															"&:hover": { color: "error.main" },
														}}
													>
														<Iconify icon="mdi:delete-outline" width={18} />
													</IconButton>
												</Tooltip>
											</TableCell>
										</MuiTableRow>
									);
								})
							)}
						</TableBody>
					</Table>
				</TableContainer>
			</Card>

			<CashDialog
				open={!!cashTarget}
				account={cashTarget}
				onClose={() => setCashTarget(null)}
				onSaved={onRefresh}
			/>

			<Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
				<DialogTitle>Delete Account</DialogTitle>
				<DialogContent>
					<DialogContentText>
						Are you sure you want to delete{" "}
						<strong>{deleteTarget?.name}</strong>? This will not remove any
						holdings associated with this account.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
					<Button onClick={handleDelete} color="error" variant="contained">
						Delete
					</Button>
				</DialogActions>
			</Dialog>
		</>
	);
}

export default function Database() {
	const [isLoading, setIsLoading] = React.useState(true);
	const [activeCollection, setActiveCollection] = React.useState<
		"accounts" | "transactions" | "holdings"
	>("holdings");
	const [records, setRecords] = React.useState<
		Array<IAccount | IHoldings | ITransaction>
	>([]);
	const [importDialogOpen, setImportDialogOpen] = React.useState(false);
	const [accountsData, setAccountsData] = React.useState<Array<IAccount>>([]);

	const deleteRecord = async (recordId: string) => {
		return apis[activeCollection].deleteById(recordId);
	};

	const openImportDialog = async () => {
		await apis.accounts.getAll().then((response) => {
			setAccountsData(response);
		});

		setImportDialogOpen(true);
	};

	const closeImportDialog = () => {
		setImportDialogOpen(false);
		setAccountsData([]);
	};

	const insertOrUpdateRecord = async (
		record: IAccount | ITransaction | IHoldings,
	) => {
		return apis[activeCollection].insertOrUpdateById(record as any);
	};

	const insertHoldingsData = async (
		newData: Array<IHoldings>,
	): Promise<void> => {
		await apis.holdings
			.insertHoldings(newData)
			.then(() => {
				toast.success("Successfully imported holdings data!");
			})
			.catch((err) => {
				toast.error(err.message);
			});
	};

	const loadData = async () => {
		setRecords([]);
		setIsLoading(true);

		await apis[activeCollection]
			.getAll()
			.then((response) => {
				setRecords(response);
			})
			.catch((err) => {
				toast.error(err.message);
			})
			.finally(() => {
				setIsLoading(false);
			});
	};

	React.useEffect(() => {
		loadData();
	}, [activeCollection]);

	return (
		<>
			<Stack
				direction={{ xs: "column", sm: "row" }}
				sx={{ alignItems: { xs: "flex-start", sm: "center" }, gap: 1, mb: 2 }}
			>
				<Typography variant="h6" sx={{ flexGrow: 1 }}>
					Database
				</Typography>

				<Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
					<Button
						color="primary"
						startIcon={<Iconify icon="mage:file-upload-fill" />}
						onClick={openImportDialog}
					>
						Import holdings data
					</Button>

					<Select
						value={activeCollection}
						displayEmpty
						onChange={(e) => setActiveCollection(e.target.value as any)}
						size="small"
						disabled={isLoading}
					>
						{["accounts", "holdings", "transactions"].map((x) => (
							<MenuItem key={x} value={x}>
								{x}
							</MenuItem>
						))}
					</Select>
				</Stack>
			</Stack>

			{activeCollection === "accounts" ? (
				<AccountsManager
					accounts={records as IAccount[]}
					isLoading={isLoading}
					onRefresh={loadData}
				/>
			) : (
				!isLoading && (
					<GenericGrid
						initialRows={records}
						deleteRecord={deleteRecord}
						insertOrUpdateRecord={insertOrUpdateRecord}
						loadData={loadData}
						activeCollection={activeCollection}
						dynamicColumns={columns[activeCollection]}
						refreshPage={loadData}
					/>
				)
			)}

			<ImportDialog
				open={importDialogOpen}
				handleDialogClose={closeImportDialog}
				insertHoldingsData={insertHoldingsData}
				accountsData={accountsData}
				refreshPage={loadData}
			/>
		</>
	);
}
