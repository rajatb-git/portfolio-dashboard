'use client';

import * as React from 'react';

import apis from '@/api';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';
import { useSearchParams } from 'next/navigation';
import { CompanyProfile } from '@/models/CompanyProfileModel';
import theme from '@/components/ThemeRegistry/theme';
import { fnCurrency } from '@/utils/formatNumber';
import { Avatar, Box, Grid2, IconButton, Tooltip, Typography } from '@mui/material';
import moment from 'moment';
import { toast } from 'react-toastify';
import ResearchDetailsCard from './ResearchDetailsCard';
import ResearchNewsCard from './ResearchNewsCard';
import { Iconify } from '@/components/Iconify';
import RecommendationDonutGraphMui from '@/components/RecommendationDonutGraphMui';
import { PriceHistoryGraph } from '@/components/PriceHistoryGraph';
import LocalStorageArray from '@/utils/localStorageArray';

function Research() {
  const params = useSearchParams();

  const [_isPriceLoading, setIsPriceLoading] = React.useState(true);
  const [isRecommendationLoading, setIsRecommendationLoading] = React.useState(true);
  const [isNewsLoading, setIsNewsLoading] = React.useState(true);
  const [isCompanyProfileLoading, setIsCompanyProfileLoading] = React.useState(true);

  const [companyProfile, setCompanyProfile] = React.useState<CompanyProfile | undefined>();
  const [price, setPrice] = React.useState<IPriceStore>();
  const [recommendation, setRecommendation] = React.useState<IRecommendation>();
  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [searchText, setSearchText] = React.useState(params.get('searchText')?.toUpperCase() || '');

  const getResearchData = (searchTicker: string) => {
    if (searchTicker && searchTicker.length >= 2) {
      LocalStorageArray.add('searchText', searchText.toUpperCase());

      setIsCompanyProfileLoading(true);
      apis.live
        .getCompanyProfile(searchTicker)
        .then((res) => {
          setCompanyProfile(res);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setIsCompanyProfileLoading(false);
        });

      setIsNewsLoading(true);
      apis.live
        .getLiveNews(searchTicker)
        .then((res) => {
          setNews(res);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setIsNewsLoading(false);
        });

      setIsPriceLoading(true);
      apis.live
        .getLivePrice(searchTicker)
        .then((res) => {
          setPrice(res);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setIsPriceLoading(false);
        });

      setIsRecommendationLoading(true);
      apis.live
        .getLiveRecommendation(searchTicker)
        .then((res) => {
          setRecommendation(res);
        })
        .catch((err) => {
          toast.error(err.message);
        })
        .finally(() => {
          setIsRecommendationLoading(false);
        });
    }
  };

  React.useEffect(() => {
    const searchTicker = params.get('searchText')?.toUpperCase() || '';
    setSearchText(searchTicker);
    getResearchData(searchTicker);
  }, [params]);

  return (
    <>
      <Box sx={{ display: 'flex', flexDirection: 'row', mb: 4 }}>
        <Box sx={{ mr: 2 }}>
          <Avatar
            src={companyProfile?.logo}
            alt={companyProfile?.name}
            sx={{ border: `2px solid ${theme.palette.grey[500]}`, width: 56, height: 56 }}
          />
        </Box>

        <Box>
          <Typography variant="h6">
            {companyProfile?.name} ({companyProfile?.ticker})
          </Typography>

          <Typography variant="h6">
            {fnCurrency(price?.price)}

            <Box
              sx={{
                color: price?.percentChange! > 0 ? theme.palette.success.main : theme.palette.error.main,
                display: 'inline',
                alignItems: 'center',
                ml: 1,
              }}
            >
              ({price?.percentChange && price?.percentChange > 0 && '+'}
              {price?.percentChange.toFixed(2)}%)
            </Box>
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }}></Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'end' }}>
          <Tooltip title="Refresh">
            <IconButton color="primary" onClick={() => getResearchData(searchText)}>
              <Iconify icon="mingcute:refresh-3-fill" width={32} />
            </IconButton>
          </Tooltip>

          <Typography variant="caption" component="div" color="text.secondary" sx={{ textAlign: 'end' }}>
            as of {moment(price?.priceDate).format('lll')}
          </Typography>
        </Box>
      </Box>

      {/* root */}
      <Grid2 container direction="column" spacing={2}>
        {/* row 1 */}
        <Grid2 size={{ xs: 12 }} direction="row" container spacing={2}>
          {/* row 1 col 1 */}
          <Grid2 size={{ sm: 12, md: 6 }} container direction="column" spacing={2}>
            <Grid2>
              <ResearchDetailsCard companyProfile={companyProfile} isCompanyProfileLoading={isCompanyProfileLoading} />
            </Grid2>
            <Grid2>
              <RecommendationDonutGraphMui recommendation={recommendation} isLoading={isRecommendationLoading} />
            </Grid2>
          </Grid2>
          {/* row 1 col 2 */}
          <Grid2 direction="row" size={{ sm: 12, md: 6 }}>
            <ResearchNewsCard news={news} isNewsLoading={isNewsLoading} />
          </Grid2>
        </Grid2>
        {/* row 2 */}
        <Grid2 size={{ xs: 12 }}>
          <PriceHistoryGraph symbol={searchText} />
        </Grid2>
      </Grid2>
    </>
  );
}

export default function ResearchPage() {
  return (
    <React.Suspense>
      <Research />
    </React.Suspense>
  );
}
