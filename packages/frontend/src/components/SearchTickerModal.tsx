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
  Skeleton,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import apis from '@/api';
import { SymbolSearchResult } from '@/api/live';
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
type HeldSymbol = { symbol: string; name: string; type: 'stock' | 'crypto' };

const PAGE_COMMANDS: PageCommand[] = [
  ...NAV_CONFIG.map((n) => ({ label: n.text, href: n.href, icon: n.icon })),
  { label: NAV_SETTINGS_CONFIG.text, href: NAV_SETTINGS_CONFIG.href, icon: NAV_SETTINGS_CONFIG.icon },
];

export function SearchTickerModal({ refreshSearchHistory, searchHistory, isOpen, onClose }: SearchTickerModalProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';
  const [query, setQuery] = React.useState('');
  const [symbolResults, setSymbolResults] = React.useState<SymbolSearchResult[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [held, setHeld] = React.useState<HeldSymbol[]>([]);

  React.useEffect(() => {
    if (!isOpen) return;
    setQuery('');
    apis.holdings
      .getAll()
      .then((holdings) => {
        const bySymbol = new Map<string, HeldSymbol>();
        for (const h of holdings ?? []) {
          const symbol = h.symbol?.toUpperCase();
          if (symbol && !bySymbol.has(symbol)) bySymbol.set(symbol, { symbol, name: h.name, type: h.type });
        }
        setHeld([...bySymbol.values()].sort((a, b) => a.symbol.localeCompare(b.symbol)));
      })
      .catch((err) => toast.error(err.message || 'Failed to load holdings for search'));
  }, [isOpen]);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSymbolResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const handle = setTimeout(() => {
      apis.live
        .searchSymbols(q)
        .then((res) => setSymbolResults(res ?? []))
        .catch((err) => {
          setSymbolResults([]);
          toast.error(err.message || 'Failed to search symbols');
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const onSearchEnter = (searchText: string) => {
    const text = searchText.trim();
    if (!text) return;
    onClose();
    LocalStorageArray.add('searchText', text.toUpperCase());
    navigate(`/research?searchText=${encodeURIComponent(text.toUpperCase())}`);
  };

  const goToPage = (href: string) => {
    onClose();
    navigate(href);
  };

  const removeItemFromSearchHistory = (searchText: string) => {
    LocalStorageArray.remove('searchText', searchText);
    refreshSearchHistory();
  };

  const q = query.trim().toLowerCase();
  const matchingPages = q ? PAGE_COMMANDS.filter((p) => p.label.toLowerCase().includes(q)) : PAGE_COMMANDS;

  // Your own tickers first: Finnhub's lookup ranks exact tickers of unrelated
  // funds above the stock you hold ("NVD" before NVDA) and knows no crypto.
  const matchingHeld = q
    ? held
        .filter((h) => h.symbol.toLowerCase().startsWith(q) || h.name.toLowerCase().includes(q))
        .sort((a, b) => Number(b.symbol.toLowerCase().startsWith(q)) - Number(a.symbol.toLowerCase().startsWith(q)))
    : [];
  const heldSymbols = new Set(held.map((h) => h.symbol));
  const otherCompanies = symbolResults.filter((r) => !heldSymbols.has(r.symbol));
  const pageFirst = !!q && matchingPages.some((p) => p.label.toLowerCase().startsWith(q));

  const onEnter = () => {
    if (matchingHeld.length > 0) return onSearchEnter(matchingHeld[0].symbol);
    if (pageFirst) return goToPage(matchingPages[0].href);
    onSearchEnter(otherCompanies.length > 0 ? otherCompanies[0].symbol : query);
  };

  const pagesSection = (
    <>
      <Typography
        sx={{
          fontSize: '0.62rem',
          fontWeight: 700,
          color: 'text.disabled',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          px: 1,
          pt: 1,
          pb: 0.5,
        }}
      >
        Pages
      </Typography>
      <List dense sx={{ pt: 0 }}>
        {matchingPages.map((p) => (
          <ListItem key={p.href} sx={{ p: 0, mb: 0.5 }}>
            <ListItemButton
              onClick={() => goToPage(p.href)}
              sx={{
                borderRadius: '4px',
                '&:hover': {
                  border: `1px solid ${theme.palette.primary.dark}`,
                  backgroundColor: alpha(theme.palette.primary.main, 0.2),
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                <Iconify icon={p.icon} />
              </ListItemIcon>
              <ListItemText primary={p.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

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
          placeholder="Search company or ticker, or jump to a page…"
          inputProps={{ 'aria-label': 'search', spellCheck: false, autoComplete: 'off', autoCapitalize: 'off' }}
          autoFocus
          inputRef={(input) => input && input.focus()}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyUp={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') onEnter();
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
        {matchingHeld.length > 0 && (
          <>
            <Typography sx={sectionLabelSx}>Your holdings</Typography>
            <List dense sx={{ pt: 0 }}>
              {matchingHeld.map((h) => (
                <ListItem key={h.symbol} sx={{ p: 0, mb: 0.5 }}>
                  <ListItemButton onClick={() => onSearchEnter(h.symbol)} sx={hoverItemSx}>
                    <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                      <Iconify icon={h.type === 'crypto' ? 'mdi:bitcoin' : 'mdi:briefcase-outline'} />
                    </ListItemIcon>
                    <ListItemText
                      primary={h.symbol}
                      secondary={h.name}
                      slotProps={{
                        primary: { sx: { fontWeight: 600 } },
                        secondary: { sx: { fontSize: '0.72rem' } },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </>
        )}

        {pageFirst && pagesSection}

        {q.length >= 2 && (
          <>
            <Typography sx={sectionLabelSx}>Companies</Typography>
            {isSearching ? (
              <Box sx={{ px: 1, py: 0.5 }}>
                <Skeleton height={34} sx={{ mb: 0.5 }} />
                <Skeleton height={34} sx={{ mb: 0.5 }} />
                <Skeleton height={34} />
              </Box>
            ) : otherCompanies.length > 0 ? (
              <List dense sx={{ pt: 0 }}>
                {otherCompanies.map((r) => (
                  <ListItem key={r.symbol} sx={{ p: 0, mb: 0.5 }}>
                    <ListItemButton onClick={() => onSearchEnter(r.symbol)} sx={hoverItemSx}>
                      <ListItemIcon sx={{ minWidth: 'auto', mr: 2 }}>
                        <Iconify icon="mdi:office-building-outline" />
                      </ListItemIcon>
                      <ListItemText
                        primary={r.symbol}
                        secondary={r.description}
                        slotProps={{
                          primary: { sx: { fontWeight: 600 } },
                          secondary: { sx: { fontSize: '0.72rem' } },
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography sx={{ px: 1, py: 0.5, fontSize: '0.78rem', color: 'text.disabled' }}>
                No other matching companies.
              </Typography>
            )}
          </>
        )}

        {q && (
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
        )}

        {q && !pageFirst && matchingPages.length > 0 && pagesSection}

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
        {!q && pagesSection}
      </DialogContent>
    </Dialog>
  );
}
