'use client';

import { EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import { Box, Popover, Typography, useMediaQuery, useTheme } from '@mui/material';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { fnShortenCurrency, fnShortenNumber } from '@/utils/formatNumber';

import { StyledCalendar } from './styles';
import { ICalendarEvent } from './types';

type Props = { events: Array<ICalendarEvent>; legend?: Array<{ label: string; color: string }> };

const DETAIL_ROWS: Array<{ label: string; value: (e: ICalendarEvent) => string }> = [
  { label: 'Symbol', value: (e) => e.symbol || '—' },
  { label: 'Status', value: (e) => (e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '—') },
  { label: 'Exchange', value: (e) => e.exchange || '—' },
  { label: 'Price', value: (e) => (e.price ? `$${e.price}` : '—') },
  { label: 'Shares', value: (e) => (e.numberOfShares ? fnShortenNumber(e.numberOfShares) : '—') },
  { label: 'Value', value: (e) => (e.totalSharesValue ? fnShortenCurrency(e.totalSharesValue) : '—') },
];

export default function CalendarView({ events, legend }: Props) {
  const navigate = useNavigate();
  const theme = useTheme();
  // A month grid cuts names to a few characters on a phone; a list keeps them whole.
  const isPhone = useMediaQuery(theme.breakpoints.down('sm'));
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<ICalendarEvent>();

  const handlePopoverOpen = (event: EventHoveringArg) => {
    setAnchorEl(event.el);
    setSelectedEvent({ ...(event.event.extendedProps as ICalendarEvent), title: event.event.title });
  };

  const handlePopoverClose = () => setAnchorEl(null);

  return (
    <Card variant="outlined">
      {legend && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', columnGap: 2, rowGap: 0.5, px: 2, py: 1 }}>
          {legend.map((item) => (
            <Stack key={item.label} direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: item.color }} />
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{item.label}</Typography>
            </Stack>
          ))}
        </Stack>
      )}
      <StyledCalendar>
        <FullCalendar
          key={isPhone ? 'list' : 'grid'}
          initialView={isPhone ? 'listMonth' : 'dayGridMonth'}
          weekends
          rerenderDelay={10}
          events={events as any}
          initialDate={new Date()}
          now={new Date()}
          dayMaxEventRows={3}
          eventDisplay="block"
          height="auto"
          eventClick={(info) => {
            info.jsEvent.preventDefault();
            handlePopoverClose();
            if (info.event.id) navigate(`/ipo-calendar/${info.event.id}`);
          }}
          eventMouseEnter={handlePopoverOpen}
          eventMouseLeave={handlePopoverClose}
          headerToolbar={{
            left: 'today',
            center: 'title',
            right: 'prev next',
          }}
          plugins={[listPlugin, dayGridPlugin, interactionPlugin]}
        />
      </StyledCalendar>

      <Popover
        sx={{ pointerEvents: 'none' }}
        open={!!anchorEl}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        onClose={handlePopoverClose}
        disableRestoreFocus
      >
        {selectedEvent && (
          <Box sx={{ p: 1.5, minWidth: 200 }}>
            <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, mb: 0.75 }}>{selectedEvent.title}</Typography>
            {DETAIL_ROWS.map((row) => (
              <Stack key={row.label} direction="row" sx={{ justifyContent: 'space-between', gap: 2 }}>
                <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{row.label}</Typography>
                <Typography sx={{ fontSize: '0.75rem' }}>{row.value(selectedEvent)}</Typography>
              </Stack>
            ))}
          </Box>
        )}
      </Popover>
    </Card>
  );
}
