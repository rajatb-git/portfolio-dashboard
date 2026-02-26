import { DashboardAPI } from './dashboard';
import HoldingsAPI from './holdings';
import LiveAPI from './live';
import LogsAPI from './logs';
import TransactionsAPI from './transactions';
import AccountsAPI from './account';
import WatchlistAPI from './watchlist';

const apis = {
  dashboard: new DashboardAPI(),
  holdings: new HoldingsAPI(),
  live: new LiveAPI(),
  accounts: new AccountsAPI(),
  transactions: new TransactionsAPI(),
  logs: new LogsAPI(),
  watchlist: new WatchlistAPI(),
};

export default apis;
