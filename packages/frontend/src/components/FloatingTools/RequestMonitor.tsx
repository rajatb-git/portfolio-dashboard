import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import api from '@/api';
import { Iconify } from '@/components/Iconify';
import { DATA_ACCENT, FONT_SIZE, FONT_STACK_MONO, RADIUS, SURFACE, TABULAR } from '@/components/ThemeRegistry/tokens';
import { browserRequests, type LoggedRequest, RequestStore } from '@/utils/requestLog';

import { displayUrl, formatBody, formatDuration } from './format';

type Source = 'browser' | 'server';
type Connection = 'connecting' | 'live' | 'retrying';

const SOURCE_KEY = 'debug_monitor_source';
const RETRY_MS = 3000;
const SLOW_MS = 1000;

const serverRequests = new RequestStore(500);

function useServerTail(enabled: boolean): Connection {
  const [connection, setConnection] = React.useState<Connection>('connecting');

  React.useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer: number | undefined;
    let toasted = false;

    const connect = () => {
      setConnection('connecting');
      api.debug
        .streamServerRequests((event) => {
          if (event.type === 'snapshot') {
            serverRequests.replaceAll(event.entries);
            setConnection('live');
            toasted = false;
          } else if (event.type === 'entry') {
            serverRequests.upsert(event.entry);
          }
        }, controller.signal)
        .catch((err) => {
          if (controller.signal.aborted) return;
          if (!toasted) {
            toast.error(err.message || 'Lost the connection to the server request stream');
            toasted = true;
          }
        })
        .finally(() => {
          if (controller.signal.aborted) return;
          setConnection('retrying');
          timer = window.setTimeout(connect, RETRY_MS);
        });
    };

    connect();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [enabled]);

  return connection;
}

function useNow(active: boolean): number {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [active]);
  return now;
}

function matches(entry: LoggedRequest, query: string, errorsOnly: boolean): boolean {
  if (errorsOnly && !(entry.error || (entry.status ?? 0) >= 400)) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return `${entry.method} ${entry.url} ${entry.status ?? ''}`.toLowerCase().includes(q);
}

function StatusCell({ entry }: { entry: LoggedRequest }) {
  const theme = useTheme();
  if (entry.endedAt === undefined) {
    return (
      <Box
        aria-label="In flight"
        sx={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          bgcolor: DATA_ACCENT[theme.palette.mode].main,
          boxShadow: `0 0 0 3px ${DATA_ACCENT[theme.palette.mode].bg}`,
          justifySelf: 'end',
          mr: '6px',
          '@keyframes rm-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.3 } },
          animation: 'rm-pulse 1s ease-in-out infinite',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
    );
  }
  const status = entry.status;
  const color = !status
    ? theme.palette.error.main
    : status >= 500
      ? theme.palette.error.main
      : status >= 400
        ? theme.palette.warning.main
        : theme.palette.text.secondary;
  return (
    <Box component="span" sx={{ color, fontWeight: status && status < 400 ? 400 : 700, textAlign: 'right' }}>
      {status ?? 'ERR'}
    </Box>
  );
}

function DurationCell({ entry, now }: { entry: LoggedRequest; now: number }) {
  const theme = useTheme();
  const ms = (entry.endedAt ?? now) - entry.startedAt;
  const inFlight = entry.endedAt === undefined;
  const accent = DATA_ACCENT[theme.palette.mode].main;
  return (
    <Box sx={{ textAlign: 'right', minWidth: 0 }}>
      <Box component="span" sx={{ color: inFlight || ms >= SLOW_MS ? accent : 'text.secondary' }}>
        {formatDuration(ms)}
      </Box>
      <Box sx={{ height: 2, mt: '2px', bgcolor: alpha(theme.palette.text.primary, 0.06), borderRadius: 1 }}>
        <Box
          sx={{
            height: '100%',
            width: `${Math.min(100, (Math.log10(Math.max(ms, 1)) / 4) * 100)}%`,
            bgcolor: inFlight || ms >= SLOW_MS ? accent : alpha(theme.palette.text.primary, 0.28),
            borderRadius: 1,
            ml: 'auto',
          }}
        />
      </Box>
    </Box>
  );
}

function Section({ title, text, defaultOpen }: { title: string; text: string; defaultOpen: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  if (!text) return null;
  const copy = () => {
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success(`Copied ${title.toLowerCase()}`))
      .catch((err) => toast.error(err?.message || 'Copy failed'));
  };
  return (
    <Box sx={{ mt: 1 }}>
      <Stack direction="row" sx={{ alignItems: 'center' }}>
        <ButtonBase
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          sx={{
            gap: 0.5,
            py: 0.5,
            pr: 1,
            borderRadius: `${RADIUS.xs}px`,
            color: 'text.secondary',
            fontSize: FONT_SIZE.xs,
            fontWeight: 600,
          }}
        >
          <Iconify icon={open ? 'tabler:chevron-down' : 'tabler:chevron-right'} width={14} />
          {title}
        </ButtonBase>
        <Box sx={{ flex: 1 }} />
        {open && (
          <Button
            size="small"
            color="inherit"
            onClick={copy}
            sx={{ minWidth: 0, fontSize: FONT_SIZE.micro, color: 'text.disabled' }}
          >
            Copy
          </Button>
        )}
      </Stack>
      {open && (
        <Box
          component="pre"
          sx={{
            m: 0,
            p: 1,
            maxHeight: 320,
            overflow: 'auto',
            fontFamily: FONT_STACK_MONO,
            fontSize: FONT_SIZE.micro,
            lineHeight: 1.55,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            bgcolor: 'background.default',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: `${RADIUS.sm}px`,
          }}
        >
          {text}
        </Box>
      )}
    </Box>
  );
}

function headersText(headers?: Record<string, string>): string {
  return headers
    ? Object.entries(headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n')
    : '';
}

function Detail({ entry, now }: { entry: LoggedRequest; now: number }) {
  const ms = (entry.endedAt ?? now) - entry.startedAt;
  return (
    <Box sx={{ px: 1.5, pb: 1.5, pt: 0.5, fontSize: FONT_SIZE.xs }}>
      <Typography sx={{ fontFamily: FONT_STACK_MONO, fontSize: FONT_SIZE.xs, wordBreak: 'break-all', mb: 0.5 }}>
        {entry.method} {entry.url}
      </Typography>
      <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary' }}>
        {entry.endedAt === undefined
          ? 'Waiting for a response'
          : entry.status
            ? `Status ${entry.status}`
            : 'No response'}
        {', '}
        {formatDuration(ms)}
        {', started '}
        {moment(entry.startedAt).format('HH:mm:ss.SSS')}
      </Typography>
      {entry.error && (
        <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'error.main', mt: 0.5 }}>{entry.error}</Typography>
      )}
      <Section title="Request headers" text={headersText(entry.requestHeaders)} defaultOpen={false} />
      <Section title="Request body" text={formatBody(entry.requestBody)} defaultOpen />
      <Section title="Response headers" text={headersText(entry.responseHeaders)} defaultOpen={false} />
      <Section title="Response body" text={formatBody(entry.responseBody)} defaultOpen />
    </Box>
  );
}

const ROW_COLUMNS = {
  browser: '52px minmax(0,1fr) 40px 64px',
  server: '18px 52px minmax(0,1fr) 40px 64px',
};
const TIME_COLUMN = '82px ';

type RequestMonitorProps = {
  onClose: () => void;
};

export default function RequestMonitor({ onClose }: RequestMonitorProps) {
  const theme = useTheme();
  const mode = theme.palette.mode;
  const [source, setSource] = React.useState<Source>(() =>
    localStorage.getItem(SOURCE_KEY) === 'server' ? 'server' : 'browser'
  );
  const [query, setQuery] = React.useState('');
  const [errorsOnly, setErrorsOnly] = React.useState(false);
  const [frozen, setFrozen] = React.useState<LoggedRequest[] | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [atBottom, setAtBottom] = React.useState(true);
  const listRef = React.useRef<HTMLDivElement>(null);

  const store = source === 'browser' ? browserRequests : serverRequests;
  const live = React.useSyncExternalStore(store.subscribe, store.getSnapshot);
  const connection = useServerTail(source === 'server');
  const entries = frozen ?? live;
  const visible = entries.filter((e) => matches(e, query.trim(), errorsOnly));
  const now = useNow(visible.some((e) => e.endedAt === undefined));
  const newSincePause = React.useMemo(() => {
    if (!frozen) return 0;
    const seen = new Set(frozen.map((e) => e.id));
    return live.filter((e) => !seen.has(e.id)).length;
  }, [frozen, live]);

  const changeSource = (next: Source | null) => {
    if (!next) return;
    setSource(next);
    setFrozen(null);
    setSelectedId(null);
    try {
      localStorage.setItem(SOURCE_KEY, next);
    } catch {
      // Remembering the tab is a convenience; private mode can refuse it.
    }
  };

  const scrollToEnd = React.useCallback(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  // A tail follows the newest line unless the reader has scrolled up to look at something.
  React.useLayoutEffect(() => {
    if (atBottom) scrollToEnd();
  }, [visible.length, atBottom, scrollToEnd]);

  const onScroll = () => {
    const el = listRef.current;
    if (el) setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
  };

  const status =
    frozen !== null
      ? { label: 'Paused', color: theme.palette.text.disabled }
      : source === 'browser' || connection === 'live'
        ? { label: 'Live', color: DATA_ACCENT[mode].main }
        : { label: connection === 'connecting' ? 'Connecting' : 'Reconnecting', color: theme.palette.text.disabled };

  const columns = ROW_COLUMNS[source];

  return (
    <Box
      component="section"
      aria-label="Request monitor"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        bgcolor: SURFACE[mode].sunken,
        containerType: 'inline-size',
        // On a phone, or a narrow side pane, the clock column gives its room to the URL.
        '@container (max-width: 520px)': {
          '& .rm-row': { gridTemplateColumns: columns },
          '& .rm-time, & .rm-title': { display: 'none' },
        },
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, minHeight: 48 }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mr: 0.5 }}>
          <Box
            role="img"
            aria-label={status.label}
            title={status.label}
            sx={{
              width: 8,
              height: 8,
              flexShrink: 0,
              borderRadius: '50%',
              bgcolor: status.color,
              transition: 'background-color 200ms',
            }}
          />
          <Typography className="rm-title" sx={{ fontWeight: 600, fontSize: FONT_SIZE.md }}>
            Requests
          </Typography>
          <Typography className="rm-title" sx={{ fontSize: FONT_SIZE.xs, color: 'text.disabled' }}>
            {status.label}
          </Typography>
        </Stack>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={source}
          onChange={(_e, next) => changeSource(next)}
          aria-label="Which requests to show"
          sx={{
            '& .MuiToggleButton-root': {
              py: 0.25,
              px: 1.25,
              fontSize: FONT_SIZE.xs,
              textTransform: 'none',
              minHeight: 30,
            },
          }}
        >
          <ToggleButton value="browser">This browser</ToggleButton>
          <ToggleButton value="server">Server</ToggleButton>
        </ToggleButtonGroup>
        <Box sx={{ flex: 1 }} />
        <Tooltip title={frozen ? 'Resume' : 'Pause'}>
          <IconButton
            onClick={() => setFrozen(frozen ? null : live)}
            aria-label={frozen ? 'Resume' : 'Pause'}
            aria-pressed={frozen !== null}
            sx={{ width: 40, height: 40 }}
          >
            <Iconify icon={frozen ? 'tabler:player-play-filled' : 'tabler:player-pause-filled'} width={17} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Clear">
          <IconButton
            onClick={() => {
              store.clear();
              setFrozen(null);
              setSelectedId(null);
            }}
            aria-label="Clear requests"
            sx={{ width: 40, height: 40 }}
          >
            <Iconify icon="tabler:clear-all" width={19} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close monitor">
          <IconButton onClick={onClose} aria-label="Close request monitor" sx={{ width: 40, height: 40 }}>
            <Iconify icon="tabler:x" width={19} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, pb: 1 }}>
        <TextField
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by path, method or status"
          size="small"
          fullWidth
          slotProps={{
            htmlInput: { 'aria-label': 'Filter requests' },
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="tabler:filter" width={15} sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            },
          }}
          sx={{ '& .MuiInputBase-root': { height: 34, fontSize: { xs: '16px', sm: FONT_SIZE.sm } } }}
        />
        <ToggleButton
          value="errors"
          size="small"
          selected={errorsOnly}
          onChange={() => setErrorsOnly((v) => !v)}
          sx={{ height: 34, px: 1.25, whiteSpace: 'nowrap', textTransform: 'none', fontSize: FONT_SIZE.xs }}
        >
          Errors only
        </ToggleButton>
      </Stack>

      <Box
        role="row"
        className="rm-row"
        sx={{
          display: 'grid',
          gridTemplateColumns: TIME_COLUMN + columns,
          columnGap: 1,
          px: 1.5,
          py: 0.5,
          borderTop: `1px solid ${theme.palette.divider}`,
          borderBottom: `1px solid ${theme.palette.divider}`,
          fontSize: FONT_SIZE.micro,
          color: 'text.disabled',
          fontWeight: 600,
        }}
      >
        <span className="rm-time">Time</span>
        {source === 'server' && <span title="In: a request to this server. Out: a call the server made.">Dir</span>}
        <span>Method</span>
        <span>URL</span>
        <span style={{ textAlign: 'right' }}>Status</span>
        <span style={{ textAlign: 'right' }}>Time taken</span>
      </Box>

      <Box
        ref={listRef}
        onScroll={onScroll}
        role="log"
        aria-live="off"
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          fontFamily: FONT_STACK_MONO,
          fontSize: FONT_SIZE.xs,
          fontFeatureSettings: TABULAR,
          position: 'relative',
        }}
      >
        {visible.length === 0 ? (
          <Box sx={{ px: 2, py: 4, fontFamily: 'inherit', color: 'text.secondary', textAlign: 'center' }}>
            {entries.length > 0
              ? 'No requests match this filter.'
              : source === 'browser'
                ? 'Use the app and its requests to the server appear here as they happen.'
                : connection === 'live'
                  ? 'Requests to the server, and the calls it makes to Finnhub, NASDAQ and Ollama, appear here.'
                  : 'Connecting to the server…'}
          </Box>
        ) : (
          visible.map((entry) => {
            const selected = entry.id === selectedId;
            return (
              <Box
                key={entry.id}
                sx={{
                  borderBottom: `1px solid ${SURFACE[mode].rule}`,
                  bgcolor: selected ? SURFACE[mode].selected : 'transparent',
                }}
              >
                <ButtonBase
                  onClick={() => setSelectedId(selected ? null : entry.id)}
                  aria-expanded={selected}
                  className="rm-row"
                  sx={{
                    width: '100%',
                    display: 'grid',
                    gridTemplateColumns: TIME_COLUMN + columns,
                    columnGap: 1,
                    alignItems: 'center',
                    px: 1.5,
                    minHeight: 34,
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    color: 'text.primary',
                    '&:hover': { bgcolor: selected ? undefined : SURFACE[mode].hover },
                  }}
                >
                  <Box component="span" className="rm-time" sx={{ color: 'text.disabled' }}>
                    {moment(entry.startedAt).format('HH:mm:ss.SS')}
                  </Box>
                  {source === 'server' && (
                    <Iconify
                      icon={entry.direction === 'in' ? 'tabler:arrow-down-right' : 'tabler:arrow-up-right'}
                      width={14}
                      aria-label={entry.direction === 'in' ? 'In' : 'Out'}
                      role="img"
                      sx={{ color: entry.direction === 'in' ? 'primary.main' : 'secondary.light' }}
                    />
                  )}
                  <Box
                    component="span"
                    sx={{ fontWeight: 600, color: entry.method === 'GET' ? 'text.secondary' : 'text.primary' }}
                  >
                    {entry.method}
                  </Box>
                  <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayUrl(entry.url)}
                  </Box>
                  <StatusCell entry={entry} />
                  <DurationCell entry={entry} now={now} />
                </ButtonBase>
                {selected && <Detail entry={entry} now={now} />}
              </Box>
            );
          })
        )}
      </Box>

      {(frozen || !atBottom) && (
        <Stack direction="row" sx={{ justifyContent: 'center', position: 'relative', height: 0 }}>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              setFrozen(null);
              setAtBottom(true);
              scrollToEnd();
            }}
            startIcon={<Iconify icon="tabler:arrow-down" width={15} />}
            sx={{
              position: 'absolute',
              bottom: 12,
              borderRadius: `${RADIUS.pill}px`,
              boxShadow: 4,
              textTransform: 'none',
            }}
          >
            {frozen ? (newSincePause > 0 ? `Resume, ${newSincePause} new` : 'Resume') : 'Jump to latest'}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
