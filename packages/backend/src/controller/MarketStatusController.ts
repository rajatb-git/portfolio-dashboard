import moment from 'moment';
import type { MarketStatusResponse } from '../externalApis/finnHub';
import { read } from '../marketData/store';
import { getMarketSession, getNextSessionChange, type MarketSession } from '../utils/marketCalendar';

// US market open/closed/extended-hours status from Finnhub — public exchange
// data, no personal holdings and no AI provider involved.

export type { MarketSession };

export type MarketStatus = {
  isOpen: boolean;
  session: MarketSession;
  holiday: string | null;
  exchange: string;
  timezone: string;
  // When the current session gives way to the next one, so the UI can count down
  // to the opening bell rather than just asserting "closed".
  nextChange: { session: MarketSession; at: string };
  generatedAt: string;
};

// Finnhub's free tier sometimes returns a null session, and only ever says
// "closed" for anything outside the regular bell — including pre-market, when
// prices are very much moving. Fall back to the local exchange calendar, which
// models pre-/post-market directly.
const normalizeSession = (session: string | null, isOpen: boolean): MarketSession => {
  const s = (session ?? '').toLowerCase();
  if (s.includes('pre')) return 'pre-market';
  if (s.includes('post') || s.includes('after')) return 'post-market';
  if (s === 'regular' || s === 'market' || isOpen) return 'regular';
  return getMarketSession();
};

// Calendar-only status, used when Finnhub is unreachable and nothing usable is
// cached. Better a locally-derived session than no market status at all.
const localStatus = (): MarketStatus => {
  const session = getMarketSession();
  return {
    isOpen: session === 'regular',
    session,
    holiday: null,
    exchange: 'US',
    timezone: 'America/New_York',
    nextChange: getNextSessionChange(),
    generatedAt: moment().toISOString(),
  };
};

// The market data scheduler keeps the stored status fresh; a refresh click
// fetches a new one. Without any stored status, the local calendar answers.
export class MarketStatusController {
  getStatus = async (forceRefresh = false): Promise<MarketStatus> => {
    const result = await read<MarketStatusResponse>('marketStatus', 'US', {
      mode: forceRefresh ? 'force' : 'fresh',
    }).catch(() => read<MarketStatusResponse>('marketStatus', 'US'));
    const raw = result.value;
    if (!raw) return localStatus();

    return {
      isOpen: !!raw.isOpen,
      session: normalizeSession(raw.session, !!raw.isOpen),
      holiday: raw.holiday ?? null,
      exchange: raw.exchange || 'US',
      timezone: raw.timezone || 'America/New_York',
      nextChange: getNextSessionChange(),
      generatedAt: result.fetchedAt ?? moment().toISOString(),
    };
  };
}
