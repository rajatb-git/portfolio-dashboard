import { IMarketNews } from '@/models/MarketNews';
import { Box, Card, Divider, Link, List, ListItemButton, ListItemText, Skeleton, Typography } from '@mui/material';
import moment from 'moment';

type Props = {
  news: Array<IMarketNews>;
  isNewsLoading: boolean;
};

export default function ResearchNewsCard({ news, isNewsLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ width: '100%', maxHeight: 640, display: 'flex', flexDirection: 'column' }}>
      <Typography variant="body1" sx={{ p: '8px 16px', color: 'text.secondary', fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        News
      </Typography>

      <Divider />

      {!isNewsLoading ? (
        news && (
          <List sx={{ pt: 0, overflow: 'auto', flexGrow: 1, minHeight: 0 }}>
            {news.map((x) => (
              <Box key={x.id}>
                <ListItemButton
                  href={x.url}
                  component={Link}
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    py: 1.5,
                    px: 2,
                    '&:hover': { bgcolor: 'action.hover' },
                  }}
                >
                  <ListItemText
                    primary={x.headline}
                    secondary={x.summary}
                    sx={{ alignSelf: 'flex-start', m: 0, mb: 0.75 }}
                    slotProps={{
                      primary: { sx: { fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.4, color: 'text.primary' } },
                      secondary: { sx: { fontSize: '0.78rem', lineHeight: 1.4, color: 'text.secondary', mt: 0.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } },
                    }}
                  />

                  <Box sx={{ display: 'flex', width: '100%', mt: 0.25 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 500 }}>
                      {x.source}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                      {moment(x.datetime).format('MMM D, h:mm a')}
                    </Typography>
                  </Box>
                </ListItemButton>
                <Divider sx={{ opacity: 0.5 }} />
              </Box>
            ))}
          </List>
        )
      ) : (
        <Skeleton variant="rectangular" height={200} sx={{ m: 2, borderRadius: 1 }} />
      )}
    </Card>
  );
}
