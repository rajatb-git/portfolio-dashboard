import AccountsAPI from './account';
import AlertsAPI from './alerts';
import AnalyticsAPI from './analytics';
import AuthAPI from './auth';
import { DashboardAPI } from './dashboard';
import DatabaseAPI from './database';
import HoldingsAPI from './holdings';
import ImportAPI from './import';
import LiveAPI from './live';
import LogsAPI from './logs';
import NotesAPI from './notes';
import NotificationsAPI from './notifications';
import RebalanceAPI from './rebalance';
import SettingsAPI from './settings';
import TransactionsAPI from './transactions';

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
  import: new ImportAPI(),
};

export default apis;
