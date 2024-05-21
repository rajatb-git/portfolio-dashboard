'use client';

import React, { useState } from 'react';

import { Box, Grid, ToggleButton, ToggleButtonGroup } from '@mui/material';
import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import Case from 'case';

import { HoldingTypesEnum } from '@/lib/enums';
import { IUser } from '@/models/UserModel';

import TableHead from './DashTableHead';
import TableRow from './DashTableRow';
import TableToolbar from './DashTableToolbar';
import { applyFilter, getComparator } from './dashTableUtils';
import TableNoData from '../Table/TableNoData';
import { TableSkeleton } from '../Table/TableSkeleton';
import TotalCard from '../TotalCard';

export type Total = {
  userId: string;
  totalGL: number;
  percentGL: number;
  totalInvestment: number;
};

export type Column = {
  id: string;
  label: string;
};

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  users: Array<IUser>;
  refreshData: () => void;
  isLoading: boolean;
};

export default function Table<T>({ rows, columns, users, refreshData, isLoading }: TableProps<T>) {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('symbol');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [filterType, setFilterType] = useState<string>('all');
  const [filterUser, setFilterUser] = useState('all');

  const handleSort = (event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

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

  const handleUserFilterChange = (event: any) => {
    setPage(0);
    setFilterUser(event.target.value);
  };

  const { dataFiltered, totals } = applyFilter({
    inputData: rows,
    comparator: getComparator(order, orderBy),
    filterName,
    filterUser,
    filterType,
  });

  const notFound = !dataFiltered.length;

  return (
    <>
      <Grid container spacing={3}>
        {totals.map((total) => (
          <Grid key={total.userId} item xs={12} sm={6} lg={4} xl={3}>
            <TotalCard total={total} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ pt: 2, pb: 0.5, display: 'flex', justifyContent: 'space-between' }}>
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
          value={filterUser}
          exclusive
          onChange={handleUserFilterChange}
          aria-label="type-filter"
        >
          <ToggleButton
            value="all"
            sx={{ mx: 1, border: '0 !important', borderRadius: '4px !important', py: 0, px: 0.5 }}
          >
            All
          </ToggleButton>

          {users.map((x) => (
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

      <Card elevation={3}>
        <TableToolbar filterName={filterName} onFilterName={handleFilterByName} refreshData={refreshData} />

        <TableContainer>
          <MuiTable>
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
                  .map((row: any) => <TableRow key={row.id} row={row} />)
              )}

              {notFound && <TableNoData query={filterName} />}
            </TableBody>
          </MuiTable>
        </TableContainer>

        <TablePagination
          page={page}
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          onPageChange={handleChangePage}
          rowsPerPageOptions={[50, 100, 200]}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </>
  );
}
