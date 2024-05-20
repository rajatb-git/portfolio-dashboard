import { DashboardAPI } from './dashboard';
import HoldingsAPI from './holdings';
import LiveAPI from './live';
import UserAPI from './user';

const apis = {
  dashboard: new DashboardAPI(),
  holdings: new HoldingsAPI(),
  live: new LiveAPI(),
  user: new UserAPI(),
};

export default apis;
