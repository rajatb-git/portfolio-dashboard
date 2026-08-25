import * as React from 'react';

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

import AuthGate from '@/components/AuthGate';
import ErrorBoundary from '@/components/ErrorBoundary';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Sidebar from '@/components/Nav/Sidebar';
import TopBar from '@/components/Nav/TopBar';
import ThemeRegistry from '@/components/ThemeRegistry/ThemeRegistry';
import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { TOPBAR_HEIGHT } from '@/components/ThemeRegistry/tokens';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { DashboardDataProvider } from '@/contexts/DashboardDataContext';
import { DemoModeProvider } from '@/contexts/DemoModeContext';
import { useIdleLock } from '@/hooks/useIdleLock';
import { DRAWER_COLLAPSED_WIDTH, DRAWER_WIDTH } from '@/config';

const Dashboard = React.lazy(() => import('@/pages/Dashboard'));
const Today = React.lazy(() => import('@/pages/Today'));
const Analytics = React.lazy(() => import('@/pages/Analytics'));
const Rebalance = React.lazy(() => import('@/pages/Rebalance'));
const Alerts = React.lazy(() => import('@/pages/Alerts'));
const Database = React.lazy(() => import('@/pages/Database'));
const IPOCalendar = React.lazy(() => import('@/pages/IPOCalendar'));
const IPODetail = React.lazy(() => import('@/pages/IPODetail'));
const Logs = React.lazy(() => import('@/pages/Logs'));
const Notifications = React.lazy(() => import('@/pages/Notifications'));
const Changelog = React.lazy(() => import('@/pages/Changelog'));
const Research = React.lazy(() => import('@/pages/Research'));
const Settings = React.lazy(() => import('@/pages/Settings'));

function IdleLockBinder() {
  const { status } = useAuth();
  useIdleLock({
    enabled: !!status?.enabled,
    idleTimeoutMinutes: status?.idleTimeoutMinutes ?? 0,
  });
  return null;
}

/** A route transition is a fast, bounded wait — a top progress bar reads as
 *  "loading" without the layout shift a full-page skeleton would cause. */
function RouteFallback() {
  return (
    <Box sx={{ position: 'fixed', top: TOPBAR_HEIGHT, left: 0, right: 0, zIndex: 1200 }} aria-busy="true">
      <LinearProgress sx={{ height: 2 }} />
    </Box>
  );
}

function AppShell() {
  const [collapsed, setCollapsed] = React.useState(() => localStorage.getItem('nav_collapsed') === 'true');
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const isMobile = useMediaQuery('(max-width: 899.95px)');
  const location = useLocation();

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('nav_collapsed', String(next));
      return next;
    });
  };

  const drawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <>
      <IdleLockBinder />

      {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
      <a className="skip-to-content" href="#main-content">
        Skip to content
      </a>

      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggle}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        onMobileDrawer={setMobileOpen}
      />

      <TopBar isMobile={isMobile} drawerWidth={drawerWidth} onOpenMobileDrawer={() => setMobileOpen(true)} />

      <Box
        component="main"
        id="main-content"
        tabIndex={-1}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          bgcolor: 'background.default',
          ml: isMobile ? 0 : `${drawerWidth}px`,
          mt: `${TOPBAR_HEIGHT}px`,
          p: { xs: 1.5, sm: 2, lg: 3 },
          transition: 'margin-left 200ms cubic-bezier(0.4, 0, 0.2, 1)',
          outline: 'none',
        }}
      >
        <ErrorBoundary key={location.pathname + location.search}>
          <React.Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/today" element={<Today />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/rebalance" element={<Rebalance />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/database" element={<Database />} />
              <Route path="/ipo-calendar" element={<IPOCalendar />} />
              <Route path="/ipo-calendar/:id" element={<IPODetail />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/logs" element={<Logs />} />
              <Route path="/changelog" element={<Changelog />} />
              <Route path="/research" element={<Research />} />
              <Route path="/settings" element={<Settings />} />
            </Routes>
          </React.Suspense>
        </ErrorBoundary>
      </Box>
    </>
  );
}

/** Toasts inherit the app's light/dark choice rather than being pinned dark. */
function Toasts() {
  const { resolvedMode } = useThemeMode();
  return (
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
      theme={resolvedMode}
      stacked
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeRegistry>
        <AuthProvider>
          <DemoModeProvider>
            <AuthGate>
              <DashboardDataProvider>
                <AppShell />
              </DashboardDataProvider>
            </AuthGate>

            <PWAInstallPrompt />
            <Toasts />
          </DemoModeProvider>
        </AuthProvider>
      </ThemeRegistry>
    </BrowserRouter>
  );
}
