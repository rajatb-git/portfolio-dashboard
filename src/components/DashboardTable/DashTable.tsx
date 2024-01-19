'use client';

import React, { useState } from 'react';

import { SelectChangeEvent } from '@mui/material';
import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { IHoldingsModel } from '@/models/HoldingsModel';
import { IUserDBModel } from 'db/models/UserDBModel';

import TableHead from './DashTableHead';
import TableRow from './DashTableRow';
import TableToolbar from './DashTableToolbar';
import { applyFilter, getComparator } from './dashTableUtils';
import TableNoData from '../DatabaseTable/DBTableNoData';

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
  users: Array<IUserDBModel>;
};

export default function Table<T>({ rows, columns, users }: TableProps<T>) {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('symbol');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [filterType, setFilterType] = useState<string>('');
  const [filterUser, setFilterUser] = useState('');
  const [totals, setTotals] = useState<Array<Total>>([]);

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

  const handleTypeFilterChange = (event: SelectChangeEvent<string>) => {
    setPage(0);
    setFilterType(event.target.value);
  };

  const handleUserFilterChange = (event: SelectChangeEvent<string>) => {
    setPage(0);
    setFilterUser(event.target.value);
  };

  const calculateTotals = (rows: Array<IHoldingsModel>) => {
    const tempMap: { [key: string]: Total } = {};
    rows.forEach((x: IHoldingsModel) => {
      if (!tempMap[x.userId]) {
        tempMap[x.userId] = { userId: x.userId, totalGL: 0, percentGL: 0, totalInvestment: 0 };
      }

      tempMap[x.userId].totalGL += x.totalGL || 0;
      tempMap[x.userId].totalInvestment += x.originalValue || 0;
    });

    const tempArray = Object.values(tempMap);
    tempArray.forEach((x) => {
      x.percentGL = x.totalGL / x.totalInvestment;
    });

    setTotals(tempArray);
  };

  const dataFiltered = applyFilter({
    inputData: rows,
    comparator: getComparator(order, orderBy),
    filterName,
    filterUser,
    filterType,
  });

  const notFound = !dataFiltered.length;

  return (
    <Card elevation={3}>
      <TableToolbar
        handleTypeFilterChange={handleTypeFilterChange}
        handleUserFilterChange={handleUserFilterChange}
        filterName={filterName}
        onFilterName={handleFilterByName}
        filterType={filterType}
        filterUser={filterUser}
        users={users}
      />

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
            {dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row: any) => (
              <TableRow key={row.id} row={row} />
            ))}

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
        rowsPerPageOptions={[25, 50, 100]}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Card>
  );
}
