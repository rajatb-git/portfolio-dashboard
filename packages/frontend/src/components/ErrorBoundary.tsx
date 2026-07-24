import * as React from 'react';
import { Box, Button, Card, Stack, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import { Iconify } from '@/components/Iconify';

type Props = {
  children: React.ReactNode;
};

type State = {
  error: Error | null;
};

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack);
    toast.error(error.message || 'Something went wrong');
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 6, px: 2 }}>
        <Card variant="outlined" sx={{ p: 4, maxWidth: 560, width: '100%', textAlign: 'center' }}>
          <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
            <Iconify icon="eva:alert-triangle-fill" width={40} sx={{ color: 'error.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Something went wrong
            </Typography>
            <Typography
              sx={{
                fontSize: '0.85rem',
                color: 'error.main',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
              }}
            >
              {error.message || String(error)}
            </Typography>
            <Button variant="outlined" size="small" onClick={this.reset} sx={{ mt: 1 }}>
              Try again
            </Button>
          </Stack>
        </Card>
      </Box>
    );
  }
}
