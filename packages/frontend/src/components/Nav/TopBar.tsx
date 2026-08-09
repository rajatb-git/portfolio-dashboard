import * as React from 'react';

import MuiAppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

import { Iconify } from '@/components/Iconify';
import MarketStatusChip from '@/components/MarketStatusChip';
import MockDataBadge from '@/components/MockDataBadge';
import { SearchTickerModal } from '@/components/SearchTickerModal';
import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { FONT_SIZE, MOTION, RADIUS, SURFACE, TOPBAR_HEIGHT } from '@/components/ThemeRegistry/tokens';
import { NAV_CONFIG, NAV_SETTINGS_CONFIG } from '@/config';
import LocalStorageArray from '@/utils/localStorageArray';

const ALL_NAV = [...NAV_CONFIG, NAV_SETTINGS_CONFIG];

function useCurrentPageTitle() {
  const { pathname } = useLocation();
  const match = ALL_NAV.find((n) => pathname === n.href || pathname.startsWith(`${n.href}/`));
  return match?.text ?? '';
}

function ThemeToggle() {
  const { mode, resolvedMode, setMode } = useThemeMode();

  // Cycles light → dark → system so every option is reachable in one control.
  const next = mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light';
  const icon =
    mode === 'system' ? 'tabler:device-desktop' : resolvedMode === 'dark' ? 'tabler:moon-stars' : 'tabler:sun-high';
  const labels = { light: 'Light', dark: 'Dark', system: 'System' } as const;

  return (
    <Tooltip title={`Theme: ${labels[mode]} — switch to ${labels[next]}`}>
      <IconButton
        size="small"
        onClick={() => setMode(next)}
        aria-label={`Theme: ${labels[mode]}. Switch to ${labels[next]}.`}
        sx={{ color: 'text.secondary' }}
      >
        <Iconify icon={icon} width={19} />
      </IconButton>
    </Tooltip>
  );
}

type TopBarProps = {
  isMobile: boolean;
  drawerWidth: number;
  onOpenMobileDrawer: () => void;
};

export default function TopBar({ isMobile, drawerWidth, onOpenMobileDrawer }: TopBarProps) {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const pageTitle = useCurrentPageTitle();

  const [showSearch, setShowSearch] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<Array<string> | null>(
    LocalStorageArray.getAll('searchText')
  );

  const refreshSearchHistory = React.useCallback(() => {
    setSearchHistory(LocalStorageArray.getAll('searchText'));
  }, []);

  const openSearch = React.useCallback(() => {
    refreshSearchHistory();
    setShowSearch(true);
  }, [refreshSearchHistory]);

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openSearch]);

  return (
    <>
      <MuiAppBar
        position="fixed"
        elevation={0}
        sx={{
          // Translucent + blur keeps the content edge visible as it scrolls
          // under the bar, so the page reads as one continuous surface.
          bgcolor: alpha(SURFACE[isLight ? 'light' : 'dark'].sunken, isLight ? 0.85 : 0.78),
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: theme.palette.text.primary,
          ml: isMobile ? 0 : `${drawerWidth}px`,
          width: isMobile ? '100%' : `calc(100% - ${drawerWidth}px)`,
          transition: `margin-left ${MOTION.normal} ${MOTION.easing}, width ${MOTION.normal} ${MOTION.easing}`,
        }}
      >
        <Toolbar sx={{ minHeight: `${TOPBAR_HEIGHT}px !important`, gap: 1, px: '12px !important' }}>
          {isMobile && (
            <IconButton
              size="small"
              onClick={onOpenMobileDrawer}
              aria-label="Open navigation menu"
              sx={{ color: 'text.secondary' }}
            >
              <Iconify icon="tabler:menu-2" width={21} />
            </IconButton>
          )}

          {/* On mobile the sidebar is hidden, so the bar carries the location.
              On desktop the page's own H1 does that job and repeating it here
              would just be noise. */}
          {isMobile && pageTitle && (
            <Typography
              noWrap
              sx={{ fontSize: FONT_SIZE.sm, fontWeight: 650, color: 'text.primary', letterSpacing: '-0.01em' }}
            >
              {pageTitle}
            </Typography>
          )}

          <Box sx={{ flexGrow: 1 }} />

          <MockDataBadge />

          {!isMobile && <MarketStatusChip />}

          {isMobile ? (
            <IconButton size="small" onClick={openSearch} aria-label="Search ticker" sx={{ color: 'text.secondary' }}>
              <Iconify icon="tabler:search" width={20} />
            </IconButton>
          ) : (
            <Button
              onClick={openSearch}
              startIcon={<Iconify icon="tabler:search" width={16} sx={{ color: 'text.disabled' }} />}
              sx={{
                minWidth: 210,
                justifyContent: 'flex-start',
                gap: 0.5,
                px: 1.25,
                py: 0.625,
                borderRadius: `${RADIUS.md}px`,
                border: `1px solid ${theme.palette.divider}`,
                bgcolor: isLight ? 'rgba(15,23,42,0.03)' : 'rgba(255,255,255,0.035)',
                color: 'text.disabled',
                fontWeight: 450,
                '&:hover': {
                  bgcolor: isLight ? 'rgba(15,23,42,0.055)' : 'rgba(255,255,255,0.06)',
                  borderColor: 'text.disabled',
                },
              }}
            >
              Search ticker
              <Box sx={{ flexGrow: 1 }} />
              <Box
                aria-hidden
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.25,
                  px: 0.625,
                  py: 0.125,
                  borderRadius: `${RADIUS.xs}px`,
                  border: `1px solid ${theme.palette.divider}`,
                  fontSize: FONT_SIZE.micro,
                  opacity: 0.85,
                }}
              >
                <Iconify icon="tabler:command" width={11} />K
              </Box>
            </Button>
          )}

          <ThemeToggle />
        </Toolbar>
      </MuiAppBar>

      <SearchTickerModal
        refreshSearchHistory={refreshSearchHistory}
        searchHistory={searchHistory}
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
      />
    </>
  );
}
