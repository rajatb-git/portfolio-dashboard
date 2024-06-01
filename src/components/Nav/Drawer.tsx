'use client';

import * as React from 'react';

import Divider from '@mui/material/Divider';
import { default as MuiDrawer } from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { DRAWER_WIDTH, NAV_CONFIG } from '@/config';

import SideNavItem from './SideNavItem';
import theme from '../ThemeRegistry/theme';

export default function Drawer() {
  const pathname = usePathname();

  return (
    <MuiDrawer
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          height: 'auto',
          bottom: 0,
          border: 0,
          boxShadow: `0px 0px 5px ${theme.palette.divider}`,
        },
      }}
      variant="permanent"
      anchor="left"
    >
      <List>
        <ListItem sx={{ fontWeight: 700, justifyContent: 'center', p: 0, mt: 1 }}>
          <Image src="/images/icon.png" alt="Portfolio Dashboard" width={30} height={32} />
        </ListItem>

        <Divider sx={{ my: 2 }} />

        {NAV_CONFIG.map(({ href, icon, text }) => (
          <SideNavItem currentPath={pathname} key={text} href={href} icon={icon} text={text} />
        ))}
      </List>
    </MuiDrawer>
  );
}
