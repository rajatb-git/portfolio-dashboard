// API Config
// ---------------------------------------------
export const DB_HOST = import.meta.env.VITE_DB_HOST || 'http://localhost:3001';

// NAV
// ---------------------------------------------
export const NAV_CONFIG = [
  { text: 'Dashboard', href: '/dashboard', icon: 'streamline:dashboard-3-solid', section: 'Overview' },
  { text: 'Today', href: '/today', icon: 'tabler:sun', section: 'Overview' },
  { text: 'Analytics', href: '/analytics', icon: 'tabler:chart-line', section: 'Overview' },
  { text: 'Rebalance', href: '/rebalance', icon: 'tabler:scale', section: 'Overview' },
  { text: 'Alerts', href: '/alerts', icon: 'tabler:bell', section: 'Markets' },
  { text: 'Database', href: '/database', icon: 'iconoir:database-search', section: 'Markets' },
  { text: 'IPO Calendar', href: '/ipo-calendar', icon: 'tabler:calendar-dollar', section: 'Markets' },
  { text: 'Logs', href: '/logs', icon: 'radix-icons:file-text', section: 'Markets' },
];

export const NAV_SETTINGS_CONFIG = { text: 'Settings', href: '/settings', icon: 'lets-icons:setting-line' };

// APP Config
// ---------------------------------------------
export const DRAWER_WIDTH = 220;
export const DRAWER_COLLAPSED_WIDTH = 56;

// Theme
export const THEME_MODE = 'dark';
