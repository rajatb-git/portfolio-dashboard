'use client';

import * as React from 'react';

import { Box } from '@mui/material';

import theme from '@/components/ThemeRegistry/theme';

type Props = { data: string };

const LogLine = ({ splitLine }: any) => {
  const [timestamp, level, label, message, rest] = splitLine;

  const timestampStyling = { color: theme.palette.success.main };
  const labelStyling = { color: theme.palette.text.disabled };
  const messageStyling = { color: theme.palette.warning.main };

  let levelStyling: any;
  if (level === 'error') {
    levelStyling = { color: theme.palette.error.main };
  } else if (level === 'warn') {
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
        {message}
      </Box>
      {rest}
    </>
  );
};

export const LogsViewer = ({ data }: Props) => {
  // eslint-disable-next-line no-useless-escape
  const regex = /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d[+-][0-2]\d:[0-5]\d)|(info)|\[(.*?)\]|\((.*?)\)|:(.*)/gi;

  return (
    <Box
      sx={{
        mx: '-22px',
        borderTop: `1px solid ${theme.palette.divider}`,
        borderBottom: `1px solid ${theme.palette.divider}`,
        overflow: 'auto',
        whiteSpace: 'pre',
        fontSize: '12px',
        p: 2,
        pl: 0,
        lineHeight: 1.75,
        maxHeight: '85vh',
        backgroundColor: theme.palette.background.paper,
      }}
    >
      {data
        .trim()
        .split('\n')
        .map((x, i) => (
          <div key={i}>
            <Box
              sx={{
                width: '25px',
                display: 'inline-block',
                textAlign: 'right',
                color: theme.palette.text.disabled,
              }}
            >
              {i + 1}
            </Box>
            <Box sx={{ display: 'inline-block', px: 0.5 }}></Box>
            <Box sx={{ display: 'inline-block' }}>{x && <LogLine splitLine={x.match(regex)} />}</Box>
          </div>
        ))}
    </Box>
  );
};
