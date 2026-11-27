import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import moment from 'moment';
import * as React from 'react';
import { toast } from 'react-toastify';

import { Iconify } from '@/components/Iconify';
import { DATA_ACCENT, FONT_SIZE, FONT_STACK_MONO, RADIUS, SURFACE } from '@/components/ThemeRegistry/tokens';
import { DB_HOST } from '@/config';
import type { LoggedRequest } from '@/utils/requestLog';

import { formatBody, formatDuration } from './format';

type DetailTab = 'response' | 'request' | 'headers';

const MASKED = '•••';
const ARRAY_PREVIEW = 100;

function parseJson(body: unknown): unknown {
  if (body == null || body === '') return undefined;
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);
      return parsed !== null && typeof parsed === 'object' ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  if (body instanceof Blob || body instanceof FormData) return undefined;
  return typeof body === 'object' ? body : undefined;
}

function absoluteUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${DB_HOST}${url}`;
}

function toCurl(entry: LoggedRequest): string {
  const quote = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;
  const parts = [`curl -X ${entry.method} ${quote(absoluteUrl(entry.url))}`];
  for (const [name, value] of Object.entries(entry.requestHeaders ?? {})) {
    if (value !== MASKED) parts.push(`-H ${quote(`${name}: ${value}`)}`);
  }
  const body = entry.requestBody;
  if (body != null && body !== '') {
    parts.push(`--data-raw ${quote(typeof body === 'string' ? body : JSON.stringify(body))}`);
  }
  return parts.join(' \\\n  ');
}

function copy(text: string, what: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success(`Copied ${what}`))
    .catch((err) => toast.error(err?.message || `Couldn't copy ${what}`));
}

function JsonValue({ value }: { value: unknown }) {
  const theme = useTheme();
  if (value === null)
    return (
      <Box component="span" sx={{ color: 'secondary.light' }}>
        null
      </Box>
    );
  if (typeof value === 'string') {
    return (
      <Box component="span" sx={{ color: 'text.primary', wordBreak: 'break-word' }}>
        "{value}"
      </Box>
    );
  }
  if (typeof value === 'number') {
    return (
      <Box component="span" sx={{ color: DATA_ACCENT[theme.palette.mode].main }}>
        {value}
      </Box>
    );
  }
  return (
    <Box component="span" sx={{ color: 'secondary.light' }}>
      {String(value)}
    </Box>
  );
}

function JsonNode({ name, value, depth }: { name?: string; value: unknown; depth: number }) {
  const isArray = Array.isArray(value);
  const isObject = value !== null && typeof value === 'object';
  const size = isObject ? (isArray ? value.length : Object.keys(value as object).length) : 0;
  const [open, setOpen] = React.useState(depth < 2 && !(isArray && size > 20 && depth > 0));
  const [showAll, setShowAll] = React.useState(false);

  const label =
    name === undefined ? null : (
      <Box component="span" sx={{ color: 'text.secondary' }}>
        {name}
        <Box component="span" sx={{ color: 'text.disabled', whiteSpace: 'pre' }}>
          {': '}
        </Box>
      </Box>
    );

  if (!isObject) {
    return (
      <Box sx={{ pl: 2.25 }}>
        {label}
        <JsonValue value={value} />
      </Box>
    );
  }

  const entries: [string, unknown][] = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v])
    : Object.entries(value as Record<string, unknown>);
  const shown = showAll ? entries : entries.slice(0, ARRAY_PREVIEW);
  const [openBrace, closeBrace] = isArray ? ['[', ']'] : ['{', '}'];
  const summary = isArray ? `${size} item${size === 1 ? '' : 's'}` : `${size} key${size === 1 ? '' : 's'}`;

  return (
    <Box>
      <ButtonBase
        onClick={() => setOpen((v) => !v)}
        disabled={size === 0}
        aria-expanded={open}
        sx={{
          fontFamily: 'inherit',
          fontSize: 'inherit',
          lineHeight: 'inherit',
          textAlign: 'left',
          justifyContent: 'flex-start',
          borderRadius: `${RADIUS.xs}px`,
          '&:hover': { bgcolor: 'action.hover' },
        }}
      >
        <Iconify
          icon="tabler:chevron-right"
          width={14}
          sx={{
            width: 18,
            color: 'text.disabled',
            visibility: size === 0 ? 'hidden' : 'visible',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms',
          }}
        />
        {label}
        <Box component="span" sx={{ color: 'text.disabled' }}>
          {open ? openBrace : `${openBrace} ${summary} ${closeBrace}`}
          {size === 0 && closeBrace}
        </Box>
      </ButtonBase>
      {open && size > 0 && (
        <>
          <Box sx={{ ml: '8px', pl: 1, borderLeft: (t) => `1px solid ${t.palette.divider}` }}>
            {shown.map(([key, child]) => (
              <JsonNode key={key} name={key} value={child} depth={depth + 1} />
            ))}
            {entries.length > shown.length && (
              <Button
                size="small"
                color="inherit"
                onClick={() => setShowAll(true)}
                sx={{ ml: 2, fontSize: FONT_SIZE.micro, color: 'text.secondary', textTransform: 'none' }}
              >
                Show {entries.length - shown.length} more
              </Button>
            )}
          </Box>
          <Box sx={{ pl: 2.25, color: 'text.disabled' }}>{closeBrace}</Box>
        </>
      )}
    </Box>
  );
}

function BodyView({ body, emptyText, what }: { body: unknown; emptyText: string; what: string }) {
  const json = React.useMemo(() => parseJson(body), [body]);
  const text = React.useMemo(() => formatBody(body), [body]);
  const [view, setView] = React.useState<'tree' | 'raw'>('tree');

  if (!text) {
    return <Typography sx={{ p: 2, fontSize: FONT_SIZE.sm, color: 'text.secondary' }}>{emptyText}</Typography>;
  }

  const showTree = json !== undefined && view === 'tree';
  return (
    <Box>
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, px: 1.5, py: 1 }}>
        {json !== undefined && (
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_e, next) => next && setView(next)}
            aria-label={`How to show the ${what}`}
            sx={{
              '& .MuiToggleButton-root': {
                py: 0,
                px: 1,
                minHeight: 26,
                fontSize: FONT_SIZE.micro,
                textTransform: 'none',
              },
            }}
          >
            <ToggleButton value="tree">Tree</ToggleButton>
            <ToggleButton value="raw">Raw</ToggleButton>
          </ToggleButtonGroup>
        )}
        <Typography sx={{ fontSize: FONT_SIZE.micro, color: 'text.disabled' }}>
          {text.length.toLocaleString()} characters
        </Typography>
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          color="inherit"
          onClick={() => copy(text, what)}
          startIcon={<Iconify icon="tabler:copy" width={14} />}
          sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary', textTransform: 'none' }}
        >
          Copy
        </Button>
      </Stack>
      <Box
        sx={{
          px: 1.5,
          pb: 2,
          fontFamily: FONT_STACK_MONO,
          fontSize: FONT_SIZE.xs,
          lineHeight: 1.6,
        }}
      >
        {showTree ? (
          <JsonNode value={json} depth={0} />
        ) : (
          <Box component="pre" sx={{ m: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', font: 'inherit' }}>
            {text}
          </Box>
        )}
      </Box>
    </Box>
  );
}

function HeaderTable({ title, headers }: { title: string; headers?: Record<string, string> }) {
  const rows = Object.entries(headers ?? {});
  return (
    <Box sx={{ px: 1.5, pt: 1.5 }}>
      <Typography sx={{ fontSize: FONT_SIZE.xs, fontWeight: 600, mb: 0.75 }}>{title}</Typography>
      {rows.length === 0 ? (
        <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary' }}>None recorded</Typography>
      ) : (
        <Box
          component="dl"
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(96px, max-content) minmax(0, 1fr)',
            columnGap: 1.5,
            rowGap: 0.5,
            fontFamily: FONT_STACK_MONO,
            fontSize: FONT_SIZE.xs,
            '& dt': { color: 'text.secondary' },
            '& dd': { m: 0, wordBreak: 'break-all' },
          }}
        >
          {rows.map(([name, value]) => (
            <Box key={name} sx={{ display: 'contents' }}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

type RequestDetailProps = {
  entry: LoggedRequest;
  now: number;
  onClose: () => void;
};

export default function RequestDetail({ entry, now, onClose }: RequestDetailProps) {
  const theme = useTheme();
  const inFlight = entry.endedAt === undefined;
  const [tab, setTab] = React.useState<DetailTab>(inFlight ? 'request' : 'response');
  const ms = (entry.endedAt ?? now) - entry.startedAt;
  const status = entry.status;
  const statusColor = inFlight
    ? DATA_ACCENT[theme.palette.mode].main
    : !status || status >= 500
      ? theme.palette.error.main
      : status >= 400
        ? theme.palette.warning.main
        : theme.palette.text.primary;

  return (
    <Box
      role="region"
      aria-label="Request details"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        bgcolor: SURFACE[theme.palette.mode].paper,
      }}
    >
      <Stack direction="row" sx={{ alignItems: 'flex-start', gap: 1, px: 1.5, pt: 1.25 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{ fontFamily: FONT_STACK_MONO, fontSize: FONT_SIZE.sm, wordBreak: 'break-all', lineHeight: 1.45 }}
          >
            <Box component="span" sx={{ fontWeight: 700, mr: 1 }}>
              {entry.method}
            </Box>
            {entry.url}
          </Typography>
          <Stack
            direction="row"
            sx={{ alignItems: 'baseline', gap: 1.5, mt: 0.5, flexWrap: 'wrap', fontSize: FONT_SIZE.xs }}
          >
            <Box component="span" sx={{ color: statusColor, fontWeight: 600 }}>
              {inFlight ? 'Waiting for a response' : (status ?? 'No response')}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {formatDuration(ms)}
            </Box>
            <Box component="span" sx={{ color: 'text.secondary' }}>
              {moment(entry.startedAt).format('HH:mm:ss.SSS')}
            </Box>
          </Stack>
          {entry.error && (
            <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'error.main', mt: 0.5 }}>{entry.error}</Typography>
          )}
        </Box>
        <Tooltip title="Copy as cURL">
          <IconButton
            onClick={() => copy(toCurl(entry), 'as cURL')}
            aria-label="Copy as cURL"
            sx={{ width: 40, height: 40 }}
          >
            <Iconify icon="tabler:terminal-2" width={18} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Close details">
          <IconButton onClick={onClose} aria-label="Close details" sx={{ width: 40, height: 40 }}>
            <Iconify icon="tabler:x" width={18} />
          </IconButton>
        </Tooltip>
      </Stack>

      <Tabs
        value={tab}
        onChange={(_e, next) => setTab(next)}
        variant="fullWidth"
        sx={{
          minHeight: 40,
          borderBottom: `1px solid ${theme.palette.divider}`,
          '& .MuiTab-root': { minHeight: 40, fontSize: FONT_SIZE.xs, textTransform: 'none' },
        }}
      >
        <Tab value="response" label="Response" />
        <Tab value="request" label="Request" />
        <Tab value="headers" label="Headers" />
      </Tabs>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {tab === 'response' && (
          <BodyView
            key={`${entry.id}-res-${entry.endedAt ?? 'pending'}`}
            body={entry.responseBody}
            what="response body"
            emptyText={inFlight ? 'The response has not arrived yet.' : 'The response had no body.'}
          />
        )}
        {tab === 'request' && (
          <BodyView
            key={`${entry.id}-req`}
            body={entry.requestBody}
            what="request body"
            emptyText={`This ${entry.method} request had no body.`}
          />
        )}
        {tab === 'headers' && (
          <Box sx={{ pb: 2 }}>
            <HeaderTable title="Request headers" headers={entry.requestHeaders} />
            <HeaderTable title="Response headers" headers={entry.responseHeaders} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
