import * as React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ToastContainer } from 'react-toastify';

import Drawer from '@/components/Nav/Drawer';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import { DRAWER_WIDTH, DRAWER_COLLAPSED_WIDTH } from '@/config';

// Lazy load pages for better code splitting
const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const Database = React.lazy(() => import('@/pages/Database'));
const IPOCalendar = React.lazy(() => import('@/pages/IPOCalendar'));
const Logs = React.lazy(() => import('@/pages/Logs'));
const Research = React.lazy(() => import('@/pages/Research'));
const Settings = React.lazy(() => import('@/pages/Settings'));

export default function App() {
  const [collapsed, setCollapsed] = React.useState(
    () => localStorage.getItem('nav_collapsed') === 'true'
  );
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useMediaQuery('(max-width: 899.95px)');

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('nav_collapsed', String(next));
      return next;
    });
  };

  const handleMobileDrawer = (open: boolean) => setMobileOpen(open);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <BrowserRouter>
      <ThemeRegistry>
        <Drawer
          collapsed={collapsed}
          onToggle={handleToggle}
          isMobile={isMobile}
          mobileOpen={mobileOpen}
          onMobileDrawer={handleMobileDrawer}
        />

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            bgcolor: 'background.default',
            ml: isMobile ? 0 : `${drawerWidth}px`,
            p: { xs: 1.5, md: 3 },
            mt: '48px',
            transition: 'margin-left 0.2s ease',
          }}
        >
          <React.Suspense fallback={<div>Loading...</div>}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/analytics" element={<Analytics />} />
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
          theme="dark"
          stacked={true}
        />
      </ThemeRegistry>
    </BrowserRouter>
  );
}
