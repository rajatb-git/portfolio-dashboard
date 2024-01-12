import * as React from 'react';

import Box from '@mui/material/Box';

import Drawer from '@/components/Nav/Drawer';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import 'src/global.css';
import { DRAWER_WIDTH } from '@/config';

export const metadata = {
  title: 'Portfolio Dashboard',
  description: 'Portfolio Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Drawer />

          <Box
            component="main"
            sx={{
              flexGrow: 1,
              bgcolor: 'background.default',
              ml: `${DRAWER_WIDTH}px`,
              p: 3,
            }}
          >
            {children}
          </Box>
        </ThemeRegistry>
      </body>
    </html>
  );
}
