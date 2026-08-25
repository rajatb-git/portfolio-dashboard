import { DashboardAPI } from './dashboard';
import HoldingsAPI from './holdings';
import LiveAPI from './live';
import LogsAPI from './logs';
import TransactionsAPI from './transactions';
import AccountsAPI from './account';
import AnalyticsAPI from './analytics';
import DatabaseAPI from './database';
import AuthAPI from './auth';
import AlertsAPI from './alerts';
import NotesAPI from './notes';
import NotificationsAPI from './notifications';
import RebalanceAPI from './rebalance';
import SettingsAPI from './settings';

const apis = {
  dashboard: new DashboardAPI(),
  holdings: new HoldingsAPI(),
  live: new LiveAPI(),
  accounts: new AccountsAPI(),
  transactions: new TransactionsAPI(),
  logs: new LogsAPI(),
  analytics: new AnalyticsAPI(),
  database: new DatabaseAPI(),
  auth: new AuthAPI(),
  settings: new SettingsAPI(),
  notes: new NotesAPI(),
  alerts: new AlertsAPI(),
  notifications: new NotificationsAPI(),
  rebalance: new RebalanceAPI(),
};

export default apis;
