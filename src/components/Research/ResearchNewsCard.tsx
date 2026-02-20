import theme from '@/components/ThemeRegistry/theme';
import { IMarketNews } from '@/models/MarketNews';
import { Box, Card, Divider, Link, List, ListItemButton, ListItemText, Skeleton, Typography } from '@mui/material';
import moment from 'moment';

type Props = {
  news: Array<IMarketNews>;
  isNewsLoading: boolean;
};

export default function ResearchNewsCard({ news, isNewsLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ height: { sm: 400, md: 630 } }}>
      <Typography variant="body1" sx={{ p: '8px 16px', color: 'text.secondary', fontWeight: 800 }}>
        News
      </Typography>

      {!isNewsLoading ? (
        news && (
          <List sx={{ pt: 0 }}>
            {news.map((x) => (
              <Box key={x.id}>
                <ListItemButton
                  href={x.url}
                  component={Link}
                  target="_blank"
                  rel="noreferrer"
                  sx={{ flexDirection: 'column' }}
                >
                  {/* {x.image && (
                        <ListItemAvatar>
                          <Avatar src={x.image} />
                        </ListItemAvatar>
                      )} */}

                  <ListItemText primary={x.headline} secondary={x.summary} sx={{ alignSelf: 'flex-start' }} />

                  <Box sx={{ display: 'flex', width: '100%' }}>
                    <Typography variant="caption" sx={{ alignSelf: 'flex-start', color: theme.palette.grey[600] }}>
                      {x.source}
                    </Typography>

                    <Box sx={{ flexGrow: 1 }}></Box>

                    <Typography variant="caption" sx={{ alignSelf: 'flex-end', color: theme.palette.grey[600] }}>
                      {moment(x.datetime).format('lll')}
                    </Typography>
                  </Box>
                </ListItemButton>
                <Divider component="li" variant="middle" />
              </Box>
            ))}
          </List>
        )
      ) : (
        <Skeleton variant="rectangular" height={200} />
      )}
    </Card>
  );
}
