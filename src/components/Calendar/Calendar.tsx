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
import Typography from '@mui/material/Typography';

import { useOpenClose } from '@/hooks/useOpenClose';

import { StyledCalendar } from './styles';
import { ICalendarEvent } from './types';
import theme from '../ThemeRegistry/theme';

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
    <>
      {/* <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      >
        <Typography variant="h4">Calendar</Typography>
      </Stack> */}

      <Card variant="outlined">
        <StyledCalendar>
          <FullCalendar
            weekends
            selectable
            rerenderDelay={10}
            allDayMaintainDuration
            eventResizableFromStart
            events={events as any}
            ref={calendarRef}
            initialDate={new Date()}
            dayMaxEventRows={3}
            eventDisplay="block"
            height="auto"
            eventClick={(info) => {
              info.jsEvent.preventDefault(); // don't let the browser navigate

              console.log(info.event.extendedProps);

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
          <Box sx={{ p: 2 }}>
            <Stack direction="row" spacing={4}>
              <Stack direction="column">
                numberOfShares
                <br />
                exchange
                <br />
                price
                <br />
                status
                <br />
                symbol
                <br />
                totalSharesValue
                <br />
              </Stack>
              <Stack direction="column">
                {selectedEvent?.numberOfShares} <br />
                {selectedEvent?.exchange} <br />
                {selectedEvent?.price} <br />
                {selectedEvent?.status} <br />
                {selectedEvent?.symbol} <br />
                {selectedEvent?.totalSharesValue} <br />
              </Stack>
            </Stack>
          </Box>
        </Popover>
      </Card>
    </>
  );
}
