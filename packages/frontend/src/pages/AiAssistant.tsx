import * as React from 'react';
import {
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import apis from '@/api';
import { Iconify } from '@/components/Iconify';

type Message = { role: 'user' | 'assistant'; content: string };

export default function AiAssistant() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [aiEnabled, setAiEnabled] = React.useState<boolean | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    apis.live
      .getAiConfig()
      .then((cfg) => setAiEnabled(cfg.enabled))
      .catch(() => setAiEnabled(false));
  }, []);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);
    try {
      const history = messages.slice(-10);
      const { reply } = await apis.live.portfolioChat(text, history);
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
    } catch (err: any) {
      toast.error(err.message || 'Failed to get response');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const SUGGESTED = [
    "What's my total portfolio value?",
    'Which holding has the biggest gain?',
    'How diversified am I by sector?',
    "What's my riskiest position?",
  ];

  return (
    <Stack sx={{ height: 'calc(100vh - 96px)', maxWidth: 800, mx: 'auto' }} spacing={0}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        AI Portfolio Assistant
      </Typography>

      <Card variant="outlined" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {aiEnabled === false ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', flexGrow: 1, p: 4 }}>
            <Iconify icon="fluent:brain-sparkle-20-regular" width={48} sx={{ color: 'text.disabled', mb: 2 }} />
            <Typography sx={{ color: 'text.disabled', textAlign: 'center', fontSize: '0.88rem' }}>
              AI is not enabled. Go to Settings → AI Agent to configure a provider.
            </Typography>
          </Stack>
        ) : (
          <>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
              {messages.length === 0 ? (
                <Stack sx={{ alignItems: 'center', pt: 4 }} spacing={2}>
                  <Iconify icon="fluent:brain-sparkle-20-filled" width={40} sx={{ color: '#8b5cf6' }} />
                  <Typography
                    sx={{ color: 'text.secondary', fontSize: '0.88rem', textAlign: 'center', maxWidth: 400 }}
                  >
                    Ask me anything about your portfolio — holdings, performance, risk, or allocation.
                  </Typography>
                  <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, justifyContent: 'center', mt: 1 }}>
                    {SUGGESTED.map((q) => (
                      <Button
                        key={q}
                        variant="outlined"
                        size="small"
                        onClick={() => setInput(q)}
                        sx={{ fontSize: '0.72rem', textTransform: 'none', borderRadius: 2 }}
                      >
                        {q}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={1.5}>
                  {messages.map((m, i) => (
                    <Stack
                      key={i}
                      direction="row"
                      sx={{ justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}
                    >
                      {m.role === 'assistant' && (
                        <Box
                          sx={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            bgcolor: 'rgba(139,92,246,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 1,
                            flexShrink: 0,
                            mt: 0.25,
                          }}
                        >
                          <Iconify icon="fluent:brain-sparkle-20-filled" width={14} sx={{ color: '#8b5cf6' }} />
                        </Box>
                      )}
                      <Box
                        sx={{
                          maxWidth: '75%',
                          px: 1.5,
                          py: 1,
                          borderRadius:
                            m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                          bgcolor: m.role === 'user' ? 'primary.main' : 'action.hover',
                          color: m.role === 'user' ? 'primary.contrastText' : 'text.primary',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.85rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {m.content}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                  {sending && (
                    <Stack direction="row" sx={{ alignItems: 'center' }}>
                      <Box
                        sx={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          bgcolor: 'rgba(139,92,246,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mr: 1,
                          flexShrink: 0,
                        }}
                      >
                        <Iconify icon="fluent:brain-sparkle-20-filled" width={14} sx={{ color: '#8b5cf6' }} />
                      </Box>
                      <Box
                        sx={{
                          px: 1.5,
                          py: 1,
                          borderRadius: '12px 12px 12px 2px',
                          bgcolor: 'action.hover',
                        }}
                      >
                        <CircularProgress size={14} sx={{ color: '#8b5cf6' }} />
                      </Box>
                    </Stack>
                  )}
                  <div ref={bottomRef} />
                </Stack>
              )}
            </Box>

            <Divider />
            <Stack direction="row" spacing={1} sx={{ p: 1.5 }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                size="small"
                placeholder="Ask about your portfolio..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
                sx={{ '& .MuiInputBase-root': { fontSize: '0.85rem' } }}
              />
              <IconButton
                onClick={send}
                disabled={!input.trim() || sending}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  borderRadius: 2,
                  '&:hover': { bgcolor: 'primary.dark' },
                  '&.Mui-disabled': { bgcolor: 'action.disabledBackground' },
                  alignSelf: 'flex-end',
                  flexShrink: 0,
                }}
              >
                <Iconify icon="tabler:send" width={20} />
              </IconButton>
            </Stack>
          </>
        )}
      </Card>
    </Stack>
  );
}
