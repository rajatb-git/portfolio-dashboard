import { Alert, Box, Collapse, Divider, Grid, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
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
import type { Column } from '@/types';
import LocalStorageUtil from '@/utils/localStorage';
import { fnCurrency, fnPercent } from '@/utils/formatNumber';
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
};

export default function Table<T>({ rows, columns, accounts, refreshData, isLoading }: TableProps<T>) {
  const navigate = useNavigate();
  const initialViewMode = (LocalStorageUtil.getItem<ViewMode>(VIEW_MODE_KEY) ?? 'consolidated') as ViewMode;
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = useState(initialViewMode === 'consolidated' ? 'marketValue' : 'accountPercent');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
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

  const nearTargetCount = (rows as HoldingAggregate[]).filter(
    (r) => r.targetPrice && r.currentPrice && Math.abs(r.currentPrice - r.targetPrice) / r.targetPrice <= 0.05
  ).length;

  const notFound = !dataFiltered.length;

  const grandValue = totals.reduce((s, t) => s + t.totalValue, 0);
  const grandInvested = totals.reduce((s, t) => s + t.totalInvestment, 0);
  const grandGL = totals.reduce((s, t) => s + t.totalGL, 0);
  const grandGLPercent = grandInvested > 0 ? grandGL / grandInvested : 0;

  return (
    <>
      <Box>
        <Stack
          direction="row"
          onClick={toggleSummary}
          sx={{ alignItems: 'center', gap: 0.75, cursor: 'pointer', py: 0.25, userSelect: 'none' }}
        >
          <IconButton size="small" sx={{ p: 0.25 }} aria-label="toggle account summary">
            <Iconify
              icon={summaryCollapsed ? 'eva:arrow-ios-forward-fill' : 'eva:arrow-ios-downward-fill'}
              width={18}
            />
          </IconButton>
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'text.secondary',
            }}
          >
            Account Summary
          </Typography>
          <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled' }}>
            ({totals.length} account{totals.length === 1 ? '' : 's'})
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: 'text.primary' }}>
            {fnCurrency(grandValue)}
          </Typography>
          <Typography
            sx={{ fontSize: '0.78rem', fontWeight: 600, color: grandGL >= 0 ? 'success.main' : 'error.main' }}
          >
            {grandGL > 0 ? '+' : ''}
            {fnPercent(grandGLPercent)}
          </Typography>
        </Stack>

        <Collapse in={!summaryCollapsed}>
          <Grid container spacing={1} sx={{ pt: 0.5 }}>
            {totals.map((total) => (
              <Grid key={total.accountId} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                <TotalCard total={total} onManageCash={handleManageCash} />
              </Grid>
            ))}
          </Grid>
        </Collapse>
      </Box>

      {nearTargetCount > 0 && (
        <Alert
          severity="warning"
          sx={{ mt: 2, fontSize: '0.8rem', py: 0.5, '& .MuiAlert-icon': { fontSize: '1.1rem' } }}
        >
          {nearTargetCount} holding{nearTargetCount > 1 ? 's are' : ' is'} within 5% of target price
        </Alert>
      )}

      <Box
        sx={{
          mt: 2,
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

        <Box sx={{ overflowX: 'auto' }}>
          <TableContainer ref={tableContainerRef} sx={{ maxHeight: '60vh' }}>
            <MuiTable stickyHeader sx={{ minWidth: 820 }}>
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
                      return <DashTableConsolidatedRow key={item.key} row={item.row} onRowClick={goToResearchPage} />;
                    }
                    return <DashTableRow key={item.key} row={item.row} onRowClick={goToResearchPage} />;
                  })
                )}

                {notFound && !isLoading && <TableNoData query={filterName} />}
              </TableBody>
            </MuiTable>
          </TableContainer>
        </Box>

        <Divider />

        <TablePagination
          page={page}
          component="div"
          count={displayItems.length}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[50, 100, 200]}
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
