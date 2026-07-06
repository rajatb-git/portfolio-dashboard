import { Box, Button, Divider, IconButton, Toolbar, Typography } from '@mui/material';
import MuiAppBar from '@mui/material/AppBar';
import { default as MuiDrawer } from '@mui/material/Drawer';
import List from '@mui/material/List';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { useLocation } from 'react-router-dom';

import { DRAWER_COLLAPSED_WIDTH, DRAWER_WIDTH, NAV_CONFIG, NAV_SETTINGS_CONFIG } from '@/config';
import LocalStorageArray from '@/utils/localStorageArray';
import { Iconify } from '../Iconify';
import { SearchTickerModal } from '../SearchTickerModal';
import SideNavItem from './SideNavItem';

const LogoIcon = ({ isLight }: { isLight: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
    <title>icon</title>
    {/* area fill under the trend line */}
    <path
      d="M2 17 C4.5 13.5 7 12 9.5 13 C12 14 14.5 9 20 5 L20 20 L2 20 Z"
      fill={isLight ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.18)'}
    />
    {/* upward trend line */}
    <path
      d="M2 17 C4.5 13.5 7 12 9.5 13 C12 14 14.5 9 20 5"
      stroke="white"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {/* peak dot */}
    <circle cx="20" cy="5" r="2.5" fill="white" />
  </svg>
);

type DrawerProps = {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  mobileOpen?: boolean;
  onMobileDrawer?: (open: boolean) => void;
};

export default function Drawer({ collapsed, onToggle, isMobile, mobileOpen, onMobileDrawer }: DrawerProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const location = useLocation();
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<Array<string> | null>(
    LocalStorageArray.getAll('searchText')
  );

  // Close mobile drawer on route change
  React.useEffect(() => {
    if (isMobile) {
      onMobileDrawer?.(false);
    }
  }, [location.pathname]);

  const drawerWidth = collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;
  const effectiveDrawerWidth = isMobile ? DRAWER_WIDTH : drawerWidth;

  const refreshSearchHistory = () => {
    setSearchHistory(LocalStorageArray.getAll('searchText'));
  };

  const openSearchTickerModal = () => {
    refreshSearchHistory();
    setShowSearch(true);
  };

  const closeSearchTickerModal = () => {
    setShowSearch(false);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      refreshSearchHistory();
      setShowSearch(true);
    }
  };

  React.useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <>
      <MuiAppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: isLight ? 'rgba(248,250,252,0.85)' : 'rgba(6,12,24,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          ml: isMobile ? 0 : `${drawerWidth}px`,
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
          transition: 'margin-left 0.2s ease, width 0.2s ease',
        }}
      >
        <Toolbar sx={{ minHeight: '48px !important', gap: 1, px: '12px !important' }}>
          {/* Hamburger — mobile only */}
          {isMobile && (
            <>
              <IconButton size="small" onClick={() => onMobileDrawer?.(true)} sx={{ color: 'text.secondary', mr: 0.5 }}>
                <Iconify icon="tabler:menu-2" width={22} />
              </IconButton>

              {/* Logo in AppBar on mobile */}
              <Box
                sx={{
                  width: 24,
                  height: 24,
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  mr: 0.5,
                }}
              >
                <LogoIcon isLight={isLight} />
              </Box>
            </>
          )}

          <Box sx={{ flexGrow: 1 }} />

          {/* Search: icon-only on mobile, full button on desktop */}
          {isMobile ? (
            <IconButton size="small" onClick={openSearchTickerModal} sx={{ color: 'text.disabled' }}>
              <Iconify icon="eva:search-fill" width={20} />
            </IconButton>
          ) : (
            <Button
              startIcon={<Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', width: 16, height: 16 }} />}
              variant="outlined"
              disableElevation
              size="small"
              onClick={openSearchTickerModal}
              sx={{
                border: `1px solid ${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.10)'}`,
                color: 'text.disabled',
                borderRadius: '8px',
                bgcolor: isLight ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.04)',
                px: 1.5,
                py: 0.5,
                minWidth: 160,
                justifyContent: 'flex-start',
                gap: 0.5,
                fontSize: '0.8125rem',
                '&:hover': {
                  bgcolor: isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.07)',
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.20)' : 'rgba(255,255,255,0.18)'}`,
                },
              }}
            >
              Search...
              <Box sx={{ flexGrow: 1 }} />
              <Box
                sx={{
                  border: `1px solid ${isLight ? 'rgba(0,0,0,0.14)' : 'rgba(255,255,255,0.14)'}`,
                  borderRadius: '5px',
                  px: 0.6,
                  py: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.3,
                  opacity: 0.7,
                }}
              >
                <Iconify icon="mynaui:command" width={11} />
                <Typography sx={{ fontSize: '0.7rem', lineHeight: 1 }}>K</Typography>
              </Box>
            </Button>
          )}
        </Toolbar>
      </MuiAppBar>

      <MuiDrawer
        sx={{
          width: effectiveDrawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: effectiveDrawerWidth,
            boxSizing: 'border-box',
            height: '100%',
            border: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            backgroundColor: isLight ? '#ffffff' : '#060c18',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            transition: 'width 0.2s ease',
          },
        }}
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => onMobileDrawer?.(false)}
        anchor="left"
      >
        {/* Logo / App name — always show full logo in mobile drawer */}
        {!isMobile && collapsed ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              py: 1.5,
              mb: 0.5,
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 14px rgba(59,130,246,0.3)',
              }}
            >
              <LogoIcon isLight={isLight} />
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              px: 2,
              py: 1.5,
              mb: 0.5,
            }}
          >
            <Box
              sx={{
                width: 30,
                height: 30,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 14px rgba(59,130,246,0.3)',
              }}
            >
              <LogoIcon isLight={isLight} />
            </Box>
            <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
              <Typography
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  color: 'text.primary',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                Portfolio
              </Typography>
              <Typography
                sx={{
                  fontSize: '0.65rem',
                  color: 'text.disabled',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  lineHeight: 1,
                  mt: 0.25,
                }}
              >
                Dashboard
              </Typography>
            </Box>
          </Box>
        )}

        <Divider sx={{ mx: !isMobile && collapsed ? 0.75 : 1.5, mb: 1 }} />

        {/* Main nav */}
        <List sx={{ p: 0, flexGrow: 1 }}>
          {NAV_CONFIG.map(({ href, icon, text }) => (
            <SideNavItem key={text} href={href} icon={icon} text={text} collapsed={!isMobile && collapsed} />
          ))}
        </List>

        {/* Bottom: Settings */}
        <Divider sx={{ mx: !isMobile && collapsed ? 0.75 : 1.5, mb: 0.5 }} />
        <List sx={{ p: 0, pb: 1.5 }}>
          <SideNavItem
            href={NAV_SETTINGS_CONFIG.href}
            icon={NAV_SETTINGS_CONFIG.icon}
            text={NAV_SETTINGS_CONFIG.text}
            collapsed={!isMobile && collapsed}
          />
        </List>
      </MuiDrawer>

      {/* Floating toggle button — desktop only */}
      <Box
        onClick={onToggle}
        sx={{
          display: { xs: 'none', md: 'flex' },
          position: 'fixed',
          left: `${drawerWidth - 10}px`,
          bottom: '52px',
          zIndex: 1201,
          width: 20,
          height: 20,
          borderRadius: '50%',
          bgcolor: isLight ? '#f1f5f9' : '#0f172a',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'}`,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'left 0.2s ease, border-color 0.15s ease, background-color 0.15s ease',
          '&:hover': {
            bgcolor: isLight ? '#e2e8f0' : '#1e293b',
            borderColor: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.3)',
            '& svg': { color: isLight ? '#475569' : '#94a3b8' },
          },
        }}
      >
        <Iconify
          icon={collapsed ? 'tabler:chevron-right' : 'tabler:chevron-left'}
          width={11}
          sx={{
            color: isLight ? '#94a3b8' : '#64748b',
            flexShrink: 0,
            transition: 'color 0.15s ease',
          }}
        />
      </Box>

      <SearchTickerModal
        refreshSearchHistory={refreshSearchHistory}
        searchHistory={searchHistory}
        isOpen={showSearch}
        onClose={closeSearchTickerModal}
      />
    </>
  );
}
