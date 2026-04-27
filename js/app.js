// Forest Inventory app — entry point.
//
// Responsibilities at this stage:
//   1. Register the service worker (offline app shell)
//   2. Maintain the online/offline status indicator in the header
//   3. Run a minimal client-side router that swaps views into #app-root
//   4. Request persistent storage so IndexedDB data isn't evicted

import { renderProjectsList } from './views/projects-list.js';
import { renderProjectCreate } from './views/project-create.js';
import { requestPersistentStorage } from './db.js';

// ---------------------------------------------------------------------------
// Online/offline status indicator
// ---------------------------------------------------------------------------

const statusIndicator = document.getElementById('status-indicator');

function setOnlineStatus() {
  const online = navigator.onLine;
  statusIndicator.textContent = online ? 'Online' : 'Offline';
  statusIndicator.dataset.state = online ? 'online' : 'offline';
}
window.addEventListener('online', setOnlineStatus);
window.addEventListener('offline', setOnlineStatus);
setOnlineStatus();

// ---------------------------------------------------------------------------
// Service worker registration
// ---------------------------------------------------------------------------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .catch((err) => console.warn('Service worker registration failed:', err));
  });
}

// Ask for persistent storage early. The browser may prompt; many platforms
// just grant silently once the app is installed.
requestPersistentStorage().then((granted) => {
  if (!granted) {
    console.info('Persistent storage not granted; data may be evicted under storage pressure.');
  }
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
//
// Tiny in-memory router. No URL hash routing yet — added later if/when we
// need shareable deep links. For now the URL stays at the app root and
// in-app navigation is purely client-side state.

const routes = {
  'projects-list': renderProjectsList,
  'project-create': renderProjectCreate,
};

const appRoot = document.getElementById('app-root');

async function navigate(routeName, params) {
  const handler = routes[routeName];
  if (!handler) {
    console.error(`Unknown route: ${routeName}`);
    return;
  }

  // Clear current view
  appRoot.innerHTML = '';
  // Render new one (handlers may be async)
  try {
    await handler(appRoot, navigate, params);
  } catch (err) {
    console.error('View render failed:', err);
    appRoot.innerHTML = `
      <div class="error-banner">
        <strong>Something went wrong.</strong>
        <p>${escapeHtml(err.message || String(err))}</p>
      </div>
    `;
  }
  // Scroll to top after view change
  window.scrollTo(0, 0);
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial render
navigate('projects-list');
