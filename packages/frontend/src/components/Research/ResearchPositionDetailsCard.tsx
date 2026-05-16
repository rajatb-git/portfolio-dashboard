import { Box, Card, Chip, Divider, Skeleton, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import { HoldingAggregate } from '@/api/dashboard';
import { IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  positions: HoldingAggregate[];
  accounts: IAccount[];
  isLoading: boolean;
};

export default function ResearchPositionDetailsCard({ positions, accounts, isLoading }: Props) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));

  const totalMarketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.originalValue, 0);
  const totalGL = positions.reduce((sum, p) => sum + p.totalGL, 0);
  const totalGLPercent = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;

  return (
    <Card variant="outlined">
      <Typography
        sx={{
          p: '10px 16px',
          color: 'text.secondary',
          fontWeight: 700,
          fontSize: '0.72rem',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Position Details
      </Typography>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={100} sx={{ m: 2, borderRadius: 1 }} />
      ) : positions.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>
          Not currently held in any account.
        </Typography>
      ) : (
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['Account', 'Qty', 'Avg Price', 'Market Value', 'P&L'].map((h) => (
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
              {positions.map((pos, i) => {
                const isGain = pos.totalGL >= 0;
                return (
                  <TableRow key={i} sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        color: 'text.primary',
                        fontWeight: 500,
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        maxWidth: 160,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {accountMap.get(pos.accountId) ?? pos.accountId}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {pos.qty.toLocaleString()}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {fnCurrency(pos.averagePrice)}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: 'text.secondary', borderBottom: '1px solid', borderColor: 'divider' }}>
                      {fnCurrency(pos.marketValue)}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        color: isGain ? '#4ade80' : '#f87171',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {isGain ? '+' : ''}
                      {fnCurrency(pos.totalGL)}
                      <Chip
                        label={`${isGain ? '+' : ''}${pos.totalGLPercent.toFixed(2)}%`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          bgcolor: isGain ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                          color: isGain ? '#4ade80' : '#f87171',
                          border: `1px solid ${isGain ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                          '& .MuiChip-label': { px: 0.75 },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {positions.length > 1 && (
            <>
              <Divider />
              <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                    Total Value
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: 'text.secondary' }}>
                    {fnCurrency(totalMarketValue)}
                  </Typography>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: '0.68rem', color: 'text.disabled', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.25 }}>
                    Total P&L
                  </Typography>
                  <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: totalGL >= 0 ? '#4ade80' : '#f87171' }}>
                    {totalGL >= 0 ? '+' : ''}
                    {fnCurrency(totalGL)} ({totalGLPercent >= 0 ? '+' : ''}
                    {totalGLPercent.toFixed(2)}%)
                  </Typography>
                </Box>
              </Box>
            </>
          )}
        </Box>
      )}
    </Card>
  );
}
