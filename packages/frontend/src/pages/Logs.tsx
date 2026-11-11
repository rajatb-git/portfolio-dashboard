import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  InputAdornment,
  MenuItem,
  Select,
  Stack,
  TextField,
} from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { Iconify } from '@/components/Iconify';
import { type LogLevelFilter, LogsViewer } from '@/components/LogViewer';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';

type File = 'error' | 'combined';

export default function Logs() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [file, setFile] = React.useState<File>('combined');
  const [logData, setLogData] = React.useState('');
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [level, setLevel] = React.useState<LogLevelFilter>('all');
  const [query, setQuery] = React.useState('');

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

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        <Select
          value={level}
          onChange={(e) => setLevel(e.target.value as LogLevelFilter)}
          size="small"
          aria-label="Log level"
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="all">All levels</MenuItem>
          <MenuItem value="error">Errors</MenuItem>
          <MenuItem value="warn">Warnings</MenuItem>
          <MenuItem value="info">Info</MenuItem>
        </Select>
        <TextField
          size="small"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by text, symbol or label"
          slotProps={{
            htmlInput: { 'aria-label': 'Filter log lines' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="tabler:search" width={16} aria-hidden />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: '1 1 220px', maxWidth: 420 }}
        />
      </Stack>

      <LogsViewer data={logData} level={level} query={query} />

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
