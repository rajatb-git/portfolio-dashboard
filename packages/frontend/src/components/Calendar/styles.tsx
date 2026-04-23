import { styled } from '@mui/material/styles';

// ----------------------------------------------------------------------

export const StyledCalendar = styled('div')(({ theme }) => ({
  marginLeft: -1,
  marginRight: -1,
  marginBottom: -1,
  // Header styles

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

  '.fc-popover': {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: theme.palette.mode === 'light' ? '0 8px 32px rgba(0,0,0,0.12)' : '0 8px 32px rgba(0,0,0,0.5)',
    '.fc-popover-header': {
      backgroundColor: theme.palette.background.paper,
      padding: '8px 12px',
    },
    '.fc-popover-body': {
      backgroundColor: theme.palette.background.default,
      padding: '6px 8px',
    },
    '.fc-popover-title': {
      ...theme.typography.caption,
      fontWeight: 600,
    },
  },

  '.fc-event-title-container': {
    marginLeft: '8px',
  },

  '.fc-event-main': {
    cursor: 'pointer',
  },
}));
