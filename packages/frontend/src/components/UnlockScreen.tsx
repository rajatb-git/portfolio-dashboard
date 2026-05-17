import * as React from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { Iconify } from '@/components/Iconify';
import { useAuth } from '@/contexts/AuthContext';

const CODE_LEN = 6;

export default function UnlockScreen() {
  const { unlock } = useAuth();
  const [digits, setDigits] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [shake, setShake] = React.useState(false);

  const clear = React.useCallback(() => setDigits(''), []);

  const submit = React.useCallback(
    async (code: string) => {
      setSubmitting(true);
      try {
        await unlock(code);
      } catch (err: any) {
        toast.error(err.message || 'Unlock failed');
        setShake(true);
        window.setTimeout(() => setShake(false), 450);
        clear();
      } finally {
        setSubmitting(false);
      }
    },
    [unlock, clear],
  );

  const appendDigit = React.useCallback(
    (d: string) => {
      if (submitting) return;
      setDigits((prev) => {
        if (prev.length >= CODE_LEN) return prev;
        const next = prev + d;
        if (next.length === CODE_LEN) {
          // Defer the submit so React commits the final dot first.
          window.setTimeout(() => submit(next), 0);
        }
        return next;
      });
    },
    [submit, submitting],
  );

  const backspace = React.useCallback(() => {
    if (submitting) return;
    setDigits((prev) => prev.slice(0, -1));
  }, [submitting]);

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (submitting) return;
      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        appendDigit(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        backspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (digits.length === CODE_LEN) submit(digits);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [appendDigit, backspace, submit, digits, submitting]);

  const keys: Array<{ label: string; onClick: () => void; icon?: string }> = [
    { label: '1', onClick: () => appendDigit('1') },
    { label: '2', onClick: () => appendDigit('2') },
    { label: '3', onClick: () => appendDigit('3') },
    { label: '4', onClick: () => appendDigit('4') },
    { label: '5', onClick: () => appendDigit('5') },
    { label: '6', onClick: () => appendDigit('6') },
    { label: '7', onClick: () => appendDigit('7') },
    { label: '8', onClick: () => appendDigit('8') },
    { label: '9', onClick: () => appendDigit('9') },
    { label: '', onClick: () => {} },
    { label: '0', onClick: () => appendDigit('0') },
    { label: '', onClick: backspace, icon: 'mdi:backspace-outline' },
  ];

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        bgcolor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
        zIndex: 2000,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 360,
          p: 4,
          textAlign: 'center',
          bgcolor: 'background.paper',
          animation: shake ? 'unlockShake 0.42s ease-in-out' : 'none',
          '@keyframes unlockShake': {
            '0%, 100%': { transform: 'translateX(0)' },
            '20%': { transform: 'translateX(-10px)' },
            '40%': { transform: 'translateX(10px)' },
            '60%': { transform: 'translateX(-6px)' },
            '80%': { transform: 'translateX(6px)' },
          },
        }}
      >
        <Stack spacing={3} sx={{ alignItems: 'center' }}>
          <Iconify icon="mdi:lock-outline" width={36} sx={{ color: 'text.secondary' }} />
          <Box>
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 700, color: 'text.primary' }}>
              Enter code
            </Typography>
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.5 }}>
              6-digit code required to unlock this dashboard
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.25} sx={{ justifyContent: 'center' }}>
            {Array.from({ length: CODE_LEN }).map((_, i) => {
              const filled = i < digits.length;
              return (
                <Box
                  key={`dot-${i}`}
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '1.5px solid',
                    borderColor: filled ? 'primary.main' : 'divider',
                    bgcolor: filled ? 'primary.main' : 'transparent',
                    transition: 'all 0.15s ease',
                  }}
                />
              );
            })}
          </Stack>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 1.25,
              width: '100%',
            }}
          >
            {keys.map((k, i) => {
              const isPlaceholder = !k.label && !k.icon;
              if (isPlaceholder) {
                return <Box key={`k-${i}`} />;
              }
              return (
                <Button
                  key={`k-${i}`}
                  variant="outlined"
                  onClick={k.onClick}
                  disabled={submitting}
                  sx={{
                    minHeight: 56,
                    fontSize: '1.2rem',
                    fontWeight: 600,
                    color: 'text.primary',
                    borderColor: 'divider',
                  }}
                >
                  {k.icon ? <Iconify icon={k.icon} width={20} /> : k.label}
                </Button>
              );
            })}
          </Box>
        </Stack>
      </Card>
    </Box>
  );
}
