import { createTheme } from '@mui/material/styles';
import localFont from 'next/font/local';

import { THEME_MODE } from '@/config';

import { overrides } from './overrides';
import palette from './palette';

const roboto = localFont({
  src: [
    {
      path: '../../../public/fonts/MPLUSRounded1c-Thin.ttf',
      weight: '100',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-Light.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-Bold.ttf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-ExtraBold.ttf',
      weight: '800',
      style: 'normal',
    },
    {
      path: '../../../public/fonts/MPLUSRounded1c-Black.ttf',
      weight: '900',
      style: 'normal',
    },
  ],
});

const theme = createTheme({
  palette: palette(THEME_MODE),
  typography: {
    fontFamily: roboto.style.fontFamily,
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
