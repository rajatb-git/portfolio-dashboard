'use client';

import * as React from 'react';

import { Box, Button, MenuItem, Select } from '@mui/material';
import { ErrorBoundary } from 'next/dist/client/components/error-boundary';
import { SnackbarProvider, enqueueSnackbar } from 'notistack';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import { LogsViewer } from '@/components/LogViewer';
import { SNACKBAR_AUTOHIDE_DURATION } from '@/config';

import Error from './error';

type File = 'error' | 'combined';

export default function LogsPage() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [file, setFile] = React.useState<File>('combined');
  const [logData, setLogData] = React.useState('');

  const loadData = () => {
    setIsLoading(true);

    apis.logs
      .getLogs(file)
      .then((response) => {
        setLogData(response);
      })
      .catch((err) => {
        enqueueSnackbar({ message: err.message, variant: 'error' });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadData();
  }, [file]);

  return (
    <ErrorBoundary errorComponent={Error}>
      <Box sx={{ display: 'flex', direction: 'row', justifyContent: 'space-between', mb: 2 }}>
        <Select value={file} onChange={(e) => setFile(e.target.value as File)} size="small" disabled={isLoading}>
          <MenuItem value="error">error.log</MenuItem>

          <MenuItem value="combined">combined.log</MenuItem>
        </Select>

        <Button
          variant="contained"
          startIcon={<Iconify icon="mynaui:refresh" />}
          onClick={loadData}
          size="small"
          color="secondary"
        >
          Refresh
        </Button>
      </Box>

      <LogsViewer data={logData} />

      <SnackbarProvider autoHideDuration={SNACKBAR_AUTOHIDE_DURATION} />
    </ErrorBoundary>
  );
}
