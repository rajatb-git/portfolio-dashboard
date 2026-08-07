import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';

import { Iconify } from '@/components/Iconify';
import { FONT_SIZE, MOTION, RADIUS } from '@/components/ThemeRegistry/tokens';

type SideNavItemProps = {
  href: string;
  icon: string;
  text: string;
  description?: string;
  collapsed?: boolean;
};

export default function SideNavItem({ href, icon, text, description, collapsed }: SideNavItemProps) {
  const location = useLocation();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // `/ipo-calendar/:id` should keep the IPO Calendar entry lit.
  const active = location.pathname === href || location.pathname.startsWith(`${href}/`);

  const accent = isLight ? theme.palette.primary.dark : theme.palette.primary.light;

  const tooltip = collapsed ? (description ? `${text} — ${description}` : text) : '';

  return (
    <ListItem disablePadding sx={{ px: collapsed ? 0.75 : 1.25, mb: 0.25 }}>
      <Tooltip title={tooltip} placement="right">
        <ListItemButton
          component={Link}
          to={href}
          aria-current={active ? 'page' : undefined}
          disableRipple
          sx={{
            position: 'relative',
            borderRadius: `${RADIUS.md}px`,
            px: collapsed ? 0 : 1.25,
            py: 0.875,
            gap: collapsed ? 0 : 1.25,
            minHeight: 38,
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
            transition: `background-color ${MOTION.fast} ${MOTION.easing}, color ${MOTION.fast} ${MOTION.easing}`,
            color: active ? 'text.primary' : 'text.secondary',
            bgcolor: active ? alpha(theme.palette.primary.main, isLight ? 0.1 : 0.16) : 'transparent',
            '&:hover': {
              bgcolor: active
                ? alpha(theme.palette.primary.main, isLight ? 0.14 : 0.22)
                : theme.palette.action.hover,
              color: 'text.primary',
            },
          }}
        >
          {active && (
            <Box
              aria-hidden
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: '55%',
                width: 3,
                borderRadius: '0 3px 3px 0',
                bgcolor: theme.palette.primary.main,
              }}
            />
          )}

          <Iconify
            icon={icon}
            width={20}
            sx={{ color: active ? accent : 'inherit', flexShrink: 0 }}
            aria-hidden
          />

          {!collapsed && (
            <Typography
              noWrap
              sx={{
                fontSize: FONT_SIZE.sm,
                fontWeight: active ? 650 : 500,
                color: 'inherit',
                letterSpacing: '-0.005em',
                minWidth: 0,
              }}
            >
              {text}
            </Typography>
          )}
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
}
