import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function overrides(theme: Theme) {
  const isLight = theme.palette.mode === 'light';

  return {
    MuiCssBaseline: {
      styleOverrides: {
        '*': {
          boxSizing: 'border-box',
        },
        html: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: '100%',
          WebkitOverflowScrolling: 'touch',
        },
        body: {
          margin: 0,
          padding: 0,
          width: '100%',
          height: 'auto',
        },
        '#root': {
          width: '100%',
          height: '100%',
        },
        input: {
          '&[type=number]': {
            MozAppearance: 'textfield',
            '&::-webkit-outer-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
            '&::-webkit-inner-spin-button': {
              margin: 0,
              WebkitAppearance: 'none',
            },
          },
        },
        img: {
          maxWidth: '100%',
          display: 'inline-block',
          verticalAlign: 'bottom',
        },
        '::-webkit-scrollbar': {
          width: 5,
          height: 5,
        },
        '::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '::-webkit-scrollbar-thumb': {
          background: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)',
          borderRadius: 10,
        },
        '::-webkit-scrollbar-thumb:hover': {
          background: isLight ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.16)',
        },
        '::selection': {
          background: 'rgba(59,130,246,0.28)',
          color: isLight ? '#1e293b' : '#e2e8f0',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          [`& .${outlinedInputClasses.notchedOutline}`]: {
            borderWidth: '1px',
            borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)',
          },
          '&:hover': {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: isLight ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.20)',
            },
          },
          '&.Mui-focused': {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: theme.palette.primary.main,
              borderWidth: '1.5px',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: theme.palette.text.secondary,
          backgroundColor: theme.palette.background.default,
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: `1px solid ${theme.palette.divider}`,
        },
        root: {
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}`,
          padding: '10px 16px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isLight ? '#ffffff' : '#1e293b',
          color: isLight ? '#334155' : '#e2e8f0',
          fontSize: '0.75rem',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 8,
          boxShadow: isLight ? '0 4px 12px rgba(0,0,0,0.1)' : undefined,
        },
        arrow: {
          color: isLight ? '#ffffff' : '#1e293b',
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        paragraph: {
          marginBottom: theme.spacing(2),
        },
        gutterBottom: {
          marginBottom: theme.spacing(1),
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          ...theme.typography.body2,
          borderRadius: 6,
          margin: '2px 6px',
          '&:hover': {
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${theme.palette.divider}`,
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
          boxShadow: isLight ? '0 1px 3px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: theme.palette.background.paper,
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
          borderRadius: 16,
          boxShadow: isLight ? '0 25px 50px rgba(0,0,0,0.15)' : '0 25px 50px rgba(0,0,0,0.6)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        outlined: {
          borderColor: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)',
          '&:hover': {
            borderColor: isLight ? 'rgba(0,0,0,0.24)' : 'rgba(255,255,255,0.24)',
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.04)',
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          ':active': {
            transform: 'scale(0.9)',
          },
          '&:hover': {
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '6px !important',
          fontWeight: 500,
          fontSize: '0.8125rem',
          color: theme.palette.text.secondary,
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.08)'} !important`,
          padding: '3px 10px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(59,130,246,0.14)',
            color: isLight ? '#2563eb' : '#93c5fd',
            border: '1px solid rgba(59,130,246,0.30) !important',
            '&:hover': {
              backgroundColor: 'rgba(59,130,246,0.20)',
            },
          },
          '&:hover': {
            backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
          },
        },
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: {
          gap: 4,
          '& .MuiToggleButtonGroup-grouped': {
            margin: '0 !important',
          },
        },
      },
    },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          backgroundColor: theme.palette.background.default,
          borderTop: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.secondary,
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
        },
        footerContainer: {
          backgroundColor: theme.palette.background.default,
          borderTop: `1px solid ${theme.palette.divider}`,
        },
        columnHeader: {
          backgroundColor: theme.palette.background.default,
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
        row: {
          '&:hover': {
            backgroundColor: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.035)',
          },
        },
        cell: {
          borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)'}`,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: theme.palette.divider,
        },
      },
    },
  };
}
