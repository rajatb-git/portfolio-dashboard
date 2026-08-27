import { defineConfig } from 'vitepress';

const BASE = '/portfolio-dashboard/';
const SITE = 'https://rajatb-git.github.io/portfolio-dashboard/';
const REPO = 'https://github.com/rajatb-git/portfolio-dashboard';

export default defineConfig({
  title: 'Portfolio Dashboard',
  description: 'Self-hosted dashboard for tracking stock and crypto holdings — live market data, analytics, alerts and optional AI research.',
  lang: 'en-US',
  base: BASE,
  lastUpdated: true,
  cleanUrls: false,
  ignoreDeadLinks: [/^https?:\/\/localhost/],
  sitemap: { hostname: SITE },

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}logo.svg` }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'Portfolio Dashboard' }],
    ['meta', { property: 'og:site_name', content: 'Portfolio Dashboard' }],
    ['meta', { property: 'og:url', content: SITE }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'Self-hosted dashboard for tracking stock and crypto holdings.',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: 'Guide', link: '/guide/introduction', activeMatch: '/guide/' },
      { text: 'Features', link: '/features/dashboard', activeMatch: '/features/' },
      { text: 'Reference', link: '/reference/rest-api', activeMatch: '/reference/' },
      { text: 'Internals', link: '/internals/architecture', activeMatch: '/internals/' },
      {
        text: 'Links',
        items: [
          { text: 'GitHub', link: REPO },
          { text: 'Changelog', link: `${REPO}/blob/develop/CHANGELOG.md` },
          { text: 'Container images', link: `${REPO}/pkgs/container/portfolio-dashboard%2Fbackend` },
          { text: 'Report an issue', link: `${REPO}/issues/new/choose` },
        ],
      },
    ],

    sidebar: [
      {
        text: 'Guide',
        collapsed: false,
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Getting started', link: '/guide/getting-started' },
          { text: 'Configuration', link: '/guide/configuration' },
          { text: 'Deploying with Docker', link: '/guide/docker' },
          { text: 'Importing your portfolio', link: '/guide/importing-data' },
          { text: 'Backups & restore', link: '/guide/backups' },
          { text: 'Troubleshooting', link: '/guide/troubleshooting' },
          { text: 'FAQ', link: '/guide/faq' },
        ],
      },
      {
        text: 'Features',
        collapsed: false,
        items: [
          { text: 'Dashboard & Today', link: '/features/dashboard' },
          { text: 'Analytics', link: '/features/analytics' },
          { text: 'Rebalance', link: '/features/rebalance' },
          { text: 'Research & AI insights', link: '/features/research' },
          { text: 'Alerts & notifications', link: '/features/alerts' },
          { text: 'IPO calendar', link: '/features/ipo-calendar' },
          { text: 'Demo mode & app lock', link: '/features/demo-mode-and-lock' },
        ],
      },
      {
        text: 'Reference',
        collapsed: false,
        items: [
          { text: 'REST API', link: '/reference/rest-api' },
          { text: 'Environment variables', link: '/reference/environment' },
          { text: 'Data models', link: '/reference/data-models' },
          { text: 'Background services', link: '/reference/background-services' },
          { text: 'Commands', link: '/reference/commands' },
        ],
      },
      {
        text: 'Internals',
        collapsed: false,
        items: [
          { text: 'Architecture', link: '/internals/architecture' },
          { text: 'AI data-privacy rule', link: '/internals/ai-privacy' },
          { text: 'Error handling', link: '/internals/error-handling' },
          { text: 'UI conventions', link: '/internals/ui-conventions' },
          { text: 'Design system', link: '/internals/design-system' },
          { text: 'Contributing', link: '/internals/contributing' },
        ],
      },
    ],

    socialLinks: [{ icon: 'github', link: REPO }],

    editLink: {
      pattern: `${REPO}/edit/develop/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    search: { provider: 'local' },

    outline: { level: [2, 3] },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © Rajat Bansal',
    },
  },
});
