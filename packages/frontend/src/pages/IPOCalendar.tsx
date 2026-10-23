import { Box, Stack, ToggleButton, ToggleButtonGroup } from '@mui/material';
import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

import apis from '@/api';
import Calendar from '@/components/Calendar/Calendar';
import { ICalendarEvent } from '@/components/Calendar/types';
import { Iconify } from '@/components/Iconify';
import IPOList from '@/components/IPO/IPOList';
import IPOStats from '@/components/IPO/IPOStats';
import { ERROR, INFO, SECONDARY, SUCCESS, WARNING } from '@/components/ThemeRegistry/tokens';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';
import { IIPO } from '@/models/IPOModel';

type ViewMode = 'list' | 'calendar';

export default function IPOCalendar() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [ipos, setIpos] = React.useState<Array<IIPO>>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  // Kept in the URL so Back from an IPO's page returns to the same view.
  const [searchParams, setSearchParams] = useSearchParams();
  const view: ViewMode = searchParams.get('view') === 'calendar' ? 'calendar' : 'list';
  const setView = (next: ViewMode) =>
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'calendar') params.set('view', next);
        else params.delete('view');
        return params;
      },
      { replace: true }
    );

  const loadData = () => {
    setIsLoading(true);
    setLoadError(null);

    apis.live
      .getIPOs()
      .then((response) => {
        setIpos(response);
      })
      .catch((err) => {
        setLoadError(err.message || 'Failed to load IPOs');
        toast.error(err.message || 'Failed to load IPOs');
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
            error={loadError}
            onToggleWatch={(ipo, watched) =>
              setIpos((prev) => prev.map((x) => (x.symbol === ipo.symbol ? { ...x, watched } : x)))
            }
          />
        ) : (
          <Calendar events={events} legend={STATUS_LEGEND} />
        )}
      </Box>
    </Stack>
  );
}

const STATUS_COLORS: Record<IIPO['status'], string> = {
  expected: WARNING.main,
  filed: INFO.main,
  priced: SUCCESS.main,
  withdrawn: ERROR.main,
};

const STATUS_LEGEND = [
  { label: 'Expected', color: STATUS_COLORS.expected },
  { label: 'Filed', color: STATUS_COLORS.filed },
  { label: 'Priced', color: STATUS_COLORS.priced },
  { label: 'Withdrawn', color: STATUS_COLORS.withdrawn },
];

const getEventColor = (event: ICalendarEvent | IIPO) => (event.status && STATUS_COLORS[event.status]) || SECONDARY.main;
