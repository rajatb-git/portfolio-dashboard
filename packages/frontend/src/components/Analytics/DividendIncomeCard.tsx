import {
  Alert,
  Box,
  Chip,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import moment from 'moment';

import type { DividendSummary, DividendsReceived } from '@/api/analytics';
import Metric from '@/components/ui/Metric';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  data: DividendSummary | null;
  isLoading: boolean;
  error: string | null;
};

function FundsNotCovered({ symbols }: { symbols: string[] }) {
  if (!symbols.length) return null;
  return (
    <Alert severity="info" variant="outlined" sx={{ fontSize: '0.78rem' }}>
      Not included: {symbols.join(', ')}. No free data source publishes ETF and fund distributions, so their income is
      missing from these totals.
    </Alert>
  );
}

const headCell = { fontSize: '0.7rem' };

function DividendsReceivedPanel({ received }: { received: DividendsReceived }) {
  if (received.payments === 0) {
    return (
      <Panel title="Dividends received" icon="tabler:receipt" flush>
        <StateView
          state="empty"
          title="No dividends recorded"
          message="Import your broker's activity history, or record a payment with Manage Cash → Dividend received."
          icon="tabler:receipt-off"
          minHeight={140}
        />
      </Panel>
    );
  }

  return (
    <Panel
      title="Dividends received"
      subtitle={`${received.payments} payment${received.payments === 1 ? '' : 's'}`}
      icon="tabler:receipt"
      flush
    >
      <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider flexItem />}>
        <Box sx={{ flex: 1, p: 2 }}>
          <Metric label="This year" value={fnCurrency(received.thisYear)} />
        </Box>
        <Box sx={{ flex: 1, p: 2 }}>
          <Metric label="Last 12 months" value={fnCurrency(received.trailing12Months)} />
        </Box>
        <Box sx={{ flex: 1, p: 2 }}>
          <Metric label="All time" value={fnCurrency(received.total)} />
        </Box>
      </Stack>
      <Divider />
      <Stack direction={{ xs: 'column', md: 'row' }} divider={<Divider flexItem orientation="vertical" />}>
        <Box sx={{ flex: 1, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCell}>Symbol</TableCell>
                <TableCell sx={headCell} align="right">
                  Payments
                </TableCell>
                <TableCell sx={headCell}>Last paid</TableCell>
                <TableCell sx={headCell} align="right">
                  Received
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {received.bySymbol.map((row) => (
                <TableRow key={row.symbol} hover>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{row.symbol}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }} align="right">
                    {row.payments}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }}>{moment(row.lastDate).format('MMM D, YYYY')}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }} align="right">
                    {fnCurrency(row.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        <Box sx={{ flex: 1, overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={headCell}>Recent</TableCell>
                <TableCell sx={headCell}>Account</TableCell>
                <TableCell sx={headCell} align="right">
                  Amount
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {received.recent.map((p) => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontSize: '0.78rem' }}>
                    <Typography component="span" sx={{ fontSize: '0.8rem', fontWeight: 700, mr: 1 }}>
                      {p.symbol}
                    </Typography>
                    {moment(p.date).format('MMM D, YYYY')}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{p.accountName}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem' }} align="right">
                    {fnCurrency(p.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Stack>
      {received.byYear.length > 1 && (
        <>
          <Divider />
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, p: 1.5 }}>
            {received.byYear.map((y) => (
              <Chip
                key={y.year}
                size="small"
                variant="outlined"
                label={`${y.year}: ${fnCurrency(y.amount)}`}
                sx={{ fontSize: '0.7rem' }}
              />
            ))}
          </Stack>
        </>
      )}
    </Panel>
  );
}

export default function DividendIncomeCard({ data, isLoading, error }: Props) {
  if (isLoading) {
    return (
      <Panel title="Dividend income" icon="tabler:cash" flush>
        <StateView state="loading" minHeight={260} />
      </Panel>
    );
  }

  if (error) {
    return (
      <Panel title="Dividend income" icon="tabler:cash" flush>
        <StateView state="error" message={error} minHeight={200} />
      </Panel>
    );
  }

  if (!data || data.holdings.length === 0) {
    return (
      <Stack spacing={2}>
        {data && <DividendsReceivedPanel received={data.received} />}
        <Panel title="Projected dividend income" icon="tabler:cash" flush>
          <StateView
            state="empty"
            title="No dividend payers"
            message="None of your stock holdings currently pay a dividend, or the payment data isn't available yet."
            icon="tabler:cash-off"
            minHeight={200}
          />
        </Panel>
        <FundsNotCovered symbols={data?.fundsNotCovered ?? []} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <DividendsReceivedPanel received={data.received} />
      <Panel
        title="Projected dividend income"
        subtitle={`${data.payerCount} paying position${data.payerCount === 1 ? '' : 's'}`}
        icon="tabler:cash"
        flush
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider flexItem />}>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Projected annual income" value={fnCurrency(data.totalAnnualIncome)} />
          </Box>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Average per month" value={fnCurrency(data.averageMonthlyIncome)} />
          </Box>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Yield on cost (paying positions)" value={`${data.portfolioYieldOnCostPercent}%`} />
          </Box>
        </Stack>
      </Panel>

      <FundsNotCovered symbols={data.fundsNotCovered} />

      {data.upcoming.length > 0 && (
        <Panel title="Upcoming dates" icon="tabler:calendar-dollar" flush>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Symbol</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Event</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }}>Date</TableCell>
                  <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                    Expected
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.upcoming.slice(0, 12).map((event) => (
                  <TableRow key={`${event.symbol}-${event.event}-${event.date}`} hover>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }}>{event.symbol}</TableCell>
                    <TableCell>
                      <Chip
                        label={event.event === 'ex_dividend' ? 'Ex-dividend' : 'Payment'}
                        size="small"
                        sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem' }}>
                      {moment(event.date).format('MMM D, YYYY')}
                      <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled' }}>
                        {moment(event.date).fromNow()}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem' }} align="right">
                      {fnCurrency(event.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </Panel>
      )}

      <Panel title="By holding" icon="tabler:list-details" flush>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontSize: '0.7rem' }}>Symbol</TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Shares
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Per share
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Annual rate
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Yield
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Yield on cost
                </TableCell>
                <TableCell sx={{ fontSize: '0.7rem' }} align="right">
                  Annual income
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.holdings.map((holding) => (
                <TableRow key={holding.symbol} hover>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }}>
                    {holding.symbol}
                    <Typography sx={{ fontSize: '0.64rem', color: 'text.disabled' }} noWrap>
                      {holding.name}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }} align="right">
                    {holding.qty}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }} align="right">
                    {fnCurrency(holding.amountPerShare)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }} align="right">
                    {fnCurrency(holding.annualizedDividend)}
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.78rem' }} align="right">
                    {holding.yieldPercent}%
                  </TableCell>
                  <TableCell
                    sx={{
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      color: holding.yieldOnCostPercent >= holding.yieldPercent ? 'var(--pd-up)' : 'text.primary',
                    }}
                    align="right"
                  >
                    {holding.yieldOnCostPercent}%
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700 }} align="right">
                    {fnCurrency(holding.annualIncome)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Panel>
    </Stack>
  );
}
