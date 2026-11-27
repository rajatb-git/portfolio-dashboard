import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Stack, Tab, Tabs, Typography } from '@mui/material';
import moment from 'moment';
import * as React from 'react';

import { Iconify } from '@/components/Iconify';
import type { IAiRequestLog } from '@/models/AiRequestLogModel';

type Section = 'thinking' | 'response' | 'userPrompt' | 'systemPrompt' | 'details';

function prettyJson(text: string): string {
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}

function formatMs(ms?: number): string {
  if (ms === undefined) return '—';
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function TextBlock({ text, empty }: { text: string; empty: string }) {
  return (
    <Box
      component="pre"
      sx={{
        m: 0,
        p: 1.5,
        maxHeight: 480,
        overflow: 'auto',
        borderRadius: 1,
        bgcolor: 'action.hover',
        color: text ? 'text.primary' : 'text.secondary',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}
    >
      {text || empty}
    </Box>
  );
}

function Entry({ entry }: { entry: IAiRequestLog }) {
  const [section, setSection] = React.useState<Section>(entry.thinking ? 'thinking' : 'response');
  const tokensPerSec =
    entry.responseTokens && entry.evalMs ? Math.round((entry.responseTokens / entry.evalMs) * 1000) : undefined;

  const details = [
    ['Host', entry.host],
    ['Options', entry.options],
    ['Total time', formatMs(entry.durationMs)],
    ['Model load', formatMs(entry.loadMs)],
    ['Prompt eval', `${formatMs(entry.promptEvalMs)} · ${entry.promptTokens ?? '—'} tokens`],
    ['Generation', `${formatMs(entry.evalMs)} · ${entry.responseTokens ?? '—'} tokens`],
    ['Speed', tokensPerSec ? `${tokensPerSec} tokens/s` : '—'],
  ];

  return (
    <Accordion disableGutters slotProps={{ transition: { unmountOnExit: true } }}>
      <AccordionSummary expandIcon={<Iconify icon="tabler:chevron-down" width={16} />}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 0.5, width: '100%' }}
        >
          <Chip
            size="small"
            label={entry.status}
            color={entry.status === 'success' ? 'success' : 'error'}
            variant="outlined"
          />
          <Typography sx={{ fontSize: '0.82rem', fontWeight: 600 }}>{entry.feature}</Typography>
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>{entry.model}</Typography>
          {entry.thinking && (
            <Chip size="small" label="thinking" icon={<Iconify icon="tabler:brain" width={14} />} variant="outlined" />
          )}
          <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', ml: { sm: 'auto' } }}>
            {formatMs(entry.durationMs)}
            {entry.responseTokens !== undefined && ` · ${entry.responseTokens} tok`}
            {' · '}
            {moment(entry.createdAt).format('MMM D, HH:mm:ss')}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {entry.error && <Typography sx={{ fontSize: '0.78rem', color: 'error.main', mb: 1 }}>{entry.error}</Typography>}
        <Tabs
          value={section}
          onChange={(_, v) => setSection(v)}
          variant="scrollable"
          allowScrollButtonsMobile
          sx={{ mb: 1, minHeight: 36, '& .MuiTab-root': { minHeight: 36, textTransform: 'none' } }}
        >
          <Tab value="thinking" label="Thinking" />
          <Tab value="response" label="Response" />
          <Tab value="userPrompt" label="Request" />
          <Tab value="systemPrompt" label="System prompt" />
          <Tab value="details" label="Timing" />
        </Tabs>
        {section === 'thinking' && (
          <TextBlock
            text={entry.thinking}
            empty="No thinking returned. Turn on “Capture thinking” in Settings → AI Agent and use a reasoning model (qwen3, deepseek-r1, gpt-oss…)."
          />
        )}
        {section === 'response' && <TextBlock text={prettyJson(entry.response)} empty="No response body." />}
        {section === 'userPrompt' && <TextBlock text={entry.userPrompt} empty="Empty." />}
        {section === 'systemPrompt' && <TextBlock text={entry.systemPrompt} empty="Empty." />}
        {section === 'details' && (
          <Stack spacing={0.5}>
            {details.map(([label, value]) => (
              <Stack key={label} direction="row" spacing={2}>
                <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', minWidth: 96 }}>{label}</Typography>
                <Typography sx={{ fontSize: '0.78rem', fontFamily: 'monospace', wordBreak: 'break-all' }}>
                  {value}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export function AiRequestLogViewer({ entries, query }: { entries: IAiRequestLog[]; query: string }) {
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? entries.filter((e) =>
        [e.feature, e.model, e.status, e.error, e.userPrompt, e.response, e.thinking].some((f) =>
          f?.toLowerCase().includes(needle)
        )
      )
    : entries;

  if (!filtered.length) {
    return (
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', py: 4, textAlign: 'center' }}>
        {entries.length ? 'No AI requests match the filter.' : 'No AI requests logged yet. Ollama calls appear here.'}
      </Typography>
    );
  }

  return (
    <Box>
      {filtered.map((entry) => (
        <Entry key={entry.id} entry={entry} />
      ))}
    </Box>
  );
}
