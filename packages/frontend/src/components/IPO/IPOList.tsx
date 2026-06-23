import React from 'react';

import {
  Box,
  Card,
  Chip,
  ChipProps,
  InputAdornment,
  OutlinedInput,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

import { getComparator, visuallyHidden } from '@/components/DashboardTable/dashTableUtils';
import { Iconify } from '@/components/Iconify';
import { IIPO } from '@/models/IPOModel';
import { fnShortenCurrency, fnShortenNumber } from '@/utils/formatNumber';

type Props = { ipos: Array<IIPO>; isLoading: boolean };

type HeadCell = { id: keyof IIPO; label: string; align: 'left' | 'right' };

const HEAD_CELLS: Array<HeadCell> = [
  { id: 'date', label: 'Date', align: 'left' },
  { id: 'name', label: 'Company', align: 'left' },
  { id: 'symbol', label: 'Symbol', align: 'left' },
  { id: 'exchange', label: 'Exchange', align: 'left' },
  { id: 'status', label: 'Status', align: 'left' },
  { id: 'price', label: 'Price', align: 'right' },
  { id: 'numberOfShares', label: 'Shares', align: 'right' },
  { id: 'totalSharesValue', label: 'Value', align: 'right' },
];

const STATUS_COLOR: Record<IIPO['status'], ChipProps['color']> = {
  expected: 'warning',
  filed: 'info',
  priced: 'success',
  withdrawn: 'error',
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function IPOList({ ipos, isLoading }: Props) {
  const navigate = useNavigate();
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = React.useState<keyof IIPO>('date');
  const [search, setSearch] = React.useState('');

  const handleSort = (id: keyof IIPO) => {
    const isAsc = orderBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(id);
  };

  const sorted = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? ipos.filter(
          (x) => x.name?.toLowerCase().includes(query) || x.symbol?.toLowerCase().includes(query)
        )
      : ipos;
    return [...filtered].sort(getComparator(order, orderBy));
  }, [ipos, order, orderBy, search]);

  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ p: 2 }}>
        <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 1 }} />
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <Box sx={{ p: 1.5 }}>
        <OutlinedInput
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company or symbol..."
          startAdornment={
            <InputAdornment position="start">
              <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', width: 18, height: 18 }} />
            </InputAdornment>
          }
        />
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              {HEAD_CELLS.map((cell) => (
                <TableCell key={cell.id} align={cell.align} sortDirection={orderBy === cell.id ? order : false}>
                  <TableSortLabel
                    active={orderBy === cell.id}
                    direction={orderBy === cell.id ? order : 'asc'}
                    onClick={() => handleSort(cell.id)}
                  >
                    {cell.label}
                    {orderBy === cell.id ? (
                      <Box sx={{ ...visuallyHidden }}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box>
                    ) : null}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={HEAD_CELLS.length} sx={{ textAlign: 'center', color: 'text.disabled', py: 4 }}>
                  {search.trim() ? 'No IPOs match your search.' : 'No IPOs found.'}
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((ipo) => (
                <TableRow
                  key={ipo.id}
                  hover
                  onClick={() => navigate(`/ipo-calendar/${ipo.id}`, { state: { ipo } })}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>
                    <Typography sx={{ fontSize: '0.82rem' }}>{moment(ipo.date).format('MMM D, YYYY')}</Typography>
                    <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary' }}>
                      {moment(ipo.date).fromNow()}
                    </Typography>
                  </TableCell>
                  <TableCell>{ipo.name}</TableCell>
                  <TableCell>{ipo.symbol || '-'}</TableCell>
                  <TableCell>{ipo.exchange || '-'}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      variant="outlined"
                      label={capitalize(ipo.status)}
                      color={STATUS_COLOR[ipo.status] ?? 'default'}
                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell align="right">{ipo.price ? `$${ipo.price}` : '-'}</TableCell>
                  <TableCell align="right">{ipo.numberOfShares ? fnShortenNumber(ipo.numberOfShares) : '-'}</TableCell>
                  <TableCell align="right">
                    {ipo.totalSharesValue ? fnShortenCurrency(ipo.totalSharesValue) : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
}
