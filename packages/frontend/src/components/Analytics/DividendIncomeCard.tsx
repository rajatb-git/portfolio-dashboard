import {
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

import type { DividendSummary } from '@/api/analytics';
import Metric from '@/components/ui/Metric';
import Panel from '@/components/ui/Panel';
import StateView from '@/components/ui/StateView';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  data: DividendSummary | null;
  isLoading: boolean;
  error: string | null;
};

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
      <Panel title="Dividend income" icon="tabler:cash" flush>
        <StateView
          state="empty"
          title="No dividend payers"
          message="None of your stock holdings currently pay a dividend, or the payment data isn't available yet."
          icon="tabler:cash-off"
          minHeight={200}
        />
      </Panel>
    );
  }

  return (
    <Stack spacing={2}>
      <Panel title="Dividend income" subtitle={`${data.payerCount} paying position${data.payerCount === 1 ? '' : 's'}`} icon="tabler:cash" flush>
        <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider flexItem />}>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Projected annual income" value={fnCurrency(data.totalAnnualIncome)} />
          </Box>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Average per month" value={fnCurrency(data.averageMonthlyIncome)} />
          </Box>
          <Box sx={{ flex: 1, p: 2 }}>
            <Metric label="Yield on cost" value={`${data.portfolioYieldOnCostPercent}%`} />
          </Box>
        </Stack>
      </Panel>

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
