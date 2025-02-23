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
            borderWidth: '2px',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          color: theme.palette.text.secondary,
          // backgroundColor: theme.palette.background.neutral,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: theme.palette.grey[800],
        },
        arrow: {
          color: theme.palette.grey[800],
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
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: theme.spacing(1),
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: theme.palette.grey[900],
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: theme.palette.grey[800],
          borderRadius: theme.spacing(1),
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          variants: [
            {
              style: {
                textTransform: 'none',
              },
            },
          ],
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          // ':hover': {
          //   backgroundColor: theme.palette.grey[800],
          //   transform: 'scale(1.2)',
          // },
          ':active': {
            backgroundColor: theme.palette.grey[800],
            transform: 'scale(0.8)',
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        footerContainer: {
          backgroundColor: theme.palette.grey[900],
        },
        columnHeader: {
          backgroundColor: theme.palette.grey[900],
        },
      },
    },
  };
}
