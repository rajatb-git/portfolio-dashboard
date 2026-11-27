import Box from '@mui/material/Box';
import * as React from 'react';

import { FONT_STACK_MONO } from '@/components/ThemeRegistry/tokens';

// The model is told to write short paragraphs, "- " lists and **bold**; this
// renders exactly that much and leaves everything else as plain text.

function inline(text: string, keyPrefix: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <Box
          key={key}
          component="code"
          sx={{ fontFamily: FONT_STACK_MONO, fontSize: '0.9em', px: 0.5, borderRadius: 0.5, bgcolor: 'action.hover' }}
        >
          {part.slice(1, -1)}
        </Box>
      );
    }
    return part;
  });
}

const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

export default function ChatText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <Box sx={{ '& > *': { m: 0 }, '& ul, & ol': { pl: 2.5 }, '& > * + *': { mt: 1 }, '& li + li': { mt: 0.25 } }}>
      {blocks.map((block, b) => {
        const lines = block.split('\n');
        const key = `b${b}`;
        if (lines.every((line) => LIST_ITEM.test(line))) {
          const ordered = /^\s*\d/.test(lines[0]);
          const Tag = ordered ? 'ol' : 'ul';
          return (
            <Tag key={key}>
              {lines.map((line, l) => (
                <li key={`${key}-${l}`}>{inline(line.replace(LIST_ITEM, ''), `${key}-${l}`)}</li>
              ))}
            </Tag>
          );
        }
        return (
          <p key={key}>
            {lines.map((line, l) => (
              <span key={`${key}-${l}`}>
                {l > 0 && <br />}
                {inline(line.replace(/^#+\s+/, ''), `${key}-${l}`)}
              </span>
            ))}
          </p>
        );
      })}
    </Box>
  );
}
