import { DashboardAPI } from './dashboard';
import HoldingsAPI from './holdings';
import LiveAPI from './live';
import LogsAPI from './logs';
import TransactionsAPI from './transactions';
import UserAPI from './user';

const apis = {
  dashboard: new DashboardAPI(),
  holdings: new HoldingsAPI(),
  live: new LiveAPI(),
  user: new UserAPI(),
  transactions: new TransactionsAPI(),
  logs: new LogsAPI(),
};

export default apis;
