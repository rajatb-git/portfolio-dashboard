import {
  alpha,
  Box,
  Button,
  Dialog,
  DialogContent,
  IconButton,
  InputBase,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { NAV_CONFIG, NAV_SETTINGS_CONFIG } from '@/config';
import LocalStorageArray from '@/utils/localStorageArray';
import { Iconify } from './Iconify';

type SearchTickerModalProps = {
  refreshSearchHistory: VoidFunction;
  isOpen: boolean;
  onClose: () => void;
  searchHistory: Array<string> | null;
};

type PageCommand = { label: string; href: string; icon: string };

const PAGE_COMMANDS: PageCommand[] = [
  ...NAV_CONFIG.map((n) => ({ label: n.text, href: n.href, icon: n.icon })),
  { label: 'Research', href: '/research', icon: 'mdi:magnify-scan' },
  { label: NAV_SETTINGS_CONFIG.text, href: NAV_SETTINGS_CONFIG.href, icon: NAV_SETTINGS_CONFIG.icon },
];

export function SearchTickerModal({ refreshSearchHistory, searchHistory, isOpen, onClose }: SearchTickerModalProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [query, setQuery] = React.useState('');

  React.useEffect(() => {
    if (isOpen) setQuery('');
  }, [isOpen]);

  const onSearchEnter = (searchText: string) => {
    const text = searchText.trim();
    if (!text) return;
    onClose();
    LocalStorageArray.add('searchText', text.toUpperCase());
    navigate(`/research?searchText=${text.toUpperCase()}`);
  };

  const goToPage = (href: string) => {
    onClose();
    navigate(href);
  };

  const removeItemFromSearchHistory = (searchText: string) => {
    LocalStorageArray.remove('searchText', searchText);
    refreshSearchHistory();
  };

  const matchingPages = query
    ? PAGE_COMMANDS.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase()))
    : PAGE_COMMANDS;

  const sectionLabelSx = {
    fontSize: '0.62rem',
    fontWeight: 700,
    color: 'text.disabled',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    px: 1,
    pt: 1,
    pb: 0.5,
  } as const;

  const hoverItemSx = {
    borderRadius: '4px',
    '&:hover': {
      border: `1px solid ${theme.palette.primary.dark}`,
      backgroundColor: alpha(theme.palette.primary.main, 0.2),
    },
  } as const;

  return (
    <Dialog
      open={isOpen}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
            mt: 10,
          },
        },
        container: { sx: { backdropFilter: 'blur(3px)', alignItems: 'flex-start' } },
      }}
      onClose={onClose}
      fullWidth
    >
      <Box sx={{ display: 'flex', alignItems: 'center', p: '8px 16px 8px 16px' }}>
        <Iconify icon="flowbite:search-solid" width={25} sx={{ color: theme.palette.primary.main }} />

        <InputBase
          sx={{
            ml: 2,
            flex: 1,
            input: {
              '&::placeholder': {
                color: theme.palette.text.secondary,
                fontWeight: 500,
              },
            },
          }}
          placeholder="Search ticker or jump to a page…"
          inputProps={{ 'aria-label': 'search' }}
          autoFocus
          inputRef={(input) => input && input.focus()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyUp={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onSearchEnter(query);
          }}
        />

        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            p: '0px 8px',
            minWidth: 'auto',
            borderColor: theme.palette.divider,
            color: theme.palette.text.disabled,
          }}
        >
          <kbd>esc</kbd>
        </Button>
      </Box>

      <DialogContent dividers sx={{ pr: 1, pl: 1 }}>
        {query.trim() && (
          <>
            <Typography sx={sectionLabelSx}>Search</Typography>
            <List dense sx={{ pt: 0 }}>
              <ListItem sx={{ p: 0, mb: 1 }}>
                <ListItemButton onClick={() => onSearchEnter(query)} sx={hoverItemSx}>
                  <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                    <Iconify icon="mdi:chart-line" />
                  </ListItemIcon>
                  <ListItemText primary={`Research ${query.trim().toUpperCase()}`} />
                </ListItemButton>
              </ListItem>
            </List>
          </>
        )}

        {matchingPages.length > 0 && (
          <>
            <Typography sx={sectionLabelSx}>Pages</Typography>
            <List dense sx={{ pt: 0 }}>
              {matchingPages.map((p) => (
                <ListItem key={p.href} sx={{ p: 0, mb: 0.5 }}>
                  <ListItemButton onClick={() => goToPage(p.href)} sx={hoverItemSx}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                      <Iconify icon={p.icon} />
                    </ListItemIcon>
                    <ListItemText primary={p.label} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {!query.trim() && searchHistory && searchHistory.length > 0 && (
          <>
            <Typography sx={sectionLabelSx}>Recent tickers</Typography>
            <List dense>
              {searchHistory.map((search) => (
                <ListItem
                  key={search}
                  sx={{
                    backgroundColor: isLight ? theme.palette.grey[100] : theme.palette.grey[800],
                    p: 0,
                    mb: 1,
                    borderRadius: '4px',
                    '&:hover': {
                      border: `1px solid ${theme.palette.primary.dark}`,
                      backgroundColor: alpha(theme.palette.primary.main, 0.2),
                    },
                  }}
                  secondaryAction={
                    <IconButton edge="end" aria-label="delete" onClick={() => removeItemFromSearchHistory(search)}>
                      <Iconify icon="fa:close" width={14} />
                    </IconButton>
                  }
                >
                  <ListItemButton onClick={() => onSearchEnter(search)}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                      <Iconify icon="mingcute:history-fill" />
                    </ListItemIcon>
                    <ListItemText primary={search} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
