import { createTheme } from '@mui/material/styles';
import { M_PLUS_Rounded_1c } from 'next/font/google';

import { overrides } from './overrides';
import palette from './palette';

const roboto = M_PLUS_Rounded_1c({
  weight: ['100', '300', '400', '500', '700', '800', '900'],
  subsets: ['latin'],
  display: 'swap',
  adjustFontFallback: false,
});

const theme = createTheme({
  palette: palette('dark'),
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
  },
});

theme.components = overrides(theme);

export default theme;
