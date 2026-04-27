// Forest Inventory app — entry point.
// At skeleton stage, this:
//   1. Registers the service worker (PWA installability)
//   2. Reports online/offline status in the header
//   3. Runs platform diagnostics so we can verify required browser APIs work
//      on whatever device Sam ends up using in the field.

const diagnostics = document.getElementById('diagnostics');
const statusIndicator = document.getElementById('status-indicator');

function setOnlineStatus() {
  const online = navigator.onLine;
  statusIndicator.textContent = online ? 'Online' : 'Offline';
  statusIndicator.dataset.state = online ? 'online' : 'offline';
}

window.addEventListener('online', setOnlineStatus);
window.addEventListener('offline', setOnlineStatus);
setOnlineStatus();

// Service worker registration.
// Only register on https or localhost — the spec requires it.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((reg) => {
        addDiagnostic('Service worker', 'registered', 'ok');
        // Listen for updates and prompt user (later — not at skeleton stage)
        reg.addEventListener('updatefound', () => {
          // Placeholder: in v1 we'll show an update toast here.
        });
      })
      .catch((err) => {
        addDiagnostic('Service worker', `failed: ${err.message}`, 'fail');
      });
  });
} else {
  addDiagnostic('Service worker', 'unsupported by browser', 'fail');
}

// Platform diagnostics — verify the browser APIs we rely on are present.
// This is dev-facing, will be hidden behind a debug flag once the app
// has actual content.

function addDiagnostic(label, value, status) {
  if (!diagnostics) return;
  const li = document.createElement('li');
  const labelEl = document.createElement('span');
  labelEl.textContent = label;
  const valueEl = document.createElement('span');
  valueEl.textContent = value;
  valueEl.classList.add(`check-${status}`);
  li.appendChild(labelEl);
  li.appendChild(valueEl);
  diagnostics.appendChild(li);
}

// Run checks
(function runDiagnostics() {
  // Geolocation API — required for plot GPS capture
  addDiagnostic(
    'Geolocation API',
    'geolocation' in navigator ? 'available' : 'missing',
    'geolocation' in navigator ? 'ok' : 'fail'
  );

  // IndexedDB — required for data storage
  addDiagnostic(
    'IndexedDB',
    'indexedDB' in window ? 'available' : 'missing',
    'indexedDB' in window ? 'ok' : 'fail'
  );

  // File input with capture — required for in-field photos
  // (We can't fully test capture support without a UI, but we can check
  //  that file inputs work in principle.)
  const testInput = document.createElement('input');
  testInput.type = 'file';
  addDiagnostic(
    'File input',
    testInput.type === 'file' ? 'available' : 'missing',
    testInput.type === 'file' ? 'ok' : 'fail'
  );

  // HTTPS — geolocation and several other APIs require secure context
  addDiagnostic(
    'Secure context',
    window.isSecureContext ? 'yes' : 'no (geolocation will fail)',
    window.isSecureContext ? 'ok' : 'warn'
  );

  // Persistent storage — useful for ensuring IndexedDB isn't evicted
  if (navigator.storage && navigator.storage.persist) {
    addDiagnostic('Storage API', 'available', 'ok');
  } else {
    addDiagnostic('Storage API', 'limited (data could be evicted)', 'warn');
  }

  // App version (for debugging across deploys)
  addDiagnostic('App version', '0.1.0 (skeleton)', 'ok');
})();
