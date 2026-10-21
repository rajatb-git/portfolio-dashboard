import { Chip, Tooltip } from '@mui/material';
import moment from 'moment';

import type { TaxTerm } from '@/api/holdings';

type Props = {
  term: TaxTerm;
  longTermDate?: string;
  daysToLongTerm?: number;
};

export default function TermChip({ term, longTermDate, daysToLongTerm }: Props) {
  const isLong = term === 'long';
  const label = isLong ? 'Long' : daysToLongTerm !== undefined ? `Short · ${daysToLongTerm}d` : 'Short';
  const chip = (
    <Chip
      label={label}
      size="small"
      sx={{
        height: 18,
        fontSize: '0.62rem',
        fontWeight: 600,
        bgcolor: isLong ? 'var(--pd-up-bg)' : 'var(--pd-warn-bg)',
        color: isLong ? 'var(--pd-up)' : 'var(--pd-warn)',
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
  if (isLong || !longTermDate) return chip;
  return <Tooltip title={`Becomes long-term on ${moment(longTermDate).format('MMM D, YYYY')}`}>{chip}</Tooltip>;
}
