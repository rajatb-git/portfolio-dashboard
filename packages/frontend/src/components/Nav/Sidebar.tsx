import * as React from 'react';

import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import MuiDrawer from '@mui/material/Drawer';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useLocation } from 'react-router-dom';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE, MOTION, RADIUS, SURFACE } from '@/components/ThemeRegistry/tokens';
import { DRAWER_COLLAPSED_WIDTH, DRAWER_WIDTH, NAV_CONFIG, NAV_SETTINGS_CONFIG, type NavItemConfig } from '@/config';

import SideNavItem from './SideNavItem';
import BrandMark from './BrandMark';

type NavSection = { section: string; items: NavItemConfig[] };

const navSections: NavSection[] = NAV_CONFIG.reduce<NavSection[]>((acc, item) => {
  const last = acc[acc.length - 1];
  if (last && last.section === item.section) last.items.push(item);
  else acc.push({ section: item.section, items: [item] });
  return acc;
}, []);

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  onMobileDrawer: (open: boolean) => void;
};

export default function Sidebar({ collapsed, onToggle, isMobile, mobileOpen, onMobileDrawer }: SidebarProps) {
  const theme = useTheme();
  const location = useLocation();

  // A tap on a nav item should not leave the overlay covering the page it just
  // navigated to.
  React.useEffect(() => {
    if (isMobile) onMobileDrawer(false);
  }, [location.pathname, location.search, isMobile]);

  const width = isMobile ? DRAWER_WIDTH : collapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;
  const isCollapsed = !isMobile && collapsed;

  return (
    <MuiDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isMobile ? mobileOpen : true}
      onClose={() => onMobileDrawer(false)}
      anchor="left"
      ModalProps={{ keepMounted: true }}
      sx={{
        width,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width,
          boxSizing: 'border-box',
          height: '100%',
          border: 0,
          borderRight: `1px solid ${theme.palette.divider}`,
          bgcolor: SURFACE[theme.palette.mode === 'light' ? 'light' : 'dark'].sunken,
          backgroundImage: 'none',
          display: 'flex',
          flexDirection: 'column',
          overflowX: 'hidden',
          transition: `width ${MOTION.normal} ${MOTION.easing}`,
        },
      }}
    >
      {/* Brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.25,
          px: isCollapsed ? 0 : 1.75,
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          height: 56,
          flexShrink: 0,
        }}
      >
        <BrandMark size={isCollapsed ? 28 : 30} />
        {!isCollapsed && (
          <Box sx={{ minWidth: 0 }}>
            <Typography
              noWrap
              sx={{ fontSize: FONT_SIZE.md, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.15 }}
            >
              Portfolio
            </Typography>
            <Typography
              noWrap
              sx={{
                fontSize: FONT_SIZE.micro,
                fontWeight: 600,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                color: 'text.disabled',
                lineHeight: 1.2,
              }}
            >
              Dashboard
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ mx: isCollapsed ? 1 : 1.75 }} />

      <Box
        component="nav"
        aria-label="Main navigation"
        sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', py: 1 }}
      >
        {navSections.map(({ section, items }, index) => (
          <Box key={section} sx={{ mb: 0.5 }}>
            {isCollapsed ? (
              index !== 0 && <Divider sx={{ mx: 1.5, my: 1 }} />
            ) : (
              <Typography
                id={`nav-section-${section}`}
                sx={{
                  px: 2.5,
                  pt: index === 0 ? 0.5 : 1.75,
                  pb: 0.75,
                  fontSize: FONT_SIZE.micro,
                  fontWeight: 700,
                  letterSpacing: '0.09em',
                  textTransform: 'uppercase',
                  color: 'text.disabled',
                }}
              >
                {section}
              </Typography>
            )}
            <List
              aria-labelledby={isCollapsed ? undefined : `nav-section-${section}`}
              aria-label={isCollapsed ? section : undefined}
              sx={{ p: 0 }}
            >
              {items.map((item) => (
                <SideNavItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  text={item.text}
                  description={item.description}
                  collapsed={isCollapsed}
                />
              ))}
            </List>
          </Box>
        ))}
      </Box>

      <Divider sx={{ mx: isCollapsed ? 1 : 1.75 }} />

      <List sx={{ p: 0, py: 1, flexShrink: 0 }}>
        <SideNavItem
          href={NAV_SETTINGS_CONFIG.href}
          icon={NAV_SETTINGS_CONFIG.icon}
          text={NAV_SETTINGS_CONFIG.text}
          collapsed={isCollapsed}
        />
      </List>

      {/* Collapse control — a real button so it is reachable by keyboard. */}
      {!isMobile && (
        <>
          <Divider sx={{ mx: isCollapsed ? 1 : 1.75 }} />
          <Box sx={{ p: 1, display: 'flex', justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
            <Tooltip title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} placement="right">
              <Box
                component="button"
                type="button"
                onClick={onToggle}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  width: '100%',
                  px: isCollapsed ? 0 : 1.5,
                  py: 0.75,
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  border: 0,
                  borderRadius: `${RADIUS.md}px`,
                  bgcolor: 'transparent',
                  color: 'text.disabled',
                  cursor: 'pointer',
                  font: 'inherit',
                  transition: `background-color ${MOTION.fast} ${MOTION.easing}, color ${MOTION.fast} ${MOTION.easing}`,
                  '&:hover': { bgcolor: 'action.hover', color: 'text.secondary' },
                }}
              >
                <Iconify
                  icon={collapsed ? 'tabler:layout-sidebar-left-expand' : 'tabler:layout-sidebar-left-collapse'}
                  width={18}
                  aria-hidden
                />
                {!isCollapsed && (
                  <Typography sx={{ fontSize: FONT_SIZE.xs, fontWeight: 500, color: 'inherit' }}>Collapse</Typography>
                )}
              </Box>
            </Tooltip>
          </Box>
        </>
      )}
    </MuiDrawer>
  );
}
