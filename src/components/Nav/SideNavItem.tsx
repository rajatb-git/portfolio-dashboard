import React from 'react';

import { ListItem, ListItemButton, ListItemIcon, ListItemText, alpha } from '@mui/material';
import { motion } from 'framer-motion';
import Link from 'next/link';

import { Iconify } from '../Iconify';
import theme from '../ThemeRegistry/theme';

type SideNavItemProps = { href: string; currentPath: string; icon: string; text: string };

export default function SideNavItem({ href, currentPath, icon, text }: SideNavItemProps) {
  const active = currentPath === href;

  return (
    <ListItem key={href} disablePadding>
      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
        <ListItemButton
          component={Link}
          href={href}
          sx={{
            margin: `${theme.spacing(0.5)} ${theme.spacing(2)}`,
            borderRadius: theme.spacing(1),
            ...(active && {
              backgroundColor: alpha(theme.palette.primary.lighter, 0.1),
              color: theme.palette.primary.main,
              boxShadow: `0px 0px 5px ${theme.palette.divider}`,
            }),
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 'auto',
              mr: 2,
              ...(active && {
                color: theme.palette.primary.main,
              }),
            }}
          >
            <Iconify icon={icon} />
          </ListItemIcon>

          <ListItemText primary={text} primaryTypographyProps={{ sx: { fontWeight: 500 } }} />
        </ListItemButton>
      </motion.div>
    </ListItem>
  );
}
