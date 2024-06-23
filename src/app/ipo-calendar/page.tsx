'use client';

import * as React from 'react';

import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { enqueueSnackbar } from 'notistack';

import apis from '@/api';
import Calendar from '@/components/Calendar/Calendar';
import { ICalendarEvent } from '@/components/Calendar/types';
import theme from '@/components/ThemeRegistry/theme';
import { IIPO } from '@/models/IPOModel';

import Error from './error';

export default function IPOCalendarPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [events, setEvents] = React.useState<Array<ICalendarEvent>>([]);

  const loadData = () => {
    setIsLoading(true);

    apis.live
      .getIPOs()
      .then((response) => {
        const ipoEvents = response.map((x) => ({
          id: x.id,
          title: x.name,
          color: getEventColor(x),
          allDay: true,
          start: x.date,
          numberOfShares: x.numberOfShares,
          exchange: x.exchange,
          price: x.price,
          status: x.status,
          symbol: x.symbol,
          totalSharesValue: x.totalSharesValue,
        }));
        setEvents(ipoEvents);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return (
    <ErrorBoundary errorComponent={Error}>
      <Calendar events={events} />
    </ErrorBoundary>
  );
}

const getEventColor = (event: ICalendarEvent | IIPO) => {
  switch (event.status) {
    case 'expected':
      return theme.palette.warning.main;
    case 'priced':
      return theme.palette.primary.main;
    case 'withdrawn':
      return theme.palette.error.main;
    case 'filed':
      return theme.palette.warning.main;
    default:
      return theme.palette.secondary.main;
  }
};
