import { Box, Button, Grid, Link, Stack, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

import { Iconify } from '@/components/Iconify';
import Panel from '@/components/ui/Panel';

const STEPS = [
  {
    icon: 'tabler:download',
    title: 'Export from your broker',
    body: 'A positions or lot-details CSV for what you hold, and/or an activity CSV for your trade history. A PDF statement works too, read by your local AI.',
  },
  {
    icon: 'tabler:file-import',
    title: 'Import it here',
    body: 'Pick the account, drop the file, check the matched columns and review every row before anything is saved.',
  },
  {
    icon: 'tabler:chart-line',
    title: 'Everything else follows',
    body: 'Live prices, tax lots and holding periods, realized gains, analytics and alerts all build on what you import.',
  },
];

// The Dashboard's first-run state: with nothing imported there is nothing to
// show, so it points at the one thing to do next.
export default function GetStartedCard({ hasAccounts }: { hasAccounts: boolean }) {
  return (
    <Panel title="Let’s bring in your portfolio" icon="tabler:rocket">
      <Stack spacing={2.5}>
        <Typography sx={{ color: 'text.secondary' }}>
          {hasAccounts
            ? 'Your accounts have no holdings yet. Import them from your broker to get started.'
            : 'Start by importing your holdings from your broker — you can create the account as part of the import.'}
        </Typography>
        <Grid container spacing={2}>
          {STEPS.map((s, i) => (
            <Grid key={s.title} size={{ xs: 12, md: 4 }}>
              <Stack direction="row" spacing={1.5}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    display: 'grid',
                    placeItems: 'center',
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </Box>
                <Box>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    <Iconify icon={s.icon} width={18} sx={{ color: 'primary.main' }} />
                    <Typography sx={{ fontWeight: 700 }}>{s.title}</Typography>
                  </Stack>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.5 }}>{s.body}</Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: { sm: 'center' } }}>
          <Button
            variant="contained"
            size="large"
            component={RouterLink}
            to="/import"
            startIcon={<Iconify icon="tabler:file-import" />}
          >
            Import your portfolio
          </Button>
          <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
            Just exploring? Turn on Demo Mode in{' '}
            <Link component={RouterLink} to="/settings?tab=data">
              Settings → Data & Backups
            </Link>
            .
          </Typography>
        </Stack>
      </Stack>
    </Panel>
  );
}
