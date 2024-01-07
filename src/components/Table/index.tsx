'use client';

import React, { useState } from 'react';

import Card from '@mui/material/Card';
import { default as MuiTable } from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import TableEmptyRows from './TableEmptyRows';
import TableHead from './TableHead';
import TableNoData from './TableNoData';
import TableRow from './TableRow';
import TableToolbar from './TableToolbar';
import { emptyRows, applyFilter, getComparator } from './utils';

export interface Column {
  id: string;
  label: string;
}

type TableProps<T> = {
  rows: Array<T>;
  columns: Array<Column>;
};

export default function Table<T>({ rows, columns }: TableProps<T>) {
  const [page, setPage] = useState(0);

  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  const [selected, setSelected] = useState<Array<string>>([]);

  const [orderBy, setOrderBy] = useState('name');

  const [filterName, setFilterName] = useState('');

  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleSort = (event: any, id: string) => {
    const isAsc = orderBy === id && order === 'asc';
    if (id !== '') {
      setOrder(isAsc ? 'desc' : 'asc');
      setOrderBy(id);
    }
  };

  const handleSelectAllClick = (event: any) => {
    if (event.target.checked) {
      const newSelecteds = rows.map((n: any) => n.name);
      setSelected(newSelecteds);
      return;
    }
    setSelected([]);
  };

  const handleClick = (event: any, name: string) => {
    const selectedIndex = selected.indexOf(name);
    let newSelected: typeof selected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, name);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(selected.slice(0, selectedIndex), selected.slice(selectedIndex + 1));
    }

    setSelected(newSelected);
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

  const notFound = !dataFiltered.length && !!filterName;

  return (
    <Card elevation={3}>
      <TableToolbar numSelected={selected.length} filterName={filterName} onFilterName={handleFilterByName} />

      <TableContainer sx={{ overflow: 'unset' }}>
        <MuiTable sx={{ minWidth: 800 }}>
          <TableHead
            order={order}
            orderBy={orderBy}
            rowCount={rows.length}
            numSelected={selected.length}
            onRequestSort={handleSort}
            onSelectAllClick={handleSelectAllClick}
            headLabel={columns}
          />
          <TableBody>
            {dataFiltered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row: any) => (
              <TableRow
                key={row.id}
                name={row.name}
                role={row.role}
                status={row.status}
                company={row.company}
                icon={row.icon}
                isVerified={row.isVerified}
                selected={selected.indexOf(row.name) !== -1}
                handleClick={(event: any) => handleClick(event, row.name)}
              />
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
        rowsPerPageOptions={[5, 10, 25]}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Card>
  );
}
