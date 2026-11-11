'use client';

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import * as React from 'react';

const LogLine = ({ splitLine }: any) => {
  const theme = useTheme();
  const [, timestamp, level, label, message, rest] = splitLine;

  const timestampStyling = { color: theme.palette.success.main };
  const labelStyling = { color: theme.palette.text.secondary };
  const messageStyling = { color: theme.palette.warning.main };

  let levelStyling: any;
  if (level.toLowerCase() === 'error') {
    levelStyling = { color: theme.palette.error.main };
  } else if (level.toLowerCase() === 'warn') {
    levelStyling = { color: theme.palette.warning.main };
  } else {
    levelStyling = { color: theme.palette.info.main };
  }

  return (
    <>
      <Box component="span" sx={timestampStyling}>
        {timestamp}
        {'  '}
      </Box>
      <Box component="span" sx={levelStyling}>
        {level}
        {'  '}
      </Box>
      <Box component="span" sx={labelStyling}>
        {label}
        {'  '}
      </Box>
      <Box component="span" sx={messageStyling}>
        ({message})
      </Box>
      : {rest}
    </>
  );
};

export type LogLevelFilter = 'all' | 'error' | 'warn' | 'info';

type ViewerProps = { data: string; level: LogLevelFilter; query: string };

// Mirrors the backend winston format: `<timestamp> <LEVEL> [<label>] (<message>): <meta>`.
const LINE_RE = /^(\S+)\s+(\w+)\s+\[(.*?)\]\s+\((.*)\):\s?(.*)$/;

export const LogsViewer = ({ data, level, query }: ViewerProps) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  const needle = query.trim().toLowerCase();
  const lines = data
    .trim()
    .split('\n')
    .map((text, i) => ({ text, number: i + 1, parts: text ? text.match(LINE_RE) : null }))
    .filter(({ text, parts }) => {
      if (level !== 'all' && parts?.[2]?.toLowerCase() !== level) return false;
      return !needle || text.toLowerCase().includes(needle);
    });

  return (
    <Box
      sx={{
        mx: { xs: -1.5, sm: -2, lg: -3 },
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: 'auto',
        fontSize: { xs: '0.75rem', sm: '0.85rem' },
        p: 2,
        pl: 0,
        lineHeight: 1.6,
        maxHeight: '85vh',
        backgroundColor: isLight ? theme.palette.grey[100] : theme.palette.grey[900],
      }}
    >
      {lines.length === 0 ? (
        <Box sx={{ pl: 2, color: theme.palette.text.secondary }}>
          {data.trim() ? 'No lines match these filters.' : 'This log is empty.'}
        </Box>
      ) : (
        lines.map(({ text, number, parts }) => (
          <Box key={number} sx={{ display: 'flex', gap: 1, py: 0.25 }}>
            <Box
              sx={{
                flexShrink: 0,
                minWidth: 36,
                pl: 1,
                textAlign: 'right',
                color: theme.palette.text.disabled,
                userSelect: 'none',
              }}
            >
              {number}
            </Box>
            <Box sx={{ minWidth: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
              {parts ? <LogLine splitLine={parts} /> : text}
            </Box>
          </Box>
        ))
      )}
    </Box>
  );
};
