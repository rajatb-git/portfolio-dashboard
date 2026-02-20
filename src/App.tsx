import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { ToastContainer } from 'react-toastify';

import Drawer from '@/components/Nav/Drawer';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import { DRAWER_WIDTH } from '@/config';

// Lazy load pages for better code splitting
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Database = React.lazy(() => import('@/pages/Database'));
const IPOCalendar = React.lazy(() => import('@/pages/IPOCalendar'));
const Logs = React.lazy(() => import('@/pages/Logs'));
const Research = React.lazy(() => import('@/pages/Research'));
const Settings = React.lazy(() => import('@/pages/Settings'));

export default function App() {
  return (
    <BrowserRouter>
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
          <React.Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/database" element={<Database />} />
              <Route path="/ipo-calendar" element={<IPOCalendar />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/research" element={<Research />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </React.Suspense>
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
    </BrowserRouter>
  );
}
