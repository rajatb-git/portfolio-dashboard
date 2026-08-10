import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './global.css';

// A deploy replaces the hashed asset filenames route chunks are lazy-loaded
// from (see App.tsx's React.lazy() calls), so a tab left open across a
// deploy gets "Failed to fetch dynamically imported module" the next time it
// navigates to a page it hasn't loaded yet — the old bundle is asking for a
// chunk URL that no longer exists on the server. Vite dispatches this event
// for exactly that case; reload once to pick up the current build instead of
// leaving the user on ErrorBoundary's generic screen (whose "Try again"
// button would just re-trigger the same now-missing import). Throttled by
// timestamp rather than a one-time flag so it can still recover from a
// later deploy in the same long-lived tab, but won't reload-loop if the
// failure is a genuinely broken deploy rather than staleness.
window.addEventListener('vite:preloadError', (event) => {
  const RELOAD_KEY = 'vite-preload-reload-at';
  const lastReload = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
  if (Date.now() - lastReload > 10_000) {
    event.preventDefault();
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
    window.location.reload();
  }
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
