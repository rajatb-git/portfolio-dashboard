import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import SpeedDial from '@mui/material/SpeedDial';
import SpeedDialAction from '@mui/material/SpeedDialAction';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import * as React from 'react';

import { Iconify } from '@/components/Iconify';
import { BRAND, DATA_ACCENT, MOTION, SHADOW } from '@/components/ThemeRegistry/tokens';

import AgentChat from './AgentChat';
import RequestMonitor from './RequestMonitor';
import { useAgentConversation } from './useAgentConversation';

const MONITOR_OPEN_KEY = 'debug_monitor_open';
const SPLIT_KEY = 'debug_monitor_split';
const NARROW_PANE_PX = 900;
const MIN_SPLIT = 0.25;
const MAX_SPLIT = 0.8;

const AppPaneContext = React.createContext(false);

/** True when the app shares the screen with the monitor and its pane is too narrow for the permanent sidebar. */
export const useAppPaneNarrow = () => React.useContext(AppPaneContext);

const readStored = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Remembering layout is a convenience; private mode can refuse it.
  }
};

function SplitHandle({
  vertical,
  split,
  onChange,
  containerRef,
}: {
  vertical: boolean;
  split: number;
  onChange: (split: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}) {
  const theme = useTheme();
  const [dragging, setDragging] = React.useState(false);
  const clamp = (v: number) => Math.min(MAX_SPLIT, Math.max(MIN_SPLIT, v));

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    onChange(clamp(vertical ? (e.clientY - rect.top) / rect.height : (e.clientX - rect.left) / rect.width));
  };

  return (
    <Box
      role="separator"
      tabIndex={0}
      aria-orientation={vertical ? 'horizontal' : 'vertical'}
      aria-label="Resize the app and the request monitor"
      aria-valuenow={Math.round(split * 100)}
      aria-valuemin={MIN_SPLIT * 100}
      aria-valuemax={MAX_SPLIT * 100}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(false)}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        const back = vertical ? 'ArrowUp' : 'ArrowLeft';
        const forward = vertical ? 'ArrowDown' : 'ArrowRight';
        if (e.key === back || e.key === forward) {
          e.preventDefault();
          onChange(clamp(split + (e.key === forward ? 0.05 : -0.05)));
        }
      }}
      sx={{
        flex: '0 0 auto',
        position: 'relative',
        zIndex: 2,
        display: 'grid',
        placeItems: 'center',
        touchAction: 'none',
        userSelect: 'none',
        bgcolor: 'background.default',
        cursor: vertical ? 'row-resize' : 'col-resize',
        ...(vertical
          ? {
              height: 18,
              borderTop: `1px solid ${theme.palette.divider}`,
              borderBottom: `1px solid ${theme.palette.divider}`,
            }
          : {
              width: 9,
              borderLeft: `1px solid ${theme.palette.divider}`,
              borderRight: `1px solid ${theme.palette.divider}`,
            }),
        '&:focus-visible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: -2 },
        '&::after': {
          content: '""',
          borderRadius: 4,
          bgcolor: dragging ? 'primary.main' : 'text.disabled',
          opacity: dragging ? 1 : 0.5,
          transition: `background-color ${MOTION.fast}, opacity ${MOTION.fast}`,
          ...(vertical ? { width: 36, height: 4 } : { width: 3, height: 36 }),
        },
        '&:hover::after': { opacity: 1 },
      }}
    />
  );
}

function ToolsDial({
  monitorOpen,
  onToggleMonitor,
  onOpenChat,
  attention,
}: {
  monitorOpen: boolean;
  onToggleMonitor: () => void;
  onOpenChat: () => void;
  attention: boolean;
}) {
  const theme = useTheme();
  const [open, setOpen] = React.useState(false);
  const mode = theme.palette.mode;

  const actions = [
    { key: 'chat', icon: 'tabler:message-chatbot', label: 'Ask the agent', onClick: onOpenChat },
    {
      key: 'monitor',
      icon: monitorOpen ? 'tabler:layout-sidebar-right-collapse' : 'tabler:activity',
      label: monitorOpen ? 'Close request monitor' : 'Open request monitor',
      onClick: onToggleMonitor,
    },
  ];

  return (
    <SpeedDial
      ariaLabel="Agent and request monitor"
      open={open}
      onOpen={(_e, reason) => {
        // Hover-open would fire on every pass of the mouse to the corner.
        if (reason !== 'mouseEnter') setOpen(true);
      }}
      onClose={(_e, reason) => {
        if (reason !== 'mouseLeave') setOpen(false);
      }}
      icon={
        <Badge
          variant="dot"
          invisible={!attention || open}
          overlap="circular"
          sx={{ '& .MuiBadge-dot': { bgcolor: DATA_ACCENT[mode].main, width: 10, height: 10, borderRadius: 5 } }}
        >
          <Iconify
            icon={open ? 'tabler:x' : 'tabler:sparkles'}
            width={24}
            sx={{
              transition: `transform ${MOTION.normal} ${MOTION.easeOut}`,
              transform: open ? 'rotate(90deg)' : 'none',
            }}
          />
        </Badge>
      }
      FabProps={{
        sx: {
          background: BRAND.gradient,
          color: '#fff',
          boxShadow: `${SHADOW[mode].md}, ${BRAND.glow}`,
          '&:hover': { background: BRAND.gradient, filter: 'brightness(1.08)' },
        },
      }}
      sx={{
        position: 'fixed',
        right: { xs: 16, sm: 24 },
        bottom: { xs: 'calc(16px + env(safe-area-inset-bottom))', sm: 24 },
        zIndex: theme.zIndex.appBar + 5,
        '& .MuiSpeedDialAction-staticTooltipLabel': {
          whiteSpace: 'nowrap',
          fontSize: '0.8125rem',
          fontWeight: 500,
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: SHADOW[mode].sm,
        },
      }}
    >
      {actions.map((action) => (
        <SpeedDialAction
          key={action.key}
          icon={<Iconify icon={action.icon} width={20} />}
          onClick={() => {
            setOpen(false);
            action.onClick();
          }}
          slotProps={{
            tooltip: { title: action.label, open: true },
            fab: { 'aria-label': action.label, sx: { bgcolor: 'background.paper', color: 'text.primary' } },
          }}
        />
      ))}
    </SpeedDial>
  );
}

/**
 * Wraps the app shell. With the monitor closed it adds nothing to the layout;
 * with it open the app moves into its own pane. The pane carries a transform,
 * which makes it the containing block for the shell's fixed top bar and
 * sidebar, so they stay inside their half without knowing about the split.
 */
export default function FloatingTools({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const phone = useMediaQuery(theme.breakpoints.down('sm'));
  const stacked = useMediaQuery(theme.breakpoints.down('md'));
  const [monitorOpen, setMonitorOpen] = React.useState(() => readStored(MONITOR_OPEN_KEY) === 'true');
  const [split, setSplit] = React.useState(() => {
    const stored = Number(readStored(SPLIT_KEY));
    return stored >= MIN_SPLIT && stored <= MAX_SPLIT ? stored : stacked ? 0.55 : 0.6;
  });
  const [chatOpen, setChatOpen] = React.useState(false);
  const [narrow, setNarrow] = React.useState(false);
  const conversation = useAgentConversation();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const paneRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const pane = paneRef.current;
    if (!monitorOpen || !pane) {
      setNarrow(false);
      return;
    }
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW_PANE_PX));
    observer.observe(pane);
    return () => observer.disconnect();
  }, [monitorOpen]);

  const toggleMonitor = () => {
    setMonitorOpen((prev) => {
      writeStored(MONITOR_OPEN_KEY, String(!prev));
      return !prev;
    });
  };

  const changeSplit = (next: number) => {
    setSplit(next);
    writeStored(SPLIT_KEY, String(next));
  };

  const appBasis = `${(split * 100).toFixed(2)}%`;

  return (
    <AppPaneContext.Provider value={narrow}>
      <Box
        ref={containerRef}
        sx={
          monitorOpen
            ? {
                position: 'fixed',
                inset: 0,
                height: '100dvh',
                display: 'flex',
                flexDirection: stacked ? 'column' : 'row',
                bgcolor: 'background.default',
              }
            : undefined
        }
      >
        <Box
          ref={paneRef}
          sx={
            monitorOpen
              ? {
                  flex: `0 0 ${appBasis}`,
                  minWidth: 0,
                  minHeight: 0,
                  position: 'relative',
                  overflow: 'auto',
                  transform: 'translateZ(0)',
                  overscrollBehavior: 'contain',
                }
              : undefined
          }
        >
          {children}
          <ToolsDial
            monitorOpen={monitorOpen}
            onToggleMonitor={toggleMonitor}
            onOpenChat={() => setChatOpen(true)}
            attention={!chatOpen && (conversation.pending !== null || conversation.running)}
          />
          <AgentChat
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            fullScreen={phone}
            conversation={conversation}
          />
        </Box>

        {monitorOpen && (
          <>
            <SplitHandle vertical={stacked} split={split} onChange={changeSplit} containerRef={containerRef} />
            <Box
              sx={{
                flex: '1 1 0',
                minWidth: 0,
                minHeight: 0,
                pb: stacked ? 'env(safe-area-inset-bottom)' : 0,
                bgcolor: 'background.default',
              }}
            >
              <RequestMonitor onClose={toggleMonitor} />
            </Box>
          </>
        )}
      </Box>
    </AppPaneContext.Provider>
  );
}
