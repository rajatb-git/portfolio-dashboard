import { Box, Card, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';
import { useNavigate } from 'react-router-dom';

type Earnings = {
  date: string;
  epsEstimate: number | null;
  revenueEstimate: number | null;
  quarter: number;
  year: number;
  hour: string;
};

type Props = {
  peers: string[];
  earnings: Earnings | null;
  currentSymbol: string;
  isPeersLoading: boolean;
  isEarningsLoading: boolean;
};

function formatRevenue(v: number | null) {
  if (!v) return '—';
  if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  return `$${v}`;
}

export default function ResearchPeersCard({ peers, earnings, currentSymbol, isPeersLoading, isEarningsLoading }: Props) {
  const navigate = useNavigate();

  return (
    <Stack spacing={2} sx={{ height: '100%' }}>
      {/* Peers */}
      <Card variant="outlined">
        <Typography sx={{ p: '10px 16px', color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Peer Companies
        </Typography>
        <Divider />
        {isPeersLoading ? (
          <Skeleton variant="rectangular" height={80} sx={{ m: 2, borderRadius: 1 }} />
        ) : (
          <Box sx={{ p: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
            {peers
              .filter((p) => p !== currentSymbol)
              .map((peer) => (
                <Chip
                  key={peer}
                  label={peer}
                  size="small"
                  onClick={() => navigate(`/research?searchText=${peer}`)}
                  sx={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    bgcolor: 'rgba(59,130,246,0.10)',
                    color: '#93c5fd',
                    border: '1px solid rgba(59,130,246,0.22)',
                    '&:hover': { bgcolor: 'rgba(59,130,246,0.22)' },
                  }}
                />
              ))}
          </Box>
        )}
      </Card>

      {/* Next Earnings */}
      <Card variant="outlined">
        <Typography sx={{ p: '10px 16px', color: 'text.secondary', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Next Earnings
        </Typography>
        <Divider />
        {isEarningsLoading ? (
          <Skeleton variant="rectangular" height={80} sx={{ m: 2, borderRadius: 1 }} />
        ) : earnings ? (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" sx={{ alignItems: 'baseline', mb: 1.5 }} spacing={1}>
              <Typography sx={{ fontSize: '1.1rem', fontWeight: 700, color: 'text.primary' }}>
                {moment(earnings.date).format('MMM D, YYYY')}
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.disabled' }}>
                Q{earnings.quarter} FY{earnings.year}{earnings.hour === 'bmo' ? ' · Pre-market' : earnings.hour === 'amc' ? ' · After-close' : ''}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={3}>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}>EPS Est.</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: 'text.primary' }}>
                  {earnings.epsEstimate != null ? `$${earnings.epsEstimate.toFixed(2)}` : '—'}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rev. Est.</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: 'text.primary' }}>
                  {formatRevenue(earnings.revenueEstimate)}
                </Typography>
              </Box>
              <Box>
                <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}>In</Typography>
                <Typography sx={{ fontSize: '0.88rem', fontWeight: 600, color: '#93c5fd' }}>
                  {moment(earnings.date).fromNow()}
                </Typography>
              </Box>
            </Stack>
          </Box>
        ) : (
          <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>No upcoming earnings found.</Typography>
        )}
      </Card>
    </Stack>
  );
}
