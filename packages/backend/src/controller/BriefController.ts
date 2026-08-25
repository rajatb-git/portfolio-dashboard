import moment from 'moment';
import { AlertModel } from '../models/AlertModel';
import { NotificationHistoryDBModel } from '../models/NotificationHistoryModel';
import { logger } from '../utils/winston';
import { buildAlertContext, describeCondition } from './AlertConditions';
import { buildDividendSummary } from './DividendController';
import { getHoldingsEarningsCalendar } from './HoldingsEarningsController';

const LABEL = 'BriefController';

// How far back "what you missed" reaches, and how far ahead the calendars look.
const FIRED_LOOKBACK_HOURS = 24;
const EARNINGS_HORIZON_DAYS = 7;
const DIVIDEND_HORIZON_DAYS = 14;

export type BriefNotification = {
  kind: string;
  symbol: string;
  title: string;
  message: string;
  createdAt: string;
  delivered: boolean;
};

export type BriefEarning = {
  symbol: string;
  name: string;
  date: string;
  hour: string | null;
  daysAway: number;
};

export type BriefDividend = {
  symbol: string;
  name: string;
  date: string;
  amount: number;
  event: 'ex_dividend' | 'payment';
};

export type BriefAlert = {
  symbol: string;
  conditionLabel: string;
  currentPrice: number | null;
  triggeredAt: string | null;
};

export type PortfolioBrief = {
  fired: BriefNotification[];
  firedCount: number;
  earnings: BriefEarning[];
  dividends: BriefDividend[];
  triggeredAlerts: BriefAlert[];
  lookbackHours: number;
  generatedAt: string;
};

async function recentNotifications(): Promise<BriefNotification[]> {
  const model = await NotificationHistoryDBModel().initialize();
  const cutoff = moment().subtract(FIRED_LOOKBACK_HOURS, 'hours').toISOString();
  return model
    .getAllRecords()
    .filter((rec) => rec.createdAt >= cutoff)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((rec) => ({
      kind: rec.kind,
      symbol: rec.symbol,
      title: rec.title,
      message: rec.message,
      createdAt: rec.createdAt,
      delivered: rec.delivered,
    }));
}

async function upcomingEarnings(): Promise<BriefEarning[]> {
  const calendar = await getHoldingsEarningsCalendar();
  return calendar
    .filter((entry) => entry.daysAway <= EARNINGS_HORIZON_DAYS)
    .map(({ symbol, name, date, hour, daysAway }) => ({ symbol, name, date, hour, daysAway }));
}

async function upcomingDividends(): Promise<BriefDividend[]> {
  const summary = await buildDividendSummary();
  const horizon = moment().add(DIVIDEND_HORIZON_DAYS, 'days');
  return summary.upcoming.filter((event) => moment(event.date).isSameOrBefore(horizon));
}

async function triggeredAlerts(): Promise<BriefAlert[]> {
  const model = await AlertModel().initialize();
  const alerts = model.getAllRecords().filter((alert) => !!alert.triggeredAt);
  if (alerts.length === 0) return [];

  const context = await buildAlertContext(alerts);
  return alerts.map((alert) => ({
    symbol: alert.symbol,
    conditionLabel: describeCondition(alert, context),
    currentPrice: alert.lastPrice ?? null,
    triggeredAt: alert.triggeredAt ?? null,
  }));
}

// What changed while you weren't looking, plus what needs attention next. Each
// section is gathered independently so one slow or failing upstream (dividends
// in particular) degrades that section rather than the whole brief.
export async function buildPortfolioBrief(): Promise<PortfolioBrief> {
  const [fired, earnings, dividends, alerts] = await Promise.allSettled([
    recentNotifications(),
    upcomingEarnings(),
    upcomingDividends(),
    triggeredAlerts(),
  ]);

  const unwrap = <T>(result: PromiseSettledResult<T[]>, section: string): T[] => {
    if (result.status === 'fulfilled') return result.value;
    logger.log({ level: 'error', label: LABEL, message: `${section} failed: ${result.reason}` });
    return [];
  };

  const firedItems = unwrap(fired, 'Recent notifications');

  return {
    fired: firedItems.slice(0, 20),
    firedCount: firedItems.length,
    earnings: unwrap(earnings, 'Upcoming earnings'),
    dividends: unwrap(dividends, 'Upcoming dividends'),
    triggeredAlerts: unwrap(alerts, 'Triggered alerts'),
    lookbackHours: FIRED_LOOKBACK_HOURS,
    generatedAt: new Date().toISOString(),
  };
}
