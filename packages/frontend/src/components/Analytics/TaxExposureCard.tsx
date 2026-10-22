import * as React from 'react';

import {
  Box,
  Card,
  Divider,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { TaxExposure } from '@/api/analytics';
import { Iconify } from '@/components/Iconify';
import type { IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  // Bumped by the parent when tax rates change so the estimates are recomputed.
  reloadKey: number;
};

const gainColor = (v: number) => (v >= 0 ? 'var(--pd-up)' : 'var(--pd-down)');
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fnCurrency(v)}`;

function Figure({
  label,
  value,
  color,
  sub,
  hint,
}: {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  hint?: string;
}) {
  const content = (
    <Box>
      <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', textTransform: 'uppercase' }}>{label}</Typography>
      <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: color ?? 'text.primary' }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>{sub}</Typography>}
    </Box>
  );
  return hint ? <Tooltip title={hint}>{content}</Tooltip> : content;
}

export default function TaxExposureCard({ reloadKey }: Props) {
  const navigate = useNavigate();
  const [data, setData] = React.useState<TaxExposure | null>(null);
  const [accounts, setAccounts] = React.useState<IAccount[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    apis.accounts
      .getAll()
      .then((res) => setAccounts(res ?? []))
      .catch((err) => toast.error(err.message || 'Failed to load accounts'));
  }, []);

  React.useEffect(() => {
    setIsLoading(true);
    apis.analytics
      .getTaxExposure()
      .then(setData)
      .catch((err) => {
        setData(null);
        toast.error(err.message || 'Failed to load tax exposure');
      })
      .finally(() => setIsLoading(false));
  }, [reloadKey]);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? id;

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', px: 2, py: 1.25, gap: 1 }}>
        <Iconify icon="tabler:receipt-tax" width={16} sx={{ color: 'primary.main' }} />
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: '0.72rem',
            color: 'text.secondary',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          Tax Exposure
        </Typography>
      </Stack>
      <Divider />

      {isLoading ? (
        <Box sx={{ p: 2 }}>
          <Skeleton variant="rounded" height={140} />
        </Box>
      ) : !data ? (
        <Typography sx={{ p: 2, fontSize: '0.82rem', color: 'text.disabled' }}>
          Tax exposure could not be loaded.
        </Typography>
      ) : (
        <>
          <Stack
            direction="row"
            spacing={3.5}
            useFlexGap
            sx={{ flexWrap: 'wrap', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}
          >
            <Figure
              label="Unrealized short-term"
              value={signed(data.unrealized.shortTerm)}
              color={gainColor(data.unrealized.shortTerm)}
            />
            <Figure
              label="Unrealized long-term"
              value={signed(data.unrealized.longTerm)}
              color={gainColor(data.unrealized.longTerm)}
            />
            <Figure
              label="Est. tax if all sold today"
              value={fnCurrency(data.unrealized.estimatedTaxIfSold)}
              hint={`On top of the gains already realized in ${data.year}, at your configured rates.`}
            />
            <Figure
              label={`Realized ${data.year}`}
              value={signed(data.realizedYtd.total)}
              color={gainColor(data.realizedYtd.total)}
              sub={`Short ${signed(data.realizedYtd.shortTerm)} · Long ${signed(data.realizedYtd.longTerm)}`}
            />
            <Figure
              label={`Est. tax on ${data.year} gains`}
              value={fnCurrency(data.realizedYtd.estimatedTax)}
              color={data.realizedYtd.estimatedTax > 0 ? 'var(--pd-down)' : undefined}
              hint="Negative means realized losses are reducing your ordinary income (up to $3,000 a year)."
            />
          </Stack>

          <Box sx={{ px: 2, pt: 1.5 }}>
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: 'text.secondary' }}>
              Turning long-term in the next 90 days
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled' }}>
              Lots with a gain that drop to the long-term rate soon — selling them before these dates costs more tax.
            </Typography>
          </Box>
          {data.upcomingLongTerm.length === 0 ? (
            <Typography sx={{ px: 2, py: 2, fontSize: '0.78rem', color: 'text.disabled' }}>
              No gaining lots cross the one-year mark in the next 90 days.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {['Symbol', 'Account', 'Qty', 'Acquired', 'Long-term on', 'Gain', 'Tax saved by waiting'].map(
                      (h, i) => (
                        <TableCell
                          key={h}
                          align={i >= 2 ? 'right' : 'left'}
                          sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                        >
                          {h}
                        </TableCell>
                      )
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.upcomingLongTerm.map((u) => (
                    <TableRow
                      key={`${u.accountId}-${u.lotId}`}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/research?searchText=${encodeURIComponent(u.symbol)}`)}
                    >
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600 }}>{u.symbol}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                        {accountName(u.accountId)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
                        {u.qty.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem' }}>
                        {moment(u.acquired).format('MMM D, YYYY')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {moment(u.longTermDate).format('MMM D, YYYY')}
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'var(--pd-warn)', ml: 0.75 }}>
                          {u.daysAway}d
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', color: 'var(--pd-up)' }}>
                        {signed(u.gain)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: '0.78rem', fontWeight: 600 }}>
                        {fnCurrency(u.taxSaving)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', px: 2, py: 1 }}>
            {data.estimatedLots > 0 &&
              `${data.estimatedLots} lot${data.estimatedLots === 1 ? ' has' : 's have'} an estimated purchase date or cost — set them from the position on its Research page. `}
            {data.unpricedPositions > 0 &&
              `${data.unpricedPositions} position${data.unpricedPositions === 1 ? '' : 's'} without a live price ${data.unpricedPositions === 1 ? 'is' : 'are'} left out. `}
            Simplified US federal + state estimate at short-term {data.config.shortTermRate}%, long-term{' '}
            {data.config.longTermRate}%, state {data.config.stateRate}%. Not tax advice.
          </Typography>
        </>
      )}
    </Card>
  );
}
