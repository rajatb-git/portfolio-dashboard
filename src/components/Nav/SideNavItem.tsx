import React from 'react';

import { ListItem, ListItemButton, ListItemIcon, Tooltip, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { Iconify } from '../Iconify';
import theme from '../ThemeRegistry/theme';

type SideNavItemProps = { href: string; currentPath: string; icon: string; text: string };

export default function SideNavItem({ href, currentPath, icon, text }: SideNavItemProps) {
  const active = currentPath === href;

  return (
    <ListItem
      key={href}
      disablePadding
      sx={{ justifyContent: 'center' }}
      component={motion.div}
      whileHover={{ scale: 1.3 }}
      whileTap={{ scale: 0.9 }}
    >
      <Tooltip title={text} placement="right">
        <ListItemButton
          component={Link}
          href={href}
          sx={{
            justifyContent: 'center',
            margin: active ? '0px' : '6px',
            ...(active && {
              backgroundColor: theme.palette.grey[900],
              color: theme.palette.primary.main,
            }),
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 'auto',
              flexDirection: 'column',
              alignItems: 'center',
              ...(active && {
                color: theme.palette.primary.main,
              }),
            }}
          >
            <Iconify icon={icon} width={active ? 30 : 26} />
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                fontWeight: '700',
                maxWidth: '62px',
                padding: '3px 1px 0px 1px',
                textAlign: 'center',
                lineHeight: '1.2',
              }}
            >
              {text}
            </Typography>
          </ListItemIcon>
        </ListItemButton>
      </Tooltip>
    </ListItem>
  );
}
