import {
  Box,
  Button,
  Card,
  Chip,
  Collapse,
  Divider,
  IconButton,
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
import * as React from 'react';

import type { SymbolPosition } from '@/api/holdings';
import { Iconify } from '@/components/Iconify';
import type { MockTradeInitial } from '@/components/Tax/MockTradeDialog';
import TaxLotsEditDialog from '@/components/Tax/TaxLotsEditDialog';
import TermChip from '@/components/Tax/TermChip';
import { IAccount } from '@/models/AccountsModel';
import { fnCurrency } from '@/utils/formatNumber';

type Props = {
  symbol: string;
  positions: SymbolPosition[];
  accounts: IAccount[];
  isLoading: boolean;
  onLotsSaved: () => void;
  onMockTrade: (initial: MockTradeInitial) => void;
};

const gainColor = (v: number) => (v >= 0 ? 'var(--pd-up)' : 'var(--pd-down)');
const signed = (v: number) => `${v >= 0 ? '+' : ''}${fnCurrency(v)}`;

const headCell = {
  fontSize: '0.68rem',
  color: 'text.disabled',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid',
  borderColor: 'divider',
  whiteSpace: 'nowrap',
} as const;

const cell = {
  fontSize: '0.78rem',
  color: 'text.secondary',
  borderBottom: '1px solid',
  borderColor: 'divider',
  whiteSpace: 'nowrap',
} as const;

function Summary({ label, value, color, hint }: { label: string; value: string; color?: string; hint?: string }) {
  const content = (
    <Box>
      <Typography
        sx={{
          fontSize: '0.68rem',
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: color ?? 'text.secondary' }}>{value}</Typography>
    </Box>
  );
  return hint ? <Tooltip title={hint}>{content}</Tooltip> : content;
}

export default function ResearchPositionDetailsCard({
  symbol,
  positions,
  accounts,
  isLoading,
  onLotsSaved,
  onMockTrade,
}: Props) {
  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());
  const [editing, setEditing] = React.useState<SymbolPosition | null>(null);

  React.useEffect(() => {
    setExpanded(positions.length === 1 ? new Set([positions[0].id]) : new Set());
  }, [positions.map((p) => p.id).join()]);

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const totalMarketValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.originalValue, 0);
  const totalGL = positions.reduce((sum, p) => sum + p.totalGL, 0);
  const totalGLPercent = totalCost > 0 ? (totalGL / totalCost) * 100 : 0;
  const shortTermGain = positions.reduce((sum, p) => sum + p.tax.shortTermGain, 0);
  const longTermGain = positions.reduce((sum, p) => sum + p.tax.longTermGain, 0);
  const estimatedTax = positions.reduce((sum, p) => sum + p.tax.estimatedTax, 0);
  const nextLongTerm = positions
    .map((p) => p.tax.nextLongTerm)
    .filter((n): n is NonNullable<typeof n> => !!n)
    .sort((a, b) => a.daysAway - b.daysAway)[0];
  const hasEstimatedLots = positions.some((p) => p.tax.hasEstimatedLots);

  return (
    <Card variant="outlined">
      <Stack direction="row" sx={{ alignItems: 'center', p: '6px 8px 6px 16px', minHeight: 40 }}>
        <Typography
          sx={{
            color: 'text.secondary',
            fontWeight: 700,
            fontSize: '0.72rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            flexGrow: 1,
          }}
        >
          Position Details & Tax Lots
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onMockTrade({ symbol, action: positions.length ? 'sell' : 'buy' })}
          startIcon={<Iconify icon="tabler:flask" width={14} />}
          sx={{ borderColor: 'divider', color: 'text.secondary' }}
        >
          Mock trade
        </Button>
      </Stack>
      <Divider />

      {isLoading ? (
        <Skeleton variant="rectangular" height={100} sx={{ m: 2, borderRadius: 1 }} />
      ) : positions.length === 0 ? (
        <Typography sx={{ p: 2, fontSize: '0.78rem', color: 'text.disabled' }}>
          Not currently held in any account. Use Mock trade to see what a buy would do.
        </Typography>
      ) : (
        <>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" sx={headCell} />
                  {['Account', 'Qty', 'Avg Price', 'Market Value', 'P&L', 'Short / Long-term', ''].map((h) => (
                    <TableCell key={h} sx={headCell}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              {positions.map((pos) => {
                const isGain = pos.totalGL >= 0;
                const isOpen = expanded.has(pos.id);
                const accountName = accountMap.get(pos.accountId) ?? pos.accountId;
                return (
                  <TableBody key={pos.id}>
                    <TableRow hover>
                      <TableCell padding="checkbox" sx={cell}>
                        <IconButton
                          size="small"
                          aria-label={isOpen ? 'Hide tax lots' : 'Show tax lots'}
                          onClick={() => toggle(pos.id)}
                          sx={{ width: 32, height: 32 }}
                        >
                          <Iconify icon={isOpen ? 'mdi:chevron-up' : 'mdi:chevron-down'} width={18} />
                        </IconButton>
                      </TableCell>
                      <TableCell
                        sx={{
                          ...cell,
                          color: 'text.primary',
                          fontWeight: 500,
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {accountName}
                        <Typography component="span" sx={{ fontSize: '0.7rem', color: 'text.disabled', ml: 0.75 }}>
                          {pos.lots.length} lot{pos.lots.length === 1 ? '' : 's'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={cell}>{pos.qty.toLocaleString()}</TableCell>
                      <TableCell sx={cell}>{fnCurrency(pos.averagePrice)}</TableCell>
                      <TableCell sx={cell}>{fnCurrency(pos.marketValue)}</TableCell>
                      <TableCell sx={{ ...cell, fontWeight: 600, color: gainColor(pos.totalGL) }}>
                        {signed(pos.totalGL)}
                        <Chip
                          label={`${isGain ? '+' : ''}${pos.totalGLPercent.toFixed(2)}%`}
                          size="small"
                          sx={{
                            ml: 0.5,
                            height: 18,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            bgcolor: isGain ? 'var(--pd-up-bg)' : 'var(--pd-down-bg)',
                            color: isGain ? 'var(--pd-up)' : 'var(--pd-down)',
                            border: `1px solid ${isGain ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                            '& .MuiChip-label': { px: 0.75 },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={cell}>
                        <Box component="span" sx={{ color: gainColor(pos.tax.shortTermGain) }}>
                          {signed(pos.tax.shortTermGain)}
                        </Box>
                        <Box component="span" sx={{ color: 'text.disabled', mx: 0.5 }}>
                          /
                        </Box>
                        <Box component="span" sx={{ color: gainColor(pos.tax.longTermGain) }}>
                          {signed(pos.tax.longTermGain)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ ...cell, textAlign: 'right' }}>
                        <Tooltip title="Edit tax lots">
                          <IconButton size="small" aria-label="Edit tax lots" onClick={() => setEditing(pos)}>
                            <Iconify icon="mdi:pencil-outline" width={16} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Mock sell from this account">
                          <IconButton
                            size="small"
                            aria-label="Mock sell"
                            onClick={() => onMockTrade({ symbol, action: 'sell', accountId: pos.accountId })}
                          >
                            <Iconify icon="tabler:flask" width={16} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={8} sx={{ p: 0, border: isOpen ? undefined : 0 }}>
                        <Collapse in={isOpen} unmountOnExit>
                          <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1 }}>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  {['Acquired', 'Qty', 'Cost / Share', 'Cost Basis', 'Value', 'Gain', 'Term'].map(
                                    (h) => (
                                      <TableCell key={h} sx={headCell}>
                                        {h}
                                      </TableCell>
                                    )
                                  )}
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {pos.lots.map((lot) => (
                                  <TableRow key={lot.id} sx={{ '&:last-child td': { border: 0 } }}>
                                    <TableCell sx={cell}>
                                      {moment(lot.date).format('MMM D, YYYY')}
                                      {lot.estimated && (
                                        <Tooltip title="Purchase date or cost was inferred — edit the lots to record the real values">
                                          <Chip
                                            label="Estimated"
                                            size="small"
                                            sx={{
                                              ml: 0.75,
                                              height: 16,
                                              fontSize: '0.6rem',
                                              bgcolor: 'var(--pd-warn-bg)',
                                              color: 'var(--pd-warn)',
                                            }}
                                          />
                                        </Tooltip>
                                      )}
                                    </TableCell>
                                    <TableCell sx={cell}>{lot.qty.toLocaleString()}</TableCell>
                                    <TableCell sx={cell}>{fnCurrency(lot.price)}</TableCell>
                                    <TableCell sx={cell}>{fnCurrency(lot.costBasis)}</TableCell>
                                    <TableCell sx={cell}>{fnCurrency(lot.marketValue)}</TableCell>
                                    <TableCell sx={{ ...cell, color: gainColor(lot.gain), fontWeight: 600 }}>
                                      {signed(lot.gain)}{' '}
                                      <Typography component="span" sx={{ fontSize: '0.7rem' }}>
                                        ({lot.gainPercent >= 0 ? '+' : ''}
                                        {lot.gainPercent.toFixed(1)}%)
                                      </Typography>
                                    </TableCell>
                                    <TableCell sx={cell}>
                                      <TermChip
                                        term={lot.term}
                                        longTermDate={lot.longTermDate}
                                        daysToLongTerm={lot.daysToLongTerm}
                                      />
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                );
              })}
            </Table>
          </Box>

          <Divider />
          <Box sx={{ px: 2, py: 1.5, display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            {positions.length > 1 && (
              <>
                <Summary label="Total Value" value={fnCurrency(totalMarketValue)} />
                <Summary
                  label="Total P&L"
                  value={`${signed(totalGL)} (${totalGLPercent >= 0 ? '+' : ''}${totalGLPercent.toFixed(2)}%)`}
                  color={gainColor(totalGL)}
                />
              </>
            )}
            <Summary label="Short-term" value={signed(shortTermGain)} color={gainColor(shortTermGain)} />
            <Summary label="Long-term" value={signed(longTermGain)} color={gainColor(longTermGain)} />
            <Summary
              label={estimatedTax < 0 ? 'Est. tax saved if sold' : 'Est. tax if sold'}
              value={fnCurrency(Math.abs(estimatedTax))}
              hint="Standalone estimate at your configured rates, before netting against other gains this year. Use Mock trade for the full picture."
            />
            {nextLongTerm && (
              <Summary
                label="Next long-term"
                value={`${moment(nextLongTerm.date).format('MMM D, YYYY')} · ${nextLongTerm.daysAway}d`}
                hint={`${nextLongTerm.qty.toLocaleString()} shares with ${fnCurrency(nextLongTerm.gain)} of gain turn long-term, saving about ${fnCurrency(nextLongTerm.taxSaving)} in federal tax if you wait to sell them.`}
                color="var(--pd-warn)"
              />
            )}
          </Box>
          {hasEstimatedLots && (
            <Typography sx={{ px: 2, pb: 1.5, fontSize: '0.72rem', color: 'var(--pd-warn)' }}>
              Some lots have an estimated purchase date or cost. Use the pencil to record the real values so terms and
              tax estimates are accurate.
            </Typography>
          )}
        </>
      )}

      {editing && (
        <TaxLotsEditDialog
          open={!!editing}
          holdingId={editing.id}
          symbol={symbol}
          accountName={accountMap.get(editing.accountId) ?? editing.accountId}
          lots={editing.lots}
          onClose={() => setEditing(null)}
          onSaved={onLotsSaved}
        />
      )}
    </Card>
  );
}
