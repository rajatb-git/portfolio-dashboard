'use client';

import React, { useState } from 'react';

import { Box, Divider, Grid2, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Case from 'case';
import { useRouter } from 'next/navigation';

import { HoldingTypesEnum } from '@/lib/enums';
import { IAccount } from '@/models/AccountsModel';
import { Column } from '@/types';

import TableHead from './DashTableHead';
import DashTableRow from './DashTableRow';
import TableToolbar from './DashTableToolbar';
import { applyFilter, getComparator } from './dashTableUtils';
import TableNoData from '../Table/TableNoData';
import { TableSkeleton } from '../Table/TableSkeleton';
import TotalCard from '../TotalCard';
import theme from '../ThemeRegistry/theme';

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
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('totalGLPercent');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAccount, setFilterAccount] = useState('all');

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const handleSort = (event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

  const goToResearchPage = (symbol: string) => {
    router.push(`/research?searchText=${symbol}`);
  };

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const handleChangePage = (event: React.MouseEvent<HTMLButtonElement, MouseEvent> | null, newPage: number) => {
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

  const notFound = !dataFiltered.length;

  return (
    <>
      <Grid2 container spacing={1}>
        {totals.map((total) => (
          <Grid2 key={total.accountId} size={{ xs: 12, sm: 6, md: 4, lg: 2.5 }}>
            <TotalCard total={total} />
          </Grid2>
        ))}
      </Grid2>

      <Box sx={{ mt: 2, mb: 1, display: 'flex', justifyContent: 'space-between' }}>
        <ToggleButtonGroup
          color="warning"
          size="small"
          value={filterType}
          exclusive
          onChange={handleTypeFilterChange}
          aria-label="type-filter"
        >
          <ToggleButton value="all" sx={{ mx: 1, border: '0 !important', borderRadius: '4px !important', p: 0.5 }}>
            All
          </ToggleButton>

          {Object.values(HoldingTypesEnum).map((x) => (
            <ToggleButton
              key={x}
              value={x}
              sx={{ mx: 1, border: '0 !important', borderRadius: '4px !important', p: 0.5 }}
            >
              {Case.capital(x)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        <ToggleButtonGroup
          color="warning"
          size="small"
          value={filterAccount}
          exclusive
          onChange={handleAccountFilterChange}
          aria-label="type-filter"
        >
          <ToggleButton
            value="all"
            sx={{ mx: 1, border: '0 !important', borderRadius: '4px !important', py: 0, px: 0.5 }}
          >
            All
          </ToggleButton>

          {accounts.map((x) => (
            <ToggleButton
              key={x.id}
              value={x.id}
              sx={{ mx: 1, border: '0 !important', borderRadius: '4px !important', py: 0, px: 0.5 }}
            >
              {x.name}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Card
        elevation={3}
        sx={{ backgroundImage: 'none', backgroundColor: 'initial', border: '2px solid rgba(255,255,255,0.2)' }}
        variant="outlined"
      >
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
                  .map((row: any) => <DashTableRow key={row.id} row={row} onRowClick={goToResearchPage} />)
              )}

              {notFound && !isLoading && <TableNoData query={filterName} />}
            </TableBody>
          </MuiTable>
        </TableContainer>

        <Divider />

        <TablePagination
          sx={{ backgroundColor: theme.palette.grey[900] }}
          page={page}
          component="div"
          count={dataFiltered.length}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[50, 100, 200]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </>
  );
}
