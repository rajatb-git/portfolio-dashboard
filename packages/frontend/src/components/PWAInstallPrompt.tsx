import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Typography from '@mui/material/Typography';
import * as React from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'pwa_install_dismissed';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Once dismissed it stays dismissed; it used to return on every visit.
      if (localStorage.getItem(DISMISSED_KEY) !== 'true') setOpen(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
    setOpen(false);
  };

  const handleClose = () => {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setOpen(false);
  };

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ mb: 1 }}
      message={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Icon icon="mdi:download-circle-outline" width={20} />
          <Typography variant="body2">Install Portfolio Dashboard</Typography>
        </Box>
      }
      action={
        <>
          <Button color="primary" size="small" onClick={handleInstall}>
            Install
          </Button>
          <IconButton size="small" color="inherit" onClick={handleClose}>
            <Icon icon="mdi:close" width={16} />
          </IconButton>
        </>
      }
    />
  );
}
