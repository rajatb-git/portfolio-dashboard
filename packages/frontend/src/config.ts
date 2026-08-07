// API Config
// ---------------------------------------------
export const DB_HOST = import.meta.env.VITE_DB_HOST || 'http://localhost:3001';

// NAV
// ---------------------------------------------
// Grouped by what the user is doing, not by which API serves the page:
// "Portfolio" is their own money, "Markets" is the outside world, "Manage" is
// the app's own plumbing.

export type NavItemConfig = {
  text: string;
  href: string;
  icon: string;
  section: string;
  description?: string;
};

export const NAV_CONFIG: NavItemConfig[] = [
  {
    text: 'Dashboard',
    href: '/dashboard',
    icon: 'tabler:layout-grid',
    section: 'Portfolio',
    description: 'Holdings across every account',
  },
  { text: 'Today', href: '/today', icon: 'tabler:sun-high', section: 'Portfolio', description: "The session's movers" },
  {
    text: 'Analytics',
    href: '/analytics',
    icon: 'tabler:chart-histogram',
    section: 'Portfolio',
    description: 'Risk, allocation and returns',
  },
  {
    text: 'Rebalance',
    href: '/rebalance',
    icon: 'tabler:scale',
    section: 'Portfolio',
    description: 'Drift against your targets',
  },
  {
    text: 'Research',
    href: '/research',
    icon: 'tabler:zoom-scan',
    section: 'Markets',
    description: 'Deep dive on a ticker',
  },
  { text: 'Alerts', href: '/alerts', icon: 'tabler:bell', section: 'Markets', description: 'Price triggers' },
  {
    text: 'IPO Calendar',
    href: '/ipo-calendar',
    icon: 'tabler:calendar-dollar',
    section: 'Markets',
    description: 'Upcoming listings',
  },
  {
    text: 'Database',
    href: '/database',
    icon: 'tabler:database',
    section: 'Manage',
    description: 'Accounts, holdings, transactions',
  },
  { text: 'Logs', href: '/logs', icon: 'tabler:file-text', section: 'Manage', description: 'Backend activity' },
];

export const NAV_SETTINGS_CONFIG: NavItemConfig = {
  text: 'Settings',
  href: '/settings',
  icon: 'tabler:settings',
  section: 'Manage',
};

// APP Config
// ---------------------------------------------
export const DRAWER_WIDTH = 232;
export const DRAWER_COLLAPSED_WIDTH = 60;

// Theme
export const THEME_MODE = 'dark';
