import * as React from 'react';
import { Box, Skeleton, Stack } from '@mui/material';
import { useAuth } from '@/contexts/AuthContext';
import UnlockScreen from './UnlockScreen';

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, token, expiresAt, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          p: 2,
          zIndex: 2000,
        }}
      >
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 360 }}>
          <Skeleton variant="rounded" height={36} />
          <Skeleton variant="rounded" height={36} />
          <Skeleton variant="rounded" height={220} />
        </Stack>
      </Box>
    );
  }

  const tokenValid = !!token && !!expiresAt && expiresAt > Date.now();
  if (status?.enabled && !tokenValid) {
    return <UnlockScreen />;
  }

  return <>{children}</>;
}
