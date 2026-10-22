import {
  Box,
  Card,
  Chip,
  ChipProps,
  IconButton,
  InputAdornment,
  OutlinedInput,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import { visuallyHidden } from '@/components/DashboardTable/dashTableUtils';
import { Iconify } from '@/components/Iconify';
import { toastWatchResult } from '@/components/IPO/watchToast';
import { IIPO } from '@/models/IPOModel';
import { fnShortenCurrency, fnShortenNumber } from '@/utils/formatNumber';

type Props = {
  ipos: Array<IIPO>;
  isLoading: boolean;
  error?: string | null;
  onToggleWatch?: (ipo: IIPO, watched: boolean) => void;
};

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

const ROWS_PER_PAGE = 25;

// Names sort case-insensitively ("ADARx" next to "Accelevation"); empty values last.
const compareIpos = (orderBy: keyof IIPO, order: 'asc' | 'desc') => (a: IIPO, b: IIPO) => {
  const x = a[orderBy];
  const y = b[orderBy];
  if (x == null || x === '') return y == null || y === '' ? 0 : 1;
  if (y == null || y === '') return -1;
  const result =
    typeof x === 'number' && typeof y === 'number'
      ? x - y
      : String(x).localeCompare(String(y), undefined, { sensitivity: 'base', numeric: true });
  return order === 'asc' ? result : -result;
};

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export default function IPOList({ ipos, isLoading, error, onToggleWatch }: Props) {
  const navigate = useNavigate();
  const [order, setOrder] = React.useState<'asc' | 'desc'>('desc');
  const [orderBy, setOrderBy] = React.useState<keyof IIPO>('date');
  // The search lives in the URL so Back from an IPO's page keeps it.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('q') ?? '';
  const setSearch = (value: string) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (value) params.set('q', value);
        else params.delete('q');
        return params;
      },
      { replace: true }
    );
  const [page, setPage] = React.useState(0);

  const handleSort = (id: keyof IIPO) => {
    const isAsc = orderBy === id && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(id);
  };

  const handleToggleWatch = async (event: React.MouseEvent, ipo: IIPO) => {
    event.stopPropagation();
    try {
      if (ipo.watched) {
        await apis.live.unwatchIpo(ipo.symbol);
        toast.success(`Stopped watching ${ipo.symbol}`);
        onToggleWatch?.(ipo, false);
      } else {
        toastWatchResult(ipo.symbol, await apis.live.watchIpo(ipo));
        onToggleWatch?.(ipo, true);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update watch status');
    }
  };

  const sorted = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = query
      ? ipos.filter((x) => x.name?.toLowerCase().includes(query) || x.symbol?.toLowerCase().includes(query))
      : ipos;
    return [...filtered].sort(compareIpos(orderBy, order));
  }, [ipos, order, orderBy, search]);

  React.useEffect(() => setPage(0), [search, order, orderBy]);

  const pageRows = sorted.slice(page * ROWS_PER_PAGE, (page + 1) * ROWS_PER_PAGE);
  const openIpo = (ipo: IIPO) => navigate(`/ipo-calendar/${ipo.id}`, { state: { ipo } });

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
              <TableCell sx={{ width: 40 }} />
              {HEAD_CELLS.map((cell) => (
                <TableCell key={cell.id} align={cell.align} sortDirection={orderBy === cell.id ? order : false}>
                  <TableSortLabel
                    active={orderBy === cell.id}
                    direction={orderBy === cell.id ? order : 'asc'}
                    onClick={() => handleSort(cell.id)}
                  >
                    {cell.label}
                    {orderBy === cell.id ? (
                      <Box sx={{ ...visuallyHidden }}>
                        {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={HEAD_CELLS.length + 1} sx={{ textAlign: 'center', color: 'text.disabled', py: 4 }}>
                  {error
                    ? `Couldn't load IPOs: ${error}`
                    : search.trim()
                      ? 'No IPOs match your search.'
                      : 'No IPOs found.'}
                </TableCell>
              </TableRow>
            ) : (
              pageRows.map((ipo) => (
                <TableRow
                  key={ipo.id}
                  hover
                  tabIndex={0}
                  onClick={() => openIpo(ipo)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target === e.currentTarget) openIpo(ipo);
                  }}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell align="center">
                    {ipo.symbol && (
                      <Tooltip title={ipo.watched ? 'Stop watching' : 'Watch for an IPO reminder'}>
                        <IconButton size="small" onClick={(e) => handleToggleWatch(e, ipo)}>
                          <Iconify
                            icon={ipo.watched ? 'mdi:bell' : 'mdi:bell-outline'}
                            width={18}
                            sx={{ color: ipo.watched ? 'warning.main' : 'text.disabled' }}
                          />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
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
      {sorted.length > ROWS_PER_PAGE && (
        <TablePagination
          component="div"
          count={sorted.length}
          page={page}
          onPageChange={(_, next) => setPage(next)}
          rowsPerPage={ROWS_PER_PAGE}
          rowsPerPageOptions={[ROWS_PER_PAGE]}
        />
      )}
    </Card>
  );
}
