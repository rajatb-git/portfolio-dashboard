import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const StyledCalendar = styled('div')(({ theme }) => ({
  marginLeft: -1,
  marginRight: -1,
  marginBottom: -1,
  // Header styles
  '.fc-scrollgrid-sync-inner': {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.primary,
  },

  '.fc-theme-standard td, .fc-theme-standard th': {
    border: `1px solid ${theme.palette.divider}`,
  },

  '.fc .fc-scrollgrid-section-sticky > *': {
    backgroundColor: 'transparent',
    border: 'none',
  },

  '.fc-daygrid-day-top': {
    justifyContent: 'center',
  },

  '.fc-daygrid-day-number': {
    ...theme.typography.subtitle2,
    padding: '10px',
  },

  '.fc-col-header-cell': { border: 'none !important' },

  '.fc-col-header-cell-cushion': {
    padding: '10px',
    ...theme.typography.subtitle2,
  },

  '.fc-scrollgrid': {
    border: 'none',
  },

  '.fc-license-message': {
    display: 'none',
  },

  '.fc-header-toolbar': {
    padding: '8px',
    marginBottom: '0 !important',
    borderBottom: `1px solid ${theme.palette.divider}`,

    '.fc-toolbar-title': {
      ...theme.typography.h6,
    },
  },

  '.fc-event-main': {
    cursor: 'pointer',
  },
}));
