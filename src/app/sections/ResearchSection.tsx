'use client';

import * as React from 'react';

import { Alert, Box, Card, CardMedia, Link, Skeleton, Stack, Typography } from '@mui/material';
import moment from 'moment';
import { useSearchParams } from 'next/navigation';
import { SnackbarProvider } from 'notistack';

import apis from '@/api';
import { PriceHistoryGraph } from '@/components/PriceHistoryGraph';
import { RecommendationDonutGraph } from '@/components/RecommendationDonutGraph';
import theme from '@/components/ThemeRegistry/theme';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';
import { IMarketNews } from '@/models/MarketNews';
import { IPriceStore } from '@/models/PriceStoreModel';
import { IRecommendation } from '@/models/RecommendationModel';
import { fnCurrency, fnPercent } from '@/utils/formatNumber';

export default function ResearchSection() {
  const params = useSearchParams();

  const [isPriceLoading, setIsPriceLoading] = React.useState(true);
  const [isRecommendationLoading, setIsRecommendationLoading] = React.useState(true);
  const [isNewsLoading, setIsNewsLoading] = React.useState(true);

  const [priceError, setPriceError] = React.useState('');
  const [recommendationError, setRecommendationError] = React.useState('');
  const [newsError, setNewsError] = React.useState('');

  const [price, setPrice] = React.useState<IPriceStore>();
  const [recommendation, setRecommendation] = React.useState<IRecommendation>();
  const [news, setNews] = React.useState<Array<IMarketNews>>([]);
  const [searchText, setSearchText] = React.useState(params.get('searchText')?.toUpperCase() || '');

  const getResearchData = () => {
    if (searchText && searchText.length >= 2) {
      setIsPriceLoading(true);
      apis.live
        .getLivePrice(searchText)
        .then((res) => {
          setPrice(res);
        })
        .catch((err) => {
          setPriceError(err.message);
        })
        .finally(() => {
          setIsPriceLoading(false);
        });

      setIsRecommendationLoading(true);
      apis.live
        .getLiveRecommendation(searchText)
        .then((res) => {
          setRecommendation(res);
        })
        .catch((err) => {
          setRecommendationError(err.message);
        })
        .finally(() => {
          setIsRecommendationLoading(false);
        });

      setIsNewsLoading(true);
      apis.live
        .getLiveNews(searchText)
        .then((res) => {
          setNews(res);
        })
        .catch((err) => {
          setNewsError(err.message);
        })
        .finally(() => {
          setIsNewsLoading(false);
        });
    }
  };

  React.useEffect(() => {
    setSearchText(params.get('searchText')?.toUpperCase() || '');

    getResearchData();
  }, [params]);

  return (
    <>
      {priceError && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {priceError}
        </Alert>
      )}

      {isPriceLoading ? (
        <Skeleton variant="rounded" height={32} />
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" component="span" sx={{ mr: 1 }}>
              {fnCurrency(price?.price)}
            </Typography>

            <Typography
              variant="h6"
              component="span"
              sx={{ color: price?.percentChange! > 0 ? theme.palette.success.main : theme.palette.error.main }}
            >
              ({price?.percentChange && price?.percentChange > 0 && '+'}
              {price?.percentChange.toFixed(2)}%)
            </Typography>

            <Typography variant="caption" component="div" color="text.secondary">
              as of {moment(price?.priceDate).format('lll')}
            </Typography>
          </Box>

          <Box sx={{ textAlign: 'end' }}>
            <Typography variant="h6" component="span">
              {searchText}
            </Typography>

            <Typography variant="caption" component="div" color="text.secondary">
              {fnCurrency(price?.dayHigh)} / {fnCurrency(price?.dayLow)}
            </Typography>
          </Box>
        </Box>
      )}

      <RecommendationDonutGraph recommendation={recommendation!} isLoading={isRecommendationLoading} />

      {isPriceLoading ? (
        <Skeleton variant="rounded" height={150} sx={{ my: 2 }} />
      ) : (
        <PriceHistoryGraph symbol={searchText} price={price?.price || 0} />
      )}

      {isNewsLoading ? (
        <Skeleton variant="text" />
      ) : (
        news.map((x) => (
          <Card
            key={x.id}
            sx={{ display: 'flex', mb: 1, textDecoration: 'none', zIndex: 999 }}
            href={x.url}
            component={Link}
            target="_blank"
            rel="noreferrer"
          >
            {x.image && (
              <CardMedia component="img" sx={{ width: 151 }} image={x.image} alt="Live from space album cover" />
            )}

            <Box sx={{ display: 'flex', flexDirection: 'column', m: 1 }}>
              <Typography variant="subtitle2" fontWeight={900}>
                {x.headline}
              </Typography>

              <Typography variant="body2" sx={{ mt: 1 }}>
                {x.summary}
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  {x.source}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {moment(x.datetime).format('lll')}
                </Typography>
              </Box>
            </Box>
          </Card>
        ))
      )}

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </>
  );
}
