import * as React from 'react';

import { Box, Button, Stack, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import Calendar from '@/components/Calendar/Calendar';
import { ICalendarEvent } from '@/components/Calendar/types';
import { Iconify } from '@/components/Iconify';
import IPOList from '@/components/IPO/IPOList';
import IPOStats from '@/components/IPO/IPOStats';
import theme from '@/components/ThemeRegistry/theme';
import { IIPO } from '@/models/IPOModel';

type ViewMode = 'list' | 'calendar';

export default function IPOCalendar() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [ipos, setIpos] = React.useState<Array<IIPO>>([]);
  const [view, setView] = React.useState<ViewMode>('list');

  const loadData = () => {
    setIsLoading(true);

    apis.live
      .getIPOs()
      .then((response) => {
        setIpos(response);
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

  const events = React.useMemo<Array<ICalendarEvent>>(
    () =>
      ipos.map((x) => ({
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
      })),
    [ipos]
  );

  const handleViewChange = (_event: React.MouseEvent<HTMLElement>, next: ViewMode | null) => {
    if (next) {
      setView(next);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          IPO Calendar
        </Typography>

        <ToggleButtonGroup size="small" value={view} exclusive onChange={handleViewChange} aria-label="view-mode">
          <ToggleButton value="list">
            <Iconify icon="mdi:format-list-bulleted" width={16} sx={{ mr: 0.5 }} />
            List
          </ToggleButton>
          <ToggleButton value="calendar">
            <Iconify icon="mdi:calendar-month-outline" width={16} sx={{ mr: 0.5 }} />
            Calendar
          </ToggleButton>
        </ToggleButtonGroup>

        <Button
          variant="contained"
          startIcon={<Iconify icon="mynaui:refresh" />}
          onClick={loadData}
          size="small"
          color="secondary"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Stack>

      <IPOStats ipos={ipos} isLoading={isLoading} />

      <Box>{view === 'list' ? <IPOList ipos={ipos} isLoading={isLoading} /> : <Calendar events={events} />}</Box>
    </Stack>
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
