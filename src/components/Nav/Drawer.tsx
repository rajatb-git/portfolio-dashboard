'use client';

import * as React from 'react';

import { Box, Toolbar, Button, IconButton, Link } from '@mui/material';
import MuiAppBar from '@mui/material/AppBar';
import { default as MuiDrawer } from '@mui/material/Drawer';
import List from '@mui/material/List';
import { usePathname } from 'next/navigation';

import { DRAWER_WIDTH, NAV_CONFIG, NAV_SETTINGS_CONFIG } from '@/config';

import SideNavItem from './SideNavItem';
import { Iconify } from '../Iconify';
import { SearchTickerModal } from '../SearchTickerModal';
import theme from '../ThemeRegistry/theme';
import LocalStorageArray from '@/utils/localStorageArray';

export default function Drawer() {
  const pathname = usePathname();
  const [showSearch, setShowSearch] = React.useState(false);
  const [searchHistory, setSearchHistory] = React.useState<Array<string> | null>(
    LocalStorageArray.getAll('searchText')
  );

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
    if (event.metaKey && event.key === 'k') {
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
      <MuiAppBar position="fixed" sx={{ backgroundColor: 'rgba(0,0,0, 0.8)', backdropFilter: 'blur(10px)' }}>
        <Toolbar sx={{ minHeight: '48px !important', gap: 1 }}>
          <Box sx={{ flexGrow: 1 }} />

          <Button
            startIcon={<Iconify icon="eva:search-fill" sx={{ color: theme.palette.primary.main }} />}
            variant="outlined"
            disableElevation
            size="small"
            onClick={openSearchTickerModal}
            sx={{ border: `2px solid ${theme.palette.grey[800]}`, color: theme.palette.grey[400] }}
          >
            Search...
            <Box
              sx={{
                ml: 2,
                border: `2px solid ${theme.palette.grey[850]}`,
                borderRadius: '4px',
                p: '2px 4px',
                lineHeight: 1,
              }}
            >
              <Iconify icon="mynaui:command" width={12} />K
            </Box>
          </Button>

          <IconButton component={Link} href={NAV_SETTINGS_CONFIG.href}>
            <Iconify icon={NAV_SETTINGS_CONFIG.icon} />
          </IconButton>
        </Toolbar>
      </MuiAppBar>

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
            display: 'flex',
            flexDirection: 'row',
            justifyContent: 'center',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        <List sx={{ display: 'flex', flexDirection: 'column', width: DRAWER_WIDTH }}>
          {NAV_CONFIG.map(({ href, icon, text }) => (
            <SideNavItem currentPath={pathname} key={text} href={href} icon={icon} text={text} />
          ))}

          <Box sx={{ flexGrow: 1 }}> </Box>
        </List>
      </MuiDrawer>

      <SearchTickerModal
        refreshSearchHistory={refreshSearchHistory}
        searchHistory={searchHistory}
        isOpen={showSearch}
        onClose={closeSearchTickerModal}
      />
    </>
  );
}
