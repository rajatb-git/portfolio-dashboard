import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { fnCurrency, fnPercent } from '@/utils/formatNumber';

import { Total } from './DashboardTable/dashTableUtils';
import theme from './ThemeRegistry/theme';

type TotalCardProps = {
  total: Total;
};

export default function TotalCard({ total }: TotalCardProps) {
  const color = total.totalGL <= 0 ? 'error' : 'success';

  return (
    <Card
      sx={{
        p: 1,
        color: theme.palette.success.contrastText,
        bgcolor: `${color}.dark`,
      }}
    >
      <Stack direction="column" justifyContent="space-between">
        <Stack direction="row" alignItems="center">
          <Typography alignSelf="start" flexGrow={1} variant="subtitle2">
            {total.userId}
          </Typography>
          <Typography variant="body1">{fnCurrency(total.totalGL)}</Typography>
          <Typography variant="subtitle2" component="span" sx={{ ml: 0.5 }}>
            ({total.percentGL > 0 && '+'}
            {fnPercent(total.percentGL)})
          </Typography>
        </Stack>

        <Divider />

        <Stack direction="row" justifyContent="space-between">
          <Stack direction="column">
            <Typography variant="body2">{fnCurrency(total.totalInvestment)}</Typography>
          </Stack>
          <Stack direction="column">
            <Typography variant="body2">{fnCurrency(total.totalInvestment + total.totalGL)}</Typography>
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
}
