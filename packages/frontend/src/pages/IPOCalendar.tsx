import * as React from 'react';

import { toast } from 'react-toastify';

import apis from '@/api';
import Calendar from '@/components/Calendar/Calendar';
import { ICalendarEvent } from '@/components/Calendar/types';
import theme from '@/components/ThemeRegistry/theme';
import { IIPO } from '@/models/IPOModel';

export default function IPOCalendar() {
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
        toast.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadData();
  }, []);

  return <Calendar events={events} refreshData={loadData} isLoading={isLoading} />;
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
