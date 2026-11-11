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

  // FullCalendar ships its own grey/navy buttons; match the app's outlined ones.
  '.fc .fc-button': {
    ...theme.typography.button,
    fontSize: '0.78rem',
    textTransform: 'none',
    minHeight: 32,
    padding: '4px 12px',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: 'transparent',
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
    boxShadow: 'none',
    '&:hover': { backgroundColor: theme.palette.action.hover, borderColor: theme.palette.divider },
    '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
    '&:disabled': { opacity: 0.5, color: theme.palette.text.secondary },
  },
  '.fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active': {
    backgroundColor: theme.palette.action.selected,
    borderColor: theme.palette.divider,
    color: theme.palette.text.primary,
  },
  '.fc .fc-button-primary:focus, .fc .fc-button-primary:not(:disabled):active:focus': {
    boxShadow: 'none',
  },
  '.fc .fc-button-group > .fc-button': { borderRadius: theme.shape.borderRadius },
  '.fc .fc-button-group > .fc-button + .fc-button': { marginLeft: 4 },

  '.fc .fc-list': { border: 'none' },
  '.fc .fc-list-day-cushion': { backgroundColor: theme.palette.action.hover },
  '.fc .fc-list-event:hover td': { backgroundColor: theme.palette.action.hover },
  '.fc .fc-list-event-title': { whiteSpace: 'normal' },
  '.fc-theme-standard .fc-list': { borderColor: theme.palette.divider },
}));
