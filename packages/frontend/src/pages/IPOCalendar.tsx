import * as React from 'react';

import { Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import Calendar from '@/components/Calendar/Calendar';
import { ICalendarEvent } from '@/components/Calendar/types';
import { Iconify } from '@/components/Iconify';
import IPOList from '@/components/IPO/IPOList';
import IPOStats from '@/components/IPO/IPOStats';
import { ERROR, PRIMARY, SECONDARY, WARNING } from '@/components/ThemeRegistry/tokens';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';
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
      <PageHeader
        title="IPO Calendar"
        subtitle="Upcoming and recent listings"
        actions={
          <>
            <ToggleButtonGroup
              size="small"
              value={view}
              exclusive
              onChange={handleViewChange}
              aria-label="Calendar view mode"
            >
              <ToggleButton value="list">
                <Iconify icon="tabler:list" width={15} sx={{ mr: 0.5 }} aria-hidden />
                List
              </ToggleButton>
              <ToggleButton value="calendar">
                <Iconify icon="tabler:calendar-month" width={15} sx={{ mr: 0.5 }} aria-hidden />
                Calendar
              </ToggleButton>
            </ToggleButtonGroup>

            <ToolbarButton
              icon="tabler:refresh"
              label="Refresh IPO calendar"
              onClick={loadData}
              busy={isLoading}
              color="primary.main"
            />
          </>
        }
      />

      <IPOStats ipos={ipos} isLoading={isLoading} />

      <Box>
        {view === 'list' ? (
          <IPOList
            ipos={ipos}
            isLoading={isLoading}
            onToggleWatch={(ipo, watched) =>
              setIpos((prev) => prev.map((x) => (x.symbol === ipo.symbol ? { ...x, watched } : x)))
            }
          />
        ) : (
          <Calendar events={events} />
        )}
      </Box>
    </Stack>
  );
}

const getEventColor = (event: ICalendarEvent | IIPO) => {
  switch (event.status) {
    case 'expected':
      return WARNING.main;
    case 'priced':
      return PRIMARY.main;
    case 'withdrawn':
      return ERROR.main;
    case 'filed':
      return WARNING.main;
    default:
      return SECONDARY.main;
  }
};
