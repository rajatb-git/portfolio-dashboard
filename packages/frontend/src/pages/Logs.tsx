import * as React from 'react';

import { Button, MenuItem, Select } from '@mui/material';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import { LogsViewer } from '@/components/LogViewer';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';

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
      <PageHeader
        title="Logs"
        subtitle="Backend activity written by the server"
        actions={
          <>
            <Select
              value={file}
              onChange={(e) => setFile(e.target.value as File)}
              size="small"
              disabled={isLoading}
              aria-label="Log file"
              sx={{ minWidth: 150 }}
            >
              <MenuItem value="error">error.log</MenuItem>
              <MenuItem value="combined">combined.log</MenuItem>
            </Select>

            <Button
              variant="outlined"
              color="error"
              startIcon={<Iconify icon="tabler:trash" width={16} aria-hidden />}
              onClick={deleteLogs}
              disabled={isLoading}
              size="small"
            >
              Clear
            </Button>

            <ToolbarButton
              icon="tabler:refresh"
              label={`Refresh ${file}.log`}
              onClick={loadData}
              busy={isLoading}
              color="primary.main"
            />
          </>
        }
      />

      <LogsViewer data={logData} />
    </>
  );
}
