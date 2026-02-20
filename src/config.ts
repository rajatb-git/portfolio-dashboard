// API Config
// ---------------------------------------------
export const DB_HOST = import.meta.env.VITE_DB_HOST || 'http://localhost:3001';

// NAV
// ---------------------------------------------
export const NAV_CONFIG = [
  { text: 'Dashboard', href: '/dashboard', icon: 'streamline:dashboard-3-solid' },
  { text: 'Database', href: '/database', icon: 'iconoir:database-search' },
  { text: 'IPO Calendar', href: '/ipo-calendar', icon: 'tabler:calendar-dollar' },
  { text: 'Logs', href: '/logs', icon: 'radix-icons:file-text' },
];

export const NAV_SETTINGS_CONFIG = { text: 'Setting', href: '/setting', icon: 'lets-icons:setting-line' };

// APP Config
// ---------------------------------------------
export const DRAWER_WIDTH = 64;

// Theme
export const THEME_MODE = 'dark';
