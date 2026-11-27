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
  Skeleton,
  Stack,
  TextField,
} from '@mui/material';
import * as React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import { AiRequestLogViewer } from '@/components/AiRequestLogViewer';
import { Iconify } from '@/components/Iconify';
import { type LogLevelFilter, LogsViewer } from '@/components/LogViewer';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';
import type { IAiRequestLog } from '@/models/AiRequestLogModel';

type File = 'error' | 'combined' | 'ai';

const FILE_LABELS: Record<File, string> = {
  error: 'error.log',
  combined: 'combined.log',
  ai: 'AI requests',
};

export default function Logs() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [file, setFile] = React.useState<File>('combined');
  const [logData, setLogData] = React.useState('');
  const [aiRequests, setAiRequests] = React.useState<IAiRequestLog[]>([]);
  const [confirmClear, setConfirmClear] = React.useState(false);
  const [level, setLevel] = React.useState<LogLevelFilter>('all');
  const [query, setQuery] = React.useState('');

  const loadData = () => {
    setIsLoading(true);

    if (file === 'ai') {
      apis.logs
        .getAiRequests()
        .then(setAiRequests)
        .catch((err) => {
          setAiRequests([]);
          toast.error(err.message || 'Failed to load AI requests');
        })
        .finally(() => setIsLoading(false));
      return;
    }

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

    if (file === 'ai') {
      apis.logs
        .clearAiRequests()
        .then((response) => {
          setAiRequests(response);
          toast.success('Cleared AI request log');
        })
        .catch((err) => toast.error(err.message || 'Failed to clear AI requests'))
        .finally(() => setIsLoading(false));
      return;
    }

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
              <MenuItem value="ai">AI requests</MenuItem>
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
              label={`Refresh ${FILE_LABELS[file]}`}
              onClick={loadData}
              busy={isLoading}
              color="primary.main"
            />
          </>
        }
      />

      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
        {file !== 'ai' && (
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
        )}
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

      {file === 'ai' ? (
        isLoading ? (
          <Stack spacing={1}>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} variant="rounded" height={48} />
            ))}
          </Stack>
        ) : (
          <AiRequestLogViewer entries={aiRequests} query={query} />
        )
      ) : (
        <LogsViewer data={logData} level={level} query={query} />
      )}

      <Dialog open={confirmClear} onClose={() => setConfirmClear(false)}>
        <DialogTitle>Clear {FILE_LABELS[file]}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {file === 'ai'
              ? 'This permanently deletes every logged AI request.'
              : 'This permanently deletes every entry in the log file.'}
          </DialogContentText>
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
