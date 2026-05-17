import * as React from 'react';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import { fnCurrency } from '@/utils/formatNumber';

type WatchlistRowData = {
  symbol: string;
  price?: number;
  percentChange?: number;
  isLoading: boolean;
};

export default function WatchlistSection() {
  const navigate = useNavigate();
  const [watchlist, setWatchlist] = React.useState<string[]>([]);
  const [priceData, setPriceData] = React.useState<Record<string, { price: number; percentChange: number }>>({});
  const [loadingPrices, setLoadingPrices] = React.useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = React.useState(true);

  const loadWatchlist = async () => {
    setIsLoading(true);
    try {
      const items = await apis.watchlist.getAll();
      const symbols = (items ?? []).map((i: any) => i.symbol as string);
      setWatchlist(symbols);

      // Fetch prices for each symbol
      const loadingMap: Record<string, boolean> = {};
      symbols.forEach((s) => (loadingMap[s] = true));
      setLoadingPrices(loadingMap);

      await Promise.all(
        symbols.map(async (sym) => {
          try {
            const data = await apis.live.getLivePrice(sym);
            setPriceData((prev) => ({ ...prev, [sym]: { price: data.price, percentChange: data.percentChange } }));
          } catch {
            // silently ignore individual price failures
          } finally {
            setLoadingPrices((prev) => ({ ...prev, [sym]: false }));
          }
        })
      );
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await apis.watchlist.remove(symbol);
      setWatchlist((prev) => prev.filter((s) => s !== symbol));
      setPriceData((prev) => {
        const next = { ...prev };
        delete next[symbol];
        return next;
      });
    } catch {
      // ignore
    }
  };

  React.useEffect(() => {
    loadWatchlist();
  }, []);

  const rows: WatchlistRowData[] = watchlist.map((sym) => ({
    symbol: sym,
    price: priceData[sym]?.price,
    percentChange: priceData[sym]?.percentChange,
    isLoading: loadingPrices[sym] ?? false,
  }));

  return (
    <Accordion
      disableGutters
      elevation={0}
      sx={{
        mt: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '8px !important',
        '&:before': { display: 'none' },
        bgcolor: 'background.paper',
      }}
    >
      <AccordionSummary
        expandIcon={<Iconify icon="eva:chevron-down-fill" width={18} />}
        sx={{ minHeight: 44, '& .MuiAccordionSummary-content': { my: '10px' } }}
      >
        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1.5}>
          <Iconify icon="mdi:eye-outline" width={16} sx={{ color: 'text.secondary' }} />
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.secondary',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Watchlist
          </Typography>
          {watchlist.length > 0 && (
            <Chip
              label={watchlist.length}
              size="small"
              sx={{
                height: 18,
                fontSize: '0.65rem',
                fontWeight: 700,
                bgcolor: 'rgba(59,130,246,0.12)',
                color: 'primary.main',
                '& .MuiChip-label': { px: 0.75 },
              }}
            />
          )}
        </Stack>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 0 }}>
        {isLoading ? (
          <Skeleton variant="rectangular" height={60} sx={{ m: 2, borderRadius: 1 }} />
        ) : watchlist.length === 0 ? (
          <Box sx={{ p: 2.5, textAlign: 'center' }}>
            <Typography sx={{ fontSize: '0.8rem', color: 'text.disabled' }}>
              No stocks in watchlist. Search for a stock on the Research page and click "Add to Watchlist".
            </Typography>
          </Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <TableContainer>
              <Table size="small" sx={{ minWidth: 360 }}>
                <TableHead>
                  <TableRow>
                    {['Symbol', 'Price', 'Change', ''].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontSize: '0.68rem',
                          color: 'text.disabled',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => {
                    const isPos = (row.percentChange ?? 0) >= 0;
                    return (
                      <TableRow
                        key={row.symbol}
                        hover
                        sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                        onClick={() => navigate(`/research?searchText=${row.symbol}`)}
                      >
                        <TableCell
                          sx={{
                            fontWeight: 700,
                            fontSize: '0.82rem',
                            color: 'text.primary',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {row.symbol}
                        </TableCell>
                        <TableCell
                          sx={{
                            fontSize: '0.82rem',
                            color: 'text.primary',
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                          }}
                        >
                          {row.isLoading ? <Skeleton width={60} /> : row.price ? fnCurrency(row.price) : '—'}
                        </TableCell>
                        <TableCell sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                          {row.isLoading ? (
                            <Skeleton width={50} />
                          ) : row.percentChange != null ? (
                            <Typography
                              sx={{ fontSize: '0.78rem', fontWeight: 600, color: isPos ? '#4ade80' : '#f87171' }}
                            >
                              {isPos ? '+' : ''}
                              {row.percentChange.toFixed(2)}%
                            </Typography>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ borderBottom: '1px solid', borderColor: 'divider', pr: 1 }}>
                          <Tooltip title="Remove from watchlist">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemove(row.symbol);
                              }}
                              sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}
                            >
                              <Iconify icon="mdi:close" width={14} />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </AccordionDetails>
    </Accordion>
  );
}
