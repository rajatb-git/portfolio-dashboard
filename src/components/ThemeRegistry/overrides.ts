import { outlinedInputClasses } from '@mui/material/OutlinedInput';
import { Theme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export function overrides(theme: Theme) {
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
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          [`& .${outlinedInputClasses.notchedOutline}`]: {
            borderWidth: '1px',
            borderColor: 'rgba(255,255,255,0.10)',
          },
          '&:hover': {
            [`& .${outlinedInputClasses.notchedOutline}`]: {
              borderColor: 'rgba(255,255,255,0.20)',
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
          backgroundColor: '#060c18',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        },
        root: {
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          padding: '10px 16px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1e293b',
          fontSize: '0.75rem',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
        },
        arrow: {
          color: '#1e293b',
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
            backgroundColor: 'rgba(255,255,255,0.06)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(255,255,255,0.07)',
          backgroundImage: 'none',
          backgroundColor: '#0d1929',
          boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#0d1929',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#0d1929',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 16,
          boxShadow: '0 25px 50px rgba(0,0,0,0.6)',
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
          borderColor: 'rgba(255,255,255,0.12)',
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.24)',
            backgroundColor: 'rgba(255,255,255,0.04)',
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
            backgroundColor: 'rgba(255,255,255,0.06)',
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
          border: '1px solid rgba(255,255,255,0.08) !important',
          padding: '3px 10px',
          '&.Mui-selected': {
            backgroundColor: 'rgba(59,130,246,0.14)',
            color: '#93c5fd',
            border: '1px solid rgba(59,130,246,0.30) !important',
            '&:hover': {
              backgroundColor: 'rgba(59,130,246,0.20)',
            },
          },
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.05)',
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
          backgroundColor: '#060c18',
          borderTop: '1px solid rgba(255,255,255,0.07)',
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
          backgroundColor: '#060c18',
          borderTop: '1px solid rgba(255,255,255,0.07)',
        },
        columnHeader: {
          backgroundColor: '#060c18',
          fontSize: '0.72rem',
          fontWeight: 600,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        },
        row: {
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.035)',
          },
        },
        cell: {
          borderBottom: '1px solid rgba(255,255,255,0.05)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.07)',
        },
      },
    },
  };
}
