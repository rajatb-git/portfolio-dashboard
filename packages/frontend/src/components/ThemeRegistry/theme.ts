import { createTheme } from '@mui/material/styles';

import { THEME_MODE } from '@/config';

import { overrides } from './overrides';
import palette from './palette';

const theme = createTheme({
  palette: palette(THEME_MODE),
  typography: {
    fontFamily: 'M PLUS Rounded 1c, sans-serif',
  },
  components: {
    MuiAlert: {
      styleOverrides: {
        root: ({ ownerState }) => ({
          ...(ownerState.severity === 'info' && {
            backgroundColor: '#60a5fa',
          }),
        }),
      },
    },
    // MuiPaper: {
    //   styleOverrides: {
    //     MuiCard: {
    //       backgroundColor: palette(THEME_MODE).background.paper,
    //     },
    //   },
    // },
    MuiTablePagination: {
      styleOverrides: {
        root: {
          backgroundColor: palette(THEME_MODE).background.paper,
        },
      },
    },
  },
});

theme.components = overrides(theme);

export default theme;
