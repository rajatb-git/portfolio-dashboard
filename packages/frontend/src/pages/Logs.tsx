import * as React from 'react';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  MenuItem,
  Select,
} from '@mui/material';
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
  const [confirmClear, setConfirmClear] = React.useState(false);

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
    setConfirmClear(false);
    setIsLoading(true);

    apis.logs
      .deleteLogs(file)
      .then((response) => {
        setLogData(response);
        toast.success(`Cleared ${file}.log`);
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
              onClick={() => setConfirmClear(true)}
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

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Clear {file}.log?</DialogTitle>
        <DialogContent>
          <DialogContentText>This permanently deletes every entry in the log file.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClear(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={deleteLogs}>
            Clear
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
