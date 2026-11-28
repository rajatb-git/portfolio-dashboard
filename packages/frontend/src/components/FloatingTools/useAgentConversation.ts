import * as React from 'react';
import { toast } from 'react-toastify';

import api from '@/api';
import type { AgentEvent, AgentMessage, AgentToolCall } from '@/api/agent';

export type AgentConversation = {
  messages: AgentMessage[];
  running: boolean;
  pending: AgentToolCall | null;
  error: string | null;
  notice: string | null;
  send: (text: string) => void;
  respond: (approve: boolean) => void;
  stop: () => void;
  reset: () => void;
};

export function useAgentConversation(): AgentConversation {
  const [messages, setMessages] = React.useState<AgentMessage[]>([]);
  const [running, setRunning] = React.useState(false);
  const [pending, setPending] = React.useState<AgentToolCall | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const messagesRef = React.useRef<AgentMessage[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  const commit = (next: AgentMessage[]) => {
    messagesRef.current = next;
    setMessages(next);
  };

  const run = async (history: AgentMessage[], approval?: 'approve' | 'deny') => {
    const controller = new AbortController();
    abortRef.current = controller;
    setRunning(true);
    setPending(null);
    setError(null);
    setNotice(null);
    commit(history);

    const onEvent = (event: AgentEvent) => {
      if (event.type === 'message') commit([...messagesRef.current, event.message]);
      else if (event.type === 'approval') setPending(event.call);
      else if (event.type === 'notice') setNotice(event.message);
      else if (event.type === 'error') {
        setError(event.message);
        toast.error(event.message);
      }
    };

    try {
      await api.agent.chat({ messages: history, approval }, onEvent, controller.signal);
    } catch (err: any) {
      if (!controller.signal.aborted) {
        const message = err?.message || 'The agent could not be reached';
        setError(message);
        toast.error(message);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setRunning(false);
      }
    }
  };

  const send = (text: string) => {
    const content = text.trim();
    if (!content || running) return;
    void run([...messagesRef.current, { role: 'user', content }]);
  };

  const respond = (approve: boolean) => {
    if (!pending || running) return;
    void run(messagesRef.current, approve ? 'approve' : 'deny');
  };

  const stop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setRunning(false);
  };

  const reset = () => {
    stop();
    commit([]);
    setPending(null);
    setError(null);
    setNotice(null);
  };

  return { messages, running, pending, error, notice, send, respond, stop, reset };
}
