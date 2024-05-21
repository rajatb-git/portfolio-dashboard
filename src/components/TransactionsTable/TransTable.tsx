'use client';

import React, { useState } from 'react';

import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { useRouter } from 'next/navigation';
import { enqueueSnackbar } from 'notistack';

import TableRow from './TransTableRow';
import TableToolbar from './TransTableToolbar';
import { emptyRows, applyFilter, getComparator } from './TransTableUtils';
import TableEmptyRows from '../Table/TableEmptyRows';
import TableHead from '../Table/TableHead';
import TableNoData from '../Table/TableNoData';

export type Column = {
  id: string;
  label: string;
};

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  handleDelete: (recordId: string) => Promise<any>;
};

export default function TransactionsTable<T>({ rows, columns, handleDelete }: TableProps<T>) {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);

  const handleRowDelete = (recordId: string) => {
    const deleteResponse = handleDelete(recordId);

    if (deleteResponse instanceof Error) {
      enqueueSnackbar({ message: deleteResponse.message, variant: 'error' });
      refreshPage();
    } else {
      enqueueSnackbar({ message: 'deleted', variant: 'success' });
    }
  };

  const refreshPage = () => {
    router.refresh();
  };

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

  const dataFiltered = applyFilter({
    inputData: rows,
    comparator: getComparator(order, orderBy),
    filterName,
  });

  const notFound = !dataFiltered.length;

  return (
    <React.Fragment>
      <Card elevation={3}>
        <TableToolbar filterName={filterName} onFilterName={handleFilterByName} />

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
                <TableRow key={row.id} row={row} handleDelete={handleRowDelete} />
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
