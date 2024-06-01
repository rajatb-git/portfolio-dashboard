import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { Iconify } from '@/components/Iconify';
import { fnCurrency, fnPercent } from '@/utils/formatNumber';

import { Total } from './DashboardTable/dashTableUtils';

type TotalCardProps = {
  total: Total;
};

export default function TotalCard({ total }: TotalCardProps) {
  const color = total.totalGL <= 0 ? 'error' : 'success';

  return (
    <Card
      sx={{
        p: 1.5,
        color: `${color}.darker`,
        bgcolor: `${color}.lighter`,
      }}
    >
      <Stack direction="row" justifyContent="space-between">
        <Typography sx={{ typography: 'h5' }}>{fnCurrency(total.totalGL)}</Typography>
        {/* <Typography sx={{ mb: 0, typography: 'subtitle2' }}>{total.userId}</Typography> */}

        <Stack direction="row" alignItems="center" justifyContent="flex-end">
          <Iconify icon={total.percentGL >= 0 ? 'eva:trending-up-fill' : 'eva:trending-down-fill'} />

          <Typography variant="subtitle2" component="span" sx={{ ml: 0.5 }}>
            {total.percentGL > 0 && '+'}
            {fnPercent(total.percentGL)}
          </Typography>
        </Stack>
      </Stack>

      <Divider sx={{ my: 0 }}>
        <Typography sx={{ mb: 0, typography: 'subtitle2' }}>{total.userId}</Typography>
      </Divider>

      <Stack direction="row" justifyContent="space-between">
        <Stack direction="column">
          <Typography variant="caption" sx={{ fontSize: '10px' }}>
            Total Investment
          </Typography>
          <Typography>{fnCurrency(total.totalInvestment)}</Typography>
        </Stack>
        <Stack direction="column">
          <Typography variant="caption" sx={{ fontSize: '10px' }}>
            Total Value
          </Typography>
          <Typography>{fnCurrency(total.totalInvestment + total.totalGL)}</Typography>
        </Stack>
      </Stack>
    </Card>
  );
}
