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
          disableRipple
          sx={{
            borderRadius: '10px',
            px: collapsed ? 0 : 1.25,
            py: 0.875,
            gap: collapsed ? 0 : 1.25,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            overflow: 'hidden',
            transition: 'background-color 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease',
            position: 'relative',
            ...(active
              ? {
                  background: isLight
                    ? 'linear-gradient(90deg, rgba(59,130,246,0.12) 0%, rgba(99,102,241,0.04) 100%)'
                    : 'linear-gradient(90deg, rgba(59,130,246,0.20) 0%, rgba(99,102,241,0.05) 100%)',
                  boxShadow: isLight
                    ? 'inset 0 0 0 1px rgba(59,130,246,0.18)'
                    : 'inset 0 0 0 1px rgba(59,130,246,0.28)',
                  '&:hover': {
                    background: isLight
                      ? 'linear-gradient(90deg, rgba(59,130,246,0.16) 0%, rgba(99,102,241,0.05) 100%)'
                      : 'linear-gradient(90deg, rgba(59,130,246,0.26) 0%, rgba(99,102,241,0.07) 100%)',
                  },
                }
              : {
                  '&:hover': {
                    backgroundColor: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.05)',
                    transform: collapsed ? 'none' : 'translateX(3px)',
                  },
                }),
          }}
        >
          {active && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                top: '50%',
                transform: 'translateY(-50%)',
                height: '60%',
                width: '3px',
                borderRadius: '0 4px 4px 0',
                background: 'linear-gradient(180deg, #3b82f6 0%, #6366f1 100%)',
                boxShadow: '0 0 8px rgba(59,130,246,0.7)',
              }}
            />
          )}

          <Iconify
            icon={icon}
            width={21}
            sx={{
              color: active ? (isLight ? '#3b82f6' : '#60a5fa') : theme.palette.text.secondary,
              flexShrink: 0,
              transition: 'color 0.15s ease',
            }}
          />

          {!collapsed && (
            <Typography
              sx={{
                fontSize: '0.8125rem',
                fontWeight: active ? 600 : 500,
                color: active ? theme.palette.text.primary : theme.palette.text.secondary,
                letterSpacing: '-0.01em',
                lineHeight: 1,
                whiteSpace: 'nowrap',
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
