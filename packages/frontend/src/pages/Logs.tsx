import * as React from 'react';

import { Button, MenuItem, Select, Stack } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import { LogsViewer } from '@/components/LogViewer';

type File = 'error' | 'combined';

export default function Logs() {
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
        toast.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const deleteLogs = () => {
    setIsLoading(true);

    apis.logs
      .deleteLogs(file)
      .then((response) => {
        setLogData(response);
      })
      .catch((err) => {
        toast.error(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  React.useEffect(() => {
    loadData();
  }, [file]);

  return (
    <>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        gap={1}
        sx={{ mb: 2 }}
      >
        <Select value={file} onChange={(e) => setFile(e.target.value as File)} size="small" disabled={isLoading}>
          <MenuItem value="error">error.log</MenuItem>
          <MenuItem value="combined">combined.log</MenuItem>
        </Select>

        <Stack direction="row" gap={1}>
          <Button
            variant="contained"
            startIcon={<Iconify icon="mdi:delete-empty" />}
            onClick={deleteLogs}
            size="small"
            color="primary"
          >
            Delete Logs
          </Button>

          <Button
            variant="contained"
            startIcon={<Iconify icon="mynaui:refresh" />}
            onClick={loadData}
            size="small"
            color="secondary"
          >
            Refresh
          </Button>
        </Stack>
      </Stack>

      <LogsViewer data={logData} />
    </>
  );
}
