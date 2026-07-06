import React from 'react';

import { Box, ListItem, ListItemButton, Tooltip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link, useLocation } from 'react-router-dom';

import { Iconify } from '../Iconify';

type SideNavItemProps = { href: string; icon: string; text: string; collapsed?: boolean };

export default function SideNavItem({ href, icon, text, collapsed }: SideNavItemProps) {
  const location = useLocation();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const active = location.pathname === href;

  return (
    <ListItem disablePadding sx={{ px: collapsed ? 0.75 : 1.5, mb: 0.25 }}>
      <Tooltip title={collapsed ? text : ''} placement="right" arrow>
        <ListItemButton
          component={Link}
          to={href}
          sx={{
            borderRadius: '8px',
            px: collapsed ? 0 : 1.5,
            py: 0.875,
            gap: collapsed ? 0 : 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'background-color 0.15s ease, padding 0.2s ease',
            position: 'relative',
            ...(active
              ? {
                  backgroundColor: isLight ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.12)',
                  '&:hover': { backgroundColor: isLight ? 'rgba(59,130,246,0.14)' : 'rgba(59,130,246,0.18)' },
                }
              : {
                  '&:hover': { backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)' },
                }),
          }}
        >
          {active && !collapsed && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '22%',
                height: '56%',
                width: '3px',
                borderRadius: '0 3px 3px 0',
                backgroundColor: '#3b82f6',
                boxShadow: '0 0 6px rgba(59,130,246,0.55)',
              }}
            />
          )}

          <Iconify
            icon={icon}
            width={26}
            sx={{ color: active ? (isLight ? '#3b82f6' : '#60a5fa') : theme.palette.text.disabled, flexShrink: 0 }}
          />

          {!collapsed && (
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 500,
                color: active ? theme.palette.text.primary : theme.palette.text.secondary,
                letterSpacing: '-0.01em',
                lineHeight: 1,
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
