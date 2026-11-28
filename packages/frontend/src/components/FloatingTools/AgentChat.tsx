import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import Collapse from '@mui/material/Collapse';
import Dialog from '@mui/material/Dialog';
import Grow from '@mui/material/Grow';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import api from '@/api';
import type { AgentStatus, AgentToolCall } from '@/api/agent';
import { Iconify } from '@/components/Iconify';
import { BRAND, DATA_ACCENT, FONT_SIZE, FONT_STACK_MONO, RADIUS, SHADOW } from '@/components/ThemeRegistry/tokens';
import StateView from '@/components/ui/StateView';

import ChatText from './ChatText';
import { isLocalHost } from './format';
import type { AgentConversation } from './useAgentConversation';

type ChatItem =
  | { kind: 'user'; text: string; key: string }
  | { kind: 'assistant'; text: string; key: string }
  | { kind: 'tool'; call: AgentToolCall; result?: string; key: string };

function buildItems(conversation: AgentConversation): ChatItem[] {
  const items: ChatItem[] = [];
  let awaiting: Extract<ChatItem, { kind: 'tool' }>[] = [];
  conversation.messages.forEach((message, i) => {
    if (message.role === 'user') {
      items.push({ kind: 'user', text: message.content, key: `u${i}` });
    } else if (message.role === 'assistant') {
      if (message.content.trim()) items.push({ kind: 'assistant', text: message.content, key: `a${i}` });
      awaiting = (message.tool_calls ?? []).map((call, c) => ({ kind: 'tool', call, key: `t${i}-${c}` }));
      items.push(...awaiting);
    } else {
      const item = awaiting.shift();
      if (item) item.result = message.content;
    }
  });
  return items;
}

function argText(call: AgentToolCall, name: string): string {
  const value = call.function.arguments?.[name];
  return typeof value === 'string' ? value : '';
}

function describeCall(call: AgentToolCall): { icon: string; label: string } {
  switch (call.function.name) {
    case 'call_api':
      return {
        icon: 'tabler:plug-connected',
        label: `${(argText(call, 'method') || 'GET').toUpperCase()} ${argText(call, 'path')}`,
      };
    case 'web_search':
      return { icon: 'tabler:world-search', label: `Search “${argText(call, 'query')}”` };
    case 'fetch_url':
      return { icon: 'tabler:world-download', label: argText(call, 'url').replace(/^https?:\/\//, '') };
    default:
      return { icon: 'tabler:tool', label: call.function.name };
  }
}

function resultTone(result: string | undefined): { label: string; tone: 'ok' | 'warn' | 'bad' | 'muted' } | null {
  if (result === undefined) return null;
  const http = /^HTTP (\d{3})/.exec(result);
  if (http) {
    const code = Number(http[1]);
    return { label: http[1], tone: code >= 500 ? 'bad' : code >= 400 ? 'warn' : 'ok' };
  }
  if (result.startsWith('Error')) return { label: 'Failed', tone: 'bad' };
  if (result.startsWith('The user declined')) return { label: 'Denied', tone: 'muted' };
  if (result.startsWith('Skipped')) return { label: 'Skipped', tone: 'muted' };
  return { label: 'Done', tone: 'ok' };
}

function PendingDot() {
  const theme = useTheme();
  const accent = DATA_ACCENT[theme.palette.mode].main;
  return (
    <Box
      aria-hidden
      sx={{
        width: 7,
        height: 7,
        borderRadius: '50%',
        bgcolor: accent,
        flexShrink: 0,
        '@keyframes pd-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
        animation: 'pd-pulse 1.1s ease-in-out infinite',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );
}

function ToolStep({
  item,
  waiting,
  active,
}: {
  item: Extract<ChatItem, { kind: 'tool' }>;
  waiting: boolean;
  active: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const { icon, label } = describeCall(item.call);
  const tone = resultTone(item.result);
  const toneColor = {
    ok: theme.palette.text.secondary,
    warn: theme.palette.warning.main,
    bad: theme.palette.error.main,
    muted: theme.palette.text.disabled,
  };

  return (
    <Box sx={{ ml: 0.5, borderLeft: `2px solid ${theme.palette.divider}`, pl: 1.25 }}>
      <ButtonBase
        onClick={() => setOpen((v) => !v)}
        disabled={item.result === undefined}
        aria-expanded={open}
        sx={{
          width: '100%',
          justifyContent: 'flex-start',
          gap: 1,
          py: 0.5,
          minHeight: 32,
          borderRadius: `${RADIUS.sm}px`,
          color: 'text.secondary',
          textAlign: 'left',
        }}
      >
        <Iconify icon={icon} width={15} sx={{ color: 'text.disabled' }} />
        <Typography
          component="span"
          sx={{
            flex: 1,
            minWidth: 0,
            fontFamily: FONT_STACK_MONO,
            fontSize: FONT_SIZE.xs,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </Typography>
        {tone ? (
          <Typography component="span" sx={{ fontSize: FONT_SIZE.micro, fontWeight: 600, color: toneColor[tone.tone] }}>
            {tone.label}
          </Typography>
        ) : waiting ? (
          <Typography
            component="span"
            sx={{ fontSize: FONT_SIZE.micro, fontWeight: 600, color: DATA_ACCENT[theme.palette.mode].main }}
          >
            Needs approval
          </Typography>
        ) : (
          active && <PendingDot />
        )}
        {item.result !== undefined && (
          <Iconify
            icon={open ? 'tabler:chevron-up' : 'tabler:chevron-down'}
            width={14}
            sx={{ color: 'text.disabled' }}
          />
        )}
      </ButtonBase>
      <Collapse in={open} unmountOnExit>
        <Box
          component="pre"
          sx={{
            m: 0,
            mb: 1,
            p: 1,
            maxHeight: 220,
            overflow: 'auto',
            fontFamily: FONT_STACK_MONO,
            fontSize: FONT_SIZE.micro,
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            bgcolor: 'action.hover',
            borderRadius: `${RADIUS.sm}px`,
          }}
        >
          {item.result}
        </Box>
      </Collapse>
    </Box>
  );
}

function ApprovalCard({ call, onRespond }: { call: AgentToolCall; onRespond: (approve: boolean) => void }) {
  const theme = useTheme();
  const accent = DATA_ACCENT[theme.palette.mode];
  const body = call.function.arguments?.body;
  return (
    <Box
      role="alertdialog"
      aria-label="Approve a change"
      sx={{ border: `1px solid ${accent.border}`, bgcolor: accent.bg, borderRadius: `${RADIUS.lg}px`, p: 1.5 }}
    >
      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, mb: 1 }}>
        <Iconify icon="tabler:shield-half-filled" width={18} sx={{ color: accent.main }} />
        <Typography sx={{ fontWeight: 600, fontSize: FONT_SIZE.md }}>Allow this change to your data?</Typography>
      </Stack>
      <Typography sx={{ fontFamily: FONT_STACK_MONO, fontSize: FONT_SIZE.xs, wordBreak: 'break-all' }}>
        {describeCall(call).label}
      </Typography>
      {body !== undefined && (
        <Box
          component="pre"
          sx={{
            m: 0,
            mt: 1,
            p: 1,
            maxHeight: 160,
            overflow: 'auto',
            fontFamily: FONT_STACK_MONO,
            fontSize: FONT_SIZE.micro,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            bgcolor: 'background.paper',
            borderRadius: `${RADIUS.sm}px`,
          }}
        >
          {JSON.stringify(body, null, 2)}
        </Box>
      )}
      <Stack direction="row" sx={{ justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
        <Button size="small" color="inherit" onClick={() => onRespond(false)}>
          Deny
        </Button>
        <Button size="small" variant="contained" onClick={() => onRespond(true)}>
          Allow
        </Button>
      </Stack>
    </Box>
  );
}

const SUGGESTIONS = [
  'Which of my holdings moved most today?',
  'How concentrated is my portfolio by sector?',
  'Summarize recent news for my five largest positions',
  'What have I realized in gains this year?',
];

function Disclosure({ status }: { status: AgentStatus }) {
  const theme = useTheme();
  const local = isLocalHost(status.host);
  const accent = DATA_ACCENT[theme.palette.mode];
  return (
    <Stack
      direction="row"
      role="note"
      sx={{
        gap: 1,
        px: 2,
        py: 1,
        alignItems: 'flex-start',
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: local ? alpha(theme.palette.primary.main, 0.07) : accent.bg,
      }}
    >
      <Iconify
        icon={local ? 'tabler:lock' : 'tabler:alert-triangle'}
        width={15}
        sx={{ mt: '2px', color: local ? 'primary.main' : accent.main }}
      />
      <Typography sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary', lineHeight: 1.45 }}>
        {local
          ? 'Has full access to your holdings, accounts and transactions, and can browse the web. It runs on your own Ollama model, so your data stays on your network.'
          : `Has full access to your holdings, accounts and transactions, and can browse the web. Your Ollama server at ${status.host} is not on your network, so your data is sent there.`}
      </Typography>
    </Stack>
  );
}

type ChatPanelProps = {
  conversation: AgentConversation;
  onClose: () => void;
  fullScreen: boolean;
};

function ChatPanel({ conversation, onClose, fullScreen }: ChatPanelProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [status, setStatus] = React.useState<AgentStatus | null>(null);
  const [statusError, setStatusError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const coarse = React.useMemo(() => window.matchMedia('(pointer: coarse)').matches, []);

  const loadStatus = React.useCallback(() => {
    setStatusError(null);
    setStatus(null);
    api.agent
      .getStatus()
      .then(setStatus)
      .catch((err) => {
        setStatusError(err.message || 'Failed to load the agent settings');
        toast.error(err.message || 'Failed to load the agent settings');
      });
  }, []);

  React.useEffect(loadStatus, [loadStatus]);

  const items = buildItems(conversation);
  const { running, pending, error, notice } = conversation;
  const lastItem = items[items.length - 1];
  const toolRunning = running && lastItem?.kind === 'tool' && lastItem.result === undefined;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight });
  }, [items.length, running, pending, error, notice]);

  React.useEffect(() => {
    if (status?.available && !coarse) inputRef.current?.focus();
  }, [status, coarse]);

  const submit = (text = draft) => {
    if (!text.trim() || running) return;
    conversation.send(text);
    setDraft('');
  };

  const waitingKey = pending ? items.find((i) => i.kind === 'tool' && i.result === undefined)?.key : undefined;

  let body: React.ReactNode;
  if (statusError) {
    body = (
      <StateView
        state="error"
        title="Couldn't load the agent"
        message={statusError}
        action={{ label: 'Try again', onClick: loadStatus }}
        minHeight={260}
      />
    );
  } else if (!status) {
    body = (
      <Stack sx={{ gap: 1.5, p: 2 }}>
        <Skeleton variant="rounded" height={44} />
        <Skeleton variant="text" width="70%" />
        <Skeleton variant="text" width="45%" />
      </Stack>
    );
  } else if (!status.available) {
    body = (
      <StateView
        state="not-configured"
        title="The agent needs a local model"
        message="It reads all of your portfolio data, so it only runs on Ollama, which keeps that data on your own machine. Turn on the AI agent in Settings and choose Ollama."
        action={{
          label: 'Open AI settings',
          onClick: () => {
            onClose();
            navigate('/settings?tab=ai');
          },
        }}
        minHeight={300}
      />
    );
  } else if (items.length === 0) {
    body = (
      <Box sx={{ px: 2, pt: 3, pb: 2 }}>
        <Typography sx={{ fontSize: FONT_SIZE.lg, fontWeight: 600, mb: 0.5 }}>Ask about your portfolio</Typography>
        <Typography sx={{ fontSize: FONT_SIZE.sm, color: 'text.secondary', mb: 2, maxWidth: 340 }}>
          It looks things up in the app and on the web before it answers. Changes to your data wait for your approval.
        </Typography>
        <Stack sx={{ gap: 1, alignItems: 'flex-start' }}>
          {SUGGESTIONS.map((text) => (
            <Button
              key={text}
              variant="outlined"
              color="inherit"
              size="small"
              onClick={() => submit(text)}
              sx={{
                textAlign: 'left',
                justifyContent: 'flex-start',
                fontWeight: 500,
                color: 'text.secondary',
                borderColor: 'divider',
                borderRadius: `${RADIUS.lg}px`,
                minHeight: 36,
              }}
            >
              {text}
            </Button>
          ))}
        </Stack>
      </Box>
    );
  } else {
    body = (
      <Stack sx={{ gap: 1.25, px: 2, py: 2 }} aria-live="polite">
        {items.map((item) => {
          if (item.kind === 'user') {
            return (
              <Box
                key={item.key}
                sx={{
                  alignSelf: 'flex-end',
                  maxWidth: '85%',
                  px: 1.5,
                  py: 1,
                  borderRadius: `${RADIUS.lg}px ${RADIUS.lg}px ${RADIUS.xs}px ${RADIUS.lg}px`,
                  bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.22 : 0.12),
                  fontSize: FONT_SIZE.md,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {item.text}
              </Box>
            );
          }
          if (item.kind === 'assistant') {
            return (
              <Box key={item.key} sx={{ fontSize: FONT_SIZE.md, lineHeight: 1.55, wordBreak: 'break-word' }}>
                <ChatText text={item.text} />
              </Box>
            );
          }
          return <ToolStep key={item.key} item={item} waiting={item.key === waitingKey} active={running} />;
        })}

        {running && !toolRunning && (
          <Stack sx={{ gap: 0.5 }} aria-label="The agent is thinking">
            <Skeleton variant="text" width="72%" />
            <Skeleton variant="text" width="48%" />
          </Stack>
        )}

        {pending && !running && <ApprovalCard call={pending} onRespond={conversation.respond} />}

        {notice && (
          <Stack
            direction="row"
            role="status"
            sx={{ gap: 1, alignItems: 'flex-start', color: DATA_ACCENT[theme.palette.mode].main }}
          >
            <Iconify icon="tabler:alert-triangle" width={16} sx={{ mt: '2px', flexShrink: 0 }} />
            <Typography sx={{ fontSize: FONT_SIZE.sm }}>{notice}</Typography>
          </Stack>
        )}

        {error && !running && (
          <Stack direction="row" sx={{ gap: 1, alignItems: 'flex-start', color: 'error.main' }}>
            <Iconify icon="tabler:alert-circle" width={16} sx={{ mt: '2px' }} />
            <Typography sx={{ fontSize: FONT_SIZE.sm }}>{error}</Typography>
          </Stack>
        )}
      </Stack>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          gap: 1.25,
          pl: 2,
          pr: 1,
          minHeight: 56,
          pt: fullScreen ? 'env(safe-area-inset-top)' : 0,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: `${RADIUS.md}px`,
            background: BRAND.gradient,
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
        >
          <Iconify icon="tabler:message-chatbot" width={18} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography id="agent-chat-title" sx={{ fontWeight: 600, fontSize: FONT_SIZE.md, lineHeight: 1.2 }}>
            Portfolio agent
          </Typography>
          {status?.available && (
            <Typography noWrap sx={{ fontSize: FONT_SIZE.xs, color: 'text.secondary' }}>
              {status.model} on Ollama
            </Typography>
          )}
        </Box>
        <Tooltip title="New conversation">
          <span>
            <IconButton
              onClick={conversation.reset}
              disabled={conversation.messages.length === 0}
              aria-label="New conversation"
              sx={{ width: 40, height: 40 }}
            >
              <Iconify icon="tabler:message-plus" width={19} />
            </IconButton>
          </span>
        </Tooltip>
        <IconButton onClick={onClose} aria-label="Close agent" sx={{ width: 40, height: 40 }}>
          <Iconify icon={fullScreen ? 'tabler:chevron-down' : 'tabler:x'} width={20} />
        </IconButton>
      </Stack>

      {status?.available && <Disclosure status={status} />}

      <Box ref={scrollRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {body}
      </Box>

      {status?.available && (
        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          sx={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: 1,
            px: 1.5,
            pt: 1,
            pb: fullScreen ? 'calc(8px + env(safe-area-inset-bottom))' : 1,
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <TextField
            inputRef={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !coarse && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={pending ? 'Reply, or ask something else' : 'Ask the agent'}
            multiline
            maxRows={5}
            fullWidth
            size="small"
            slotProps={{ htmlInput: { 'aria-label': 'Message the agent' } }}
            sx={{
              '& .MuiInputBase-root': { borderRadius: `${RADIUS.lg}px`, fontSize: { xs: '16px', sm: FONT_SIZE.md } },
            }}
          />
          {running ? (
            <IconButton
              onClick={conversation.stop}
              aria-label="Stop"
              sx={{ width: 40, height: 40, border: `1px solid ${theme.palette.divider}` }}
            >
              <Iconify icon="tabler:player-stop-filled" width={16} />
            </IconButton>
          ) : (
            <IconButton
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send"
              sx={{
                width: 40,
                height: 40,
                color: '#fff',
                background: BRAND.gradient,
                '&.Mui-disabled': {
                  background: theme.palette.action.disabledBackground,
                  color: theme.palette.action.disabled,
                },
              }}
            >
              <Iconify icon="tabler:arrow-up" width={19} />
            </IconButton>
          )}
        </Box>
      )}
    </Box>
  );
}

type AgentChatProps = {
  open: boolean;
  onClose: () => void;
  fullScreen: boolean;
  conversation: AgentConversation;
};

export default function AgentChat({ open, onClose, fullScreen, conversation }: AgentChatProps) {
  const theme = useTheme();

  if (fullScreen) {
    return (
      <Dialog fullScreen open={open} onClose={onClose} aria-labelledby="agent-chat-title">
        {open && <ChatPanel conversation={conversation} onClose={onClose} fullScreen />}
      </Dialog>
    );
  }

  return (
    <Grow in={open} style={{ transformOrigin: 'bottom right' }} unmountOnExit>
      <Paper
        role="dialog"
        aria-labelledby="agent-chat-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
        sx={{
          position: 'fixed',
          right: 20,
          bottom: 92,
          zIndex: theme.zIndex.appBar + 10,
          width: 'min(410px, calc(100% - 40px))',
          height: 'min(640px, calc(100% - 160px))',
          borderRadius: `${RADIUS.xl}px`,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: SHADOW[theme.palette.mode].lg,
          overflow: 'hidden',
        }}
      >
        <ChatPanel conversation={conversation} onClose={onClose} fullScreen={false} />
      </Paper>
    </Grow>
  );
}
