'use client';

import React, { useState } from 'react';

import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { useRouter } from 'next/navigation';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import { IHoldings } from '@/models/HoldingsModel';
import { IUser } from '@/models/UserModel';

import AddDialog from './AddEditDialog';
import ImportDialog from './DBImportDialog';
import TableEmptyRows from './DBTableEmptyRows';
import TableHead from './DBTableHead';
import TableNoData from './DBTableNoData';
import TableRow from './DBTableRow';
import TableToolbar from './DBTableToolbar';
import { emptyRows, applyFilter, getComparator } from './dbTableUtils';

export type Column = {
  id: string;
  label: string;
};

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
  // eslint-disable-next-line no-unused-vars
  handleDelete: (recordId: string) => Promise<any>;
  // eslint-disable-next-line no-unused-vars
  insertHoldingsData: (newData: Array<IHoldings>) => void;
  usersData: Array<IUser>;
};

export default function DatabaseTable<T>({
  rows,
  columns,
  handleDelete,
  insertHoldingsData,
  usersData,
}: TableProps<T>) {
  const router = useRouter();

  const [page, setPage] = useState(0);
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [orderBy, setOrderBy] = useState('name');
  const [filterName, setFilterName] = useState('');
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [addEdit, setAddEdit] = useState<'Add' | 'Edit'>('Add');

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

  const openEditDialog = () => {
    setAddEdit('Edit');
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    setAddEdit('Add');
    setDialogOpen(true);
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
        <TableToolbar
          filterName={filterName}
          onFilterName={handleFilterByName}
          openNewDialog={openAddDialog}
          openImportDialog={() => setImportDialogOpen(true)}
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
                <TableRow key={row.id} row={row} openEditDialog={openEditDialog} handleDelete={handleRowDelete} />
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

      <AddDialog
        addEdit={addEdit}
        insertHoldingsData={insertHoldingsData}
        open={dialogOpen}
        handleDialogClose={() => setDialogOpen(false)}
        refreshPage={refreshPage}
        usersData={usersData}
      />

      <ImportDialog
        open={importDialogOpen}
        handleDialogClose={() => setImportDialogOpen(false)}
        insertHoldingsData={insertHoldingsData}
        usersData={usersData}
        refreshPage={refreshPage}
      />

      <SnackbarProvider autoHideDuration={10000} />
    </React.Fragment>
  );
}
