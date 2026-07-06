'use client';

import React from 'react';

import { EventHoveringArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import FullCalendar from '@fullcalendar/react';
import { Box, Popover } from '@mui/material';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';

import { fnCurrency, fnShortenCurrency, fnShortenNumber } from '@/utils/formatNumber';

import { StyledCalendar } from './styles';
import { ICalendarEvent } from './types';

type Props = { events: Array<ICalendarEvent> };

export default function CalendarView({ events }: Props) {
  const calendarRef = React.useRef<FullCalendar>(null);
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [selectedEvent, setSelectedEvent] = React.useState<ICalendarEvent>();

  const handlePopoverOpen = (event: EventHoveringArg) => {
    setAnchorEl(event.el);
    setPopoverOpen(true);
    setSelectedEvent(event.event.extendedProps as any);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
    setPopoverOpen(false);
  };

  return (
    <Card variant="outlined">
        <StyledCalendar>
          <FullCalendar
            weekends
            rerenderDelay={10}
            allDayMaintainDuration
            eventResizableFromStart
            events={events as any}
            ref={calendarRef}
            initialDate={new Date()}
            now={new Date()}
            dayMaxEventRows={3}
            eventDisplay="block"
            height="auto"
            eventClick={(info) => {
              info.jsEvent.preventDefault(); // don't let the browser navigate

              if (info.event.url) {
                window.open(info.event.url);
              }
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
          sx={{
            pointerEvents: 'none',
          }}
          open={popoverOpen}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          onClose={handlePopoverClose}
          disableRestoreFocus
        >
          <Box sx={{ p: 2, backgroundColor: 'black' }}>
            <Stack direction="row" spacing={4}>
              <Stack direction="column">
                numberOfShares:
                <br />
                exchange:
                <br />
                price:
                <br />
                status:
                <br />
                symbol:
                <br />
                totalSharesValue:
                <br />
              </Stack>
              <Stack direction="column">
                {selectedEvent?.numberOfShares ? fnShortenNumber(selectedEvent.numberOfShares) : '-'} <br />
                {selectedEvent?.exchange} <br />
                {selectedEvent?.price ? fnCurrency(parseInt(selectedEvent.price)) : '-'} <br />
                {selectedEvent?.status} <br />
                {selectedEvent?.symbol} <br />
                {selectedEvent?.totalSharesValue ? fnShortenCurrency(selectedEvent.totalSharesValue) : '-'} <br />
              </Stack>
            </Stack>
          </Box>
        </Popover>
    </Card>
  );
}
