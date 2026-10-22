// API Config
// ---------------------------------------------
export const DEFAULT_DB_HOST = import.meta.env.VITE_DB_HOST || 'http://localhost:3001';
export const API_HOST_KEY = 'api_host';

// Settings → Backend URL stores an override here; it wins over the build-time
// host. Read once at startup, which is why changing it reloads the page.
const readApiHostOverride = (): string | null => {
  try {
    const raw = localStorage.getItem(API_HOST_KEY);
    const value = raw ? JSON.parse(raw) : null;
    return typeof value === 'string' && value.trim() ? value.trim().replace(/\/+$/, '') : null;
  } catch {
    return null;
  }
};

export const DB_HOST = readApiHostOverride() ?? DEFAULT_DB_HOST;

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
    text: 'Notifications',
    href: '/notifications',
    icon: 'tabler:bell-ringing',
    section: 'Markets',
    description: 'What the app has sent you',
  },
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
  { text: 'Changelog', href: '/changelog', icon: 'tabler:history', section: 'Manage', description: 'Release history' },
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
