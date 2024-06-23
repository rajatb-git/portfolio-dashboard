import { useState, useCallback, useRef } from 'react';

import FullCalendar from '@fullcalendar/react';

import { CALENDAR_COLOR_OPTIONS } from './CalendarConfig';
import { ICalendarView } from './types';

// ----------------------------------------------------------------------

export default function useCalendar() {
  const calendarRef = useRef<FullCalendar>(null);

  const calendarEl = calendarRef.current;

  const [date, setDate] = useState(new Date());

  const [view, setView] = useState<ICalendarView>('dayGridMonth');

  const onInitialView = useCallback(() => {
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      const newView = 'dayGridMonth';
      calendarApi.changeView(newView);
      setView(newView);
    }
  }, [calendarEl]);

  const onChangeView = useCallback(
    (newView: ICalendarView) => {
      if (calendarEl) {
        const calendarApi = calendarEl.getApi();

        console.log(newView);
        calendarApi.changeView(newView);
        setView(newView);
      }
    },
    [calendarEl]
  );

  const onDateToday = useCallback(() => {
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.today();
      setDate(calendarApi.getDate());
    }
  }, [calendarEl]);

  const onDatePrev = useCallback(() => {
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.prev();
      setDate(calendarApi.getDate());
    }
  }, [calendarEl]);

  const onDateNext = useCallback(() => {
    if (calendarEl) {
      const calendarApi = calendarEl.getApi();

      calendarApi.next();
      setDate(calendarApi.getDate());
    }
  }, [calendarEl]);

  return {
    calendarRef,
    //
    view,
    date,
    //
    onDatePrev,
    onDateNext,
    onDateToday,
    onInitialView,
    onChangeView,
  };
}
