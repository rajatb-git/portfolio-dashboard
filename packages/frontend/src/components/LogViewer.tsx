'use client';

import * as React from 'react';

import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';

type Props = { data: string };

const LogLine = ({ splitLine }: any) => {
  const theme = useTheme();
  const [, timestamp, level, label, message, rest] = splitLine;

  const timestampStyling = { color: theme.palette.success.main };
  const labelStyling = { color: theme.palette.text.disabled };
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

export const LogsViewer = ({ data }: Props) => {
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  // Mirrors the backend winston format: `<timestamp> <LEVEL> [<label>] (<message>): <meta>`.
  const regex = /^(\S+)\s+(\w+)\s+\[(.*?)\]\s+\((.*)\):\s?(.*)$/;

  return (
    <Box
      sx={{
        mx: { xs: -1.5, sm: -2, lg: -3 },
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: 'auto',
        whiteSpace: 'pre',
        fontSize: '0.9rem',
        p: 2,
        pl: 0,
        lineHeight: 1.75,
        maxHeight: '85vh',
        backgroundColor: isLight ? theme.palette.grey[100] : theme.palette.grey[900],
      }}
    >
      {data
        .trim()
        .split('\n')
        .map((x, i) => {
          const parts = x ? x.match(regex) : null;
          return (
            <div key={i}>
              <Box
                sx={{
                  minWidth: '25px',
                  pl: 1,
                  display: 'inline-block',
                  textAlign: 'right',
                  color: theme.palette.text.disabled,
                }}
              >
                {i + 1}
              </Box>
              <Box sx={{ display: 'inline-block', px: 0.5 }}></Box>
              <Box sx={{ display: 'inline-block' }}>{parts ? <LogLine splitLine={parts} /> : x}</Box>
            </div>
          );
        })}
    </Box>
  );
};
