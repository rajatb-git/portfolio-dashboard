'use client';

import * as React from 'react';

import { TextField, ListItemButton } from '@mui/material';
import Divider from '@mui/material/Divider';
import { default as MuiDrawer } from '@mui/material/Drawer';
import List from '@mui/material/List';
import { usePathname, useRouter } from 'next/navigation';

import { DRAWER_WIDTH, NAV_CONFIG } from '@/config';

import SideNavItem from './SideNavItem';
import { Iconify } from '../Iconify';
import theme from '../ThemeRegistry/theme';

export default function Drawer() {
  const router = useRouter();
  const pathname = usePathname();
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');

  const onSearchEnter = () => {
    router.push(`/research?searchText=${searchText}`);

    setShowSearch(false);
  };

  return (
    <>
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
            backgroundColor: theme.palette.background.neutral,
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <List>
          <ListItemButton
            sx={{ fontWeight: 700, justifyContent: 'center', p: 0, zIndex: 999 }}
            onClick={() => setShowSearch(!showSearch)}
          >
            <Iconify icon="eva:search-fill" sx={{ height: '30px', width: '30px' }} />
          </ListItemButton>

          <Divider sx={{ my: 2 }} />

          {NAV_CONFIG.map(({ href, icon, text }) => (
            <SideNavItem currentPath={pathname} key={text} href={href} icon={icon} text={text} />
          ))}
        </List>
      </MuiDrawer>

      <TextField
        fullWidth
        variant="filled"
        onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
        placeholder="Search..."
        autoFocus
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        sx={{
          position: 'fixed',
          top: 0,
          right: showSearch ? '-50px' : 'calc(100vw - 50px)',
          backgroundColor: theme.palette.background.default,
          opacity: showSearch ? 1 : 0,
          visibility: showSearch ? 'visible' : 'hidden',
          transition: 'all 0.3s ease-in',
        }}
      />
    </>
  );
}
