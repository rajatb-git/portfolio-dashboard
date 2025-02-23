import * as React from 'react';

import Box from '@mui/material/Box';
import { ToastContainer } from 'react-toastify';

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
              mt: '40px',
            }}
          >
            {children}
          </Box>

          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick={false}
            rtl={false}
            pauseOnFocusLoss
            draggable={false}
            pauseOnHover
            theme="light"
            stacked={true}
          />
        </ThemeRegistry>
      </body>
    </html>
  );
}
