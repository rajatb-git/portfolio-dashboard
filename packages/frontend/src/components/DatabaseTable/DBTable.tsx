'use client';

import React, { useState } from 'react';

import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { IHoldings } from '@/models/HoldingsModel';
import { ITransaction } from '@/models/TransactionsModel';
import { IAccount } from '@/models/AccountsModel';
import { Column } from '@/types';

import TableHead from './DBTableHead';
import TableRow from './DBTableRow';
import TableToolbar from './DBTableToolbar';
import { emptyRows, applyFilter, getComparator } from './dbTableUtils';
import TableEmptyRows from '../Table/TableEmptyRows';
import TableNoData from '../Table/TableNoData';

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  refreshData: () => Promise<void>;
  isLoading: boolean;
  handleDelete: (recordId: string) => Promise<any>;
  handleUpdate: (record: IAccount | ITransaction | IHoldings) => Promise<any>;
};

export default function DatabaseTable<T>({ rows, columns }: TableProps<T>) {
  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);

  // biome-ignore lint/correctness/noUnusedVariables: <explanation>
  const handleSort = (event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
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

  const dataFiltered = applyFilter({
    inputData: rows,
    comparator: getComparator(order, orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length;

  return (
    <React.Fragment>
      <Card elevation={3} sx={{ backgroundImage: 'none' }}>
        <TableToolbar filterName={filterName} onFilterName={handleFilterByName} />

        <TableContainer sx={{ maxHeight: '70vh' }}>
          <MuiTable stickyHeader>
            <TableHead
              order={order}
              orderBy={orderBy}
              rowCount={rows.length}
              onRequestSort={handleSort}
              columnsConfig={columns}
            />
            <TableBody>
              {dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row: any) => (
                <TableRow key={row.id} row={row} columnsConfig={columns} />
              ))}

              <TableEmptyRows height={77} emptyRows={emptyRows(page, rowsPerPage, rows.length)} />

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
    </React.Fragment>
  );
}
