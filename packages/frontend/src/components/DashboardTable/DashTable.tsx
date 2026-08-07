import { Alert, Box, Collapse, Divider, Grid, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Typography from '@mui/material/Typography';
import Case from 'case';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { HoldingAggregate } from '@/api/dashboard';
import BuySellDialog from '@/components/BuySellDialog';
import CashDialog from '@/components/CashDialog';
import { Iconify } from '@/components/Iconify';
import { HoldingTypesEnum } from '@/lib/enums';
import type { IAccount } from '@/models/AccountsModel';
import type { IAlertStatus } from '@/models/AlertModel';
import type { Column } from '@/types';
import LocalStorageUtil from '@/utils/localStorage';
import { fnCurrency } from '@/utils/formatNumber';
import { FONT_SIZE } from '@/components/ThemeRegistry/tokens';
import StatTile from '@/components/ui/StatTile';
import { useSentiment } from '@/components/ui/useSentiment';
import TableNoData from '../Table/TableNoData';
import { TableSkeleton } from '../Table/TableSkeleton';
import TotalCard from '../TotalCard';
import DashTableAccountHeader from './DashTableAccountHeader';
import DashTableConsolidatedRow from './DashTableConsolidatedRow';
import TableHead from './DashTableHead';
import DashTableRow from './DashTableRow';
import TableToolbar from './DashTableToolbar';
import {
  applyFilter,
  buildAlertStateMap,
  consolidateBySymbol,
  type EnrichedHolding,
  getComparator,
  groupByAccount,
  type Total,
} from './dashTableUtils';

type ViewMode = 'consolidated' | 'account';
const VIEW_MODE_KEY = 'dashboard_view_mode';

type DisplayItem =
  | { kind: 'accountHeader'; key: string; total: Total }
  | { kind: 'holding'; key: string; row: EnrichedHolding }
  | { kind: 'consolidated'; key: string; row: ReturnType<typeof consolidateBySymbol>[number] };

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  accounts: Array<IAccount>;
  refreshData: () => void;
  isLoading: boolean;
  alertStatuses?: Array<IAlertStatus>;
  onSetAlert?: (symbol: string, type: 'stock' | 'crypto', currentPrice?: number) => void;
};

export default function Table<T>({
  rows,
  columns,
  accounts,
  refreshData,
  isLoading,
  alertStatuses,
  onSetAlert,
}: TableProps<T>) {
  const navigate = useNavigate();
  const nearPercent = Number(LocalStorageUtil.getItem<string>('alert_threshold') ?? '5') || 5;
  const alertStateMap = React.useMemo(
    () => buildAlertStateMap(alertStatuses ?? [], nearPercent),
    [alertStatuses, nearPercent]
  );
  const getAlertState = React.useCallback((symbol: string) => alertStateMap.get(symbol), [alertStateMap]);
  const initialViewMode = (LocalStorageUtil.getItem<ViewMode>(VIEW_MODE_KEY) ?? 'consolidated') as ViewMode;
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState(initialViewMode === 'consolidated' ? 'marketValue' : 'accountPercent');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(100);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [tradeHolding, _setTradeHolding] = useState<HoldingAggregate | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [cashTarget, setCashTarget] = useState<IAccount | null>(null);
  const [cashOpen, setCashOpen] = useState(false);
  const [summaryCollapsed, setSummaryCollapsed] = useState<boolean>(
    () => LocalStorageUtil.getItem<boolean>('dash_summary_collapsed') ?? false
  );

  const toggleSummary = () => {
    setSummaryCollapsed((prev) => {
      const next = !prev;
      LocalStorageUtil.setItem('dash_summary_collapsed', next);
      return next;
    });
  };

  const handleSort = (_event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

  const tableContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  // Measure the sticky column header so account group headers can stick flush
  // beneath it; remeasure on resize since the header height is content-driven.
  React.useEffect(() => {
    const thead = tableContainerRef.current?.querySelector('thead');
    if (!thead) return;
    const update = () => setHeaderHeight(thead.getBoundingClientRect().height);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(thead);
    return () => observer.disconnect();
  }, []);

  const goToResearchPage = (symbol: string) => {
    navigate(`/research?searchText=${symbol}`);
  };

  const handleChangePage = (_event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: any) => {
    setPage(0);
    setRowsPerPage(parseInt(event.target.value, 10));
  };

  const handleFilterByName = (event: any) => {
    setPage(0);
    setFilterName(event.target.value);
  };

  const handleTypeFilterChange = (event: any) => {
    setPage(0);
    setFilterType(event.target.value);
  };

  const handleAccountFilterChange = (event: any) => {
    setPage(0);
    setFilterAccount(event.target.value);
  };

  const handleViewModeChange = (_event: any, value: ViewMode | null) => {
    if (!value) return;
    setPage(0);
    setViewMode(value);
    LocalStorageUtil.setItem(VIEW_MODE_KEY, value);
    // % of Account is blank on consolidated rows, so fall back to a column that
    // actually has values; restore the account-relative default when grouping.
    if (value === 'consolidated' && orderBy === 'accountPercent') setOrderBy('marketValue');
    if (value === 'account' && orderBy === 'marketValue') setOrderBy('accountPercent');
  };

  const enrichedRows = React.useMemo(() => {
    const accountTotals: Record<string, number> = {};
    (rows as unknown as HoldingAggregate[]).forEach((r) => {
      accountTotals[r.accountId] = (accountTotals[r.accountId] ?? 0) + (r.marketValue ?? 0);
    });
    return (rows as unknown as HoldingAggregate[]).map((r) => ({
      ...r,
      accountPercent:
        (accountTotals[r.accountId] ?? 0) > 0 ? ((r.marketValue ?? 0) / accountTotals[r.accountId]) * 100 : 0,
    }));
  }, [rows]);

  const comparator = getComparator(order, orderBy);

  const { dataFiltered, totals } = applyFilter({
    inputData: enrichedRows,
    comparator,
    filterName,
    filterAccount,
    filterType,
    accounts,
  });

  const displayItems = React.useMemo<Array<DisplayItem>>(() => {
    const rowsFiltered = dataFiltered as Array<EnrichedHolding>;

    if (viewMode === 'consolidated') {
      const groups = consolidateBySymbol(rowsFiltered).sort(comparator);
      return groups.map((group) =>
        group.accountCount === 1
          ? { kind: 'holding', key: `${group.subRows[0].accountId}-${group.symbol}`, row: group.subRows[0] }
          : { kind: 'consolidated', key: group.symbol, row: group }
      );
    }

    const totalsByAccount = new Map(totals.map((t) => [t.accountId, t]));
    const items: Array<DisplayItem> = [];
    groupByAccount(rowsFiltered).forEach(({ accountId, rows: accountRows }) => {
      const total = totalsByAccount.get(accountId);
      if (total) items.push({ kind: 'accountHeader', key: `header-${accountId}`, total });
      accountRows.forEach((r) => items.push({ kind: 'holding', key: `${accountId}-${r.symbol}`, row: r }));
    });
    return items;
  }, [dataFiltered, totals, viewMode, comparator]);

  const pageItems = displayItems.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  // If pagination splits an account group, re-show its header at the top of the page.
  if (viewMode === 'account' && pageItems[0]?.kind === 'holding') {
    const total = totals.find((t) => t.accountId === (pageItems[0] as { row: EnrichedHolding }).row.accountId);
    if (total) pageItems.unshift({ kind: 'accountHeader', key: `header-${total.accountId}-cont`, total });
  }

  const handleManageCash = (accountId: string) => {
    const acc = accounts.find((a) => a.id === accountId) ?? null;
    setCashTarget(acc);
    setCashOpen(true);
  };

  // Holdings whose symbol has an alert that's near or already triggered.
  const nearTargetCount = (rows as HoldingAggregate[]).filter((r) => {
    const state = alertStateMap.get(r.symbol);
    return state?.near || state?.triggered;
  }).length;

  const notFound = !dataFiltered.length;

  const grandValue = totals.reduce((s, t) => s + t.totalValue, 0);
  const grandInvested = totals.reduce((s, t) => s + t.totalInvestment, 0);
  const grandGL = totals.reduce((s, t) => s + t.totalGL, 0);
  const grandGLPercent = grandInvested > 0 ? grandGL / grandInvested : 0;
  const grandGLTone = useSentiment(grandGL);

  const totalCash = totals.reduce((s, t) => s + (t.cashBalance ?? 0), 0);
  const positionCount = viewMode === 'consolidated' ? displayItems.length : dataFiltered.length;

  return (
    <>
      {/* Portfolio headline. The single most important number on the page gets
          the largest tile; everything else supports it. */}
      <Grid container spacing={1.5} sx={{ mb: 2 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Portfolio value"
            value={fnCurrency(grandValue)}
            delta={grandGLPercent}
            deltaFormat="percent"
            icon="tabler:wallet"
            loading={isLoading}
            emphasis
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatTile
            label="Total gain / loss"
            value={
              <Box component="span" sx={{ color: grandGLTone.main }}>
                {grandGL > 0 ? '+' : ''}
                {fnCurrency(grandGL)}
              </Box>
            }
            icon="tabler:chart-line"
            loading={isLoading}
            hint="Unrealised gain or loss across every account, against cost basis."
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
          <StatTile
            label="Invested"
            value={fnCurrency(grandInvested)}
            icon="tabler:pig-money"
            loading={isLoading}
            hint="Total cost basis of all open positions."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatTile
            label="Cash"
            value={fnCurrency(totalCash)}
            icon="tabler:cash"
            loading={isLoading}
            footer={
              <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
                {positionCount} position{positionCount === 1 ? '' : 's'} · {totals.length} account
                {totals.length === 1 ? '' : 's'}
              </Typography>
            }
          />
        </Grid>
      </Grid>

      {nearTargetCount > 0 && (
        <Alert
          severity="warning"
          icon={<Iconify icon="tabler:bell-ringing" width={18} />}
          sx={{ mb: 2, py: 0.5 }}
        >
          {nearTargetCount} holding{nearTargetCount > 1 ? 's have' : ' has'} a price alert near or triggered
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Box
          component="button"
          type="button"
          onClick={toggleSummary}
          aria-expanded={!summaryCollapsed}
          aria-controls="account-summary-grid"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            width: '100%',
            px: 0,
            py: 0.5,
            border: 0,
            bgcolor: 'transparent',
            color: 'text.secondary',
            cursor: 'pointer',
            font: 'inherit',
            textAlign: 'left',
            '&:hover': { color: 'text.primary' },
          }}
        >
          <Iconify icon={summaryCollapsed ? 'tabler:chevron-right' : 'tabler:chevron-down'} width={16} aria-hidden />
          <Typography
            sx={{
              fontSize: FONT_SIZE.micro,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
              color: 'inherit',
            }}
          >
            By account
          </Typography>
          <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
            {totals.length} account{totals.length === 1 ? '' : 's'}
          </Typography>
        </Box>

        <Collapse in={!summaryCollapsed}>
          <Grid container spacing={1.5} id="account-summary-grid" sx={{ pt: 1 }}>
            {totals.map((total) => (
              <Grid key={total.accountId} size={{ xs: 12, sm: 6, md: 4, lg: 3, xl: 2 }}>
                <TotalCard total={total} onManageCash={handleManageCash} />
              </Grid>
            ))}
          </Grid>
        </Collapse>
      </Box>

      <Box
        sx={{
          mb: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        <ToggleButtonGroup
          size="small"
          value={filterType}
          exclusive
          onChange={handleTypeFilterChange}
          aria-label="type-filter"
        >
          <ToggleButton value="all">All</ToggleButton>
          {Object.values(HoldingTypesEnum).map((x) => (
            <ToggleButton key={x} value={x}>
              {Case.capital(x)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
          <ToggleButtonGroup
            size="small"
            value={viewMode}
            exclusive
            onChange={handleViewModeChange}
            aria-label="view-mode"
          >
            <ToggleButton value="consolidated">
              <Iconify icon="mdi:layers-outline" width={16} sx={{ mr: 0.5 }} />
              Consolidated
            </ToggleButton>
            <ToggleButton value="account">
              <Iconify icon="mdi:folder-account-outline" width={16} sx={{ mr: 0.5 }} />
              By Account
            </ToggleButton>
          </ToggleButtonGroup>

          <ToggleButtonGroup
            size="small"
            value={filterAccount}
            exclusive
            onChange={handleAccountFilterChange}
            aria-label="account-filter"
          >
            <ToggleButton value="all">All Accounts</ToggleButton>
            {accounts.map((x) => (
              <ToggleButton key={x.id} value={x.id}>
                {x.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Box>

      <Card elevation={0}>
        <TableToolbar
          accounts={accounts}
          filterName={filterName}
          onFilterName={handleFilterByName}
          refreshData={refreshData}
        />

        <Divider />

        {/* The table is the one thing allowed to scroll horizontally; the page
            body must never do so. */}
        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer ref={tableContainerRef} sx={{ maxHeight: { xs: '65vh', lg: 'calc(100vh - 320px)' }, minHeight: 280 }}>
            <MuiTable stickyHeader sx={{ minWidth: 900 }}>
              <TableHead
                order={order}
                orderBy={orderBy}
                rowCount={rows.length}
                onRequestSort={handleSort}
                headLabel={columns}
              />

              <TableBody>
                {isLoading ? (
                  <TableSkeleton />
                ) : (
                  pageItems.map((item) => {
                    if (item.kind === 'accountHeader') {
                      return (
                        <DashTableAccountHeader
                          key={item.key}
                          total={item.total}
                          colSpan={columns.length}
                          stickyTop={headerHeight}
                        />
                      );
                    }
                    if (item.kind === 'consolidated') {
                      return (
                        <DashTableConsolidatedRow
                          key={item.key}
                          row={item.row}
                          onRowClick={goToResearchPage}
                          getAlertState={getAlertState}
                          onSetAlert={onSetAlert}
                        />
                      );
                    }
                    return (
                      <DashTableRow
                        key={item.key}
                        row={item.row}
                        onRowClick={goToResearchPage}
                        alertState={getAlertState(item.row.symbol)}
                        onSetAlert={onSetAlert}
                      />
                    );
                  })
                )}

              </TableBody>
            </MuiTable>
          </TableContainer>
        </Box>

        {/* Outside the scroll container: a colSpan cell inherits the table's
            900px min-width and would slide off-screen on a phone. */}
        {notFound && !isLoading && <TableNoData query={filterName} />}

        <Divider />

        <TablePagination
          page={page}
          component="div"
          count={displayItems.length}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[50, 100, 200, 500]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>

      {/* Per-row trade dialog — key forces remount so initialValues are fresh */}
      <BuySellDialog
        key={tradeHolding?.symbol ?? 'trade'}
        open={tradeOpen}
        initialValues={tradeHolding ?? undefined}
        handleDialogClose={() => setTradeOpen(false)}
        refreshData={refreshData}
        accounts={accounts}
      />

      <CashDialog
        open={cashOpen}
        account={cashTarget}
        accounts={accounts}
        onClose={() => setCashOpen(false)}
        onSaved={refreshData}
      />
    </>
  );
}
