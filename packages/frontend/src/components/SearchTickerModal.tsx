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
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Iconify } from './Iconify';
import { useNavigate } from 'react-router-dom';
import LocalStorageArray from '@/utils/localStorageArray';

type SearchTickerModalProps = {
  refreshSearchHistory: VoidFunction;
  isOpen: boolean;
  onClose: () => void;
  searchHistory: Array<string> | null;
};

export function SearchTickerModal({ refreshSearchHistory, searchHistory, isOpen, onClose }: SearchTickerModalProps) {
  const navigate = useNavigate();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const onSearchEnter = (searchText: string) => {
    onClose();

    LocalStorageArray.add('searchText', searchText.toUpperCase());

    navigate(`/research?searchText=${searchText}`);
  };

  const removeItemFromSearchHistory = (searchText: string) => {
    LocalStorageArray.remove('searchText', searchText);
    refreshSearchHistory();
  };

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
          placeholder="Ticker search"
          inputProps={{
            'aria-label': 'search',
          }}
          autoFocus={true}
          // workaround to get auto foxus to work
          inputRef={(input) => input && input.focus()}
          onKeyUp={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
              onSearchEnter(e.currentTarget.value);
            }
          }}
        />

        <Button
          variant="outlined"
          onClick={onClose}
          sx={{ p: '0px 8px', minWidth: 'auto', borderColor: theme.palette.divider, color: theme.palette.text.disabled }}
        >
          <kbd>esc</kbd>
        </Button>
      </Box>

      <DialogContent dividers sx={{ pr: 1, pl: 1 }}>
        <List dense={false}>
          {searchHistory &&
            searchHistory.map((search) => (
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
      </DialogContent>
    </Dialog>
  );
}
