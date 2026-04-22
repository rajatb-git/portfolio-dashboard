import { Alert, Box, Divider, Grid, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Case from 'case';
import type React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { HoldingAggregate } from '@/api/dashboard';
import BuySellDialog from '@/components/BuySellDialog';
import { HoldingTypesEnum } from '@/lib/enums';
import type { IAccount } from '@/models/AccountsModel';
import type { Column } from '@/types';
import TableNoData from '../Table/TableNoData';
import { TableSkeleton } from '../Table/TableSkeleton';
import TotalCard from '../TotalCard';
import TableHead from './DashTableHead';
import DashTableRow from './DashTableRow';
import TableToolbar from './DashTableToolbar';
import { applyFilter, getComparator } from './dashTableUtils';

export type Total = {
  accountId: string;
  totalGL: number;
  percentGL: number;
  totalInvestment: number;
};

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  accounts: Array<IAccount>;
  refreshData: () => void;
  isLoading: boolean;
};

export default function Table<T>({ rows, columns, accounts, refreshData, isLoading }: TableProps<T>) {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('totalGLPercent');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [tradeHolding, setTradeHolding] = useState<HoldingAggregate | null>(null);
  const [tradeOpen, setTradeOpen] = useState(false);

  const handleSort = (_event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

  const goToResearchPage = (symbol: string) => {
    navigate(`/research?searchText=${symbol}`);
  };

  const handleTrade = (holding: HoldingAggregate) => {
    setTradeHolding(holding);
    setTradeOpen(true);
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

  const { dataFiltered, totals } = applyFilter({
    inputData: rows,
    comparator: getComparator(order, orderBy),
    filterName,
    filterAccount,
    filterType,
  });

  const nearTargetCount = (rows as HoldingAggregate[]).filter(
    (r) => r.targetPrice && r.currentPrice && Math.abs(r.currentPrice - r.targetPrice) / r.targetPrice <= 0.05
  ).length;

  const notFound = !dataFiltered.length;

  return (
    <>
      <Grid container spacing={1}>
        {totals.map((total) => (
          <Grid key={total.accountId} size={{ xs: 12, sm: 6, md: 4, lg: 2.5 }}>
            <TotalCard total={total} />
          </Grid>
        ))}
      </Grid>

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
      </Box>

      <Card elevation={0}>
        <TableToolbar
          accounts={accounts}
          filterName={filterName}
          onFilterName={handleFilterByName}
          refreshData={refreshData}
        />

        <Divider />

        <TableContainer sx={{ maxHeight: '60vh' }}>
          <MuiTable stickyHeader>
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
                dataFiltered
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((row: any) => (
                    <DashTableRow key={row.id} row={row} onRowClick={goToResearchPage} onTrade={handleTrade} />
                  ))
              )}

              {notFound && !isLoading && <TableNoData query={filterName} />}
            </TableBody>
          </MuiTable>
        </TableContainer>

        <Divider />

        <TablePagination
          page={page}
          component="div"
          count={dataFiltered.length}
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
    </>
  );
}
