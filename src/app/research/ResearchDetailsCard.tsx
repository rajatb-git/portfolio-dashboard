import { CompanyProfile } from '@/models/CompanyProfileModel';
import { fnFormatCap, fnShortenNumber } from '@/utils/formatNumber';
import { Box, Card, Divider, List, ListItem, ListItemText, Skeleton, Typography } from '@mui/material';
import moment from 'moment';

type Props = {
  companyProfile?: CompanyProfile;
  isCompanyProfileLoading: boolean;
};

export default function ResearchDetailsCard({ companyProfile, isCompanyProfileLoading }: Props) {
  return (
    <Card variant="outlined" sx={{ flexGrow: 1, height: 384 }}>
      <Typography variant="body1" sx={{ p: '8px 16px', color: 'text.secondary', fontWeight: 800 }}>
        Details
      </Typography>

      <Box>
        {!isCompanyProfileLoading ? (
          companyProfile && (
            <List
              sx={{
                p: 0,
                'li:last-child': {
                  border: 'none',
                },
              }}
            >
              {[
                { key: 'country', label: 'Country', value: companyProfile['country'] },
                { key: 'currency', label: 'Currency', value: companyProfile['currency'] },
                { key: 'exchange', label: 'Exchange', value: companyProfile['exchange'] },
                { key: 'industry', label: 'Industry', value: companyProfile['industry'] },
                {
                  key: 'shareOutstanding',
                  label: 'Shares Outstanding',
                  value: fnShortenNumber(companyProfile['shareOutstanding'] * Math.pow(10, 6)),
                },
                {
                  key: 'marketCap',
                  label: 'Market Cap',
                  value: fnFormatCap(companyProfile['marketCap']),
                },
                { key: 'ipo', label: 'IPO Date', value: moment(companyProfile['ipo']).format('ll') },
              ].map(
                (x) =>
                  x.value && (
                    <ListItem key={x.key} secondaryAction={<ListItemText primary={x.value} />} divider>
                      <ListItemText primary={x.label} slotProps={{ primary: { textTransform: 'capitalize' } }} />
                    </ListItem>
                  )
              )}
            </List>
          )
        ) : (
          <Skeleton variant="rectangular" height={200} />
        )}
      </Box>
    </Card>
  );
}
