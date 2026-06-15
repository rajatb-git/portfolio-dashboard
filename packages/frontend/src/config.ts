// API Config
// ---------------------------------------------
export const DB_HOST = import.meta.env.VITE_DB_HOST || 'http://localhost:3001';

// NAV
// ---------------------------------------------
export const NAV_CONFIG = [
  { text: 'Dashboard', href: '/dashboard', icon: 'streamline:dashboard-3-solid' },
  { text: 'Analytics', href: '/analytics', icon: 'tabler:chart-line' },
  { text: 'AI Assistant', href: '/ai-assistant', icon: 'fluent:brain-sparkle-20-filled' },
  { text: 'Database', href: '/database', icon: 'iconoir:database-search' },
  { text: 'IPO Calendar', href: '/ipo-calendar', icon: 'tabler:calendar-dollar' },
  { text: 'Logs', href: '/logs', icon: 'radix-icons:file-text' },
];

export const NAV_SETTINGS_CONFIG = { text: 'Settings', href: '/settings', icon: 'lets-icons:setting-line' };

// APP Config
// ---------------------------------------------
export const DRAWER_WIDTH = 220;
export const DRAWER_COLLAPSED_WIDTH = 56;

// Theme
export const THEME_MODE = 'dark';
