import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
// On load: check build fingerprint and (if changed) clear caches/old SW to avoid stale assets causing blank screens.
async function unregisterSWsAndClearCaches() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister().catch(() => {})));
    }
  } catch (err) {
    // service worker unregister failed
  }
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    }
  } catch (err) {
    // cache clear failed
  }
  // Try to remove IndexedDB databases (if supported) - best effort
  try {
    if ('indexedDB' in window && indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(db => new Promise(res => {
        const req = indexedDB.deleteDatabase(db.name);
        req.onsuccess = req.onerror = req.onblocked = () => res();
      })));
    }
  } catch (err) {
    // indexedDB cleanup failed
  }
}

async function ensureFreshBuildThenRegisterSW() {
  try {
    // Try to find the build's main JS file by fetching index.html (no-cache) and extracting the main.<hash>.js path.
    let fingerprint = null;
    try {
      const htmlResp = await fetch('/index.html', { method: 'GET', cache: 'no-cache' });
      if (htmlResp && htmlResp.ok) {
        const html = await htmlResp.text();
        const m = html.match(/\/(static\/js\/main\.[^"']+\.js)/);
        const mainPath = m && m[1] ? '/' + m[1] : null;
        if (mainPath) {
          try {
            const head = await fetch(mainPath, { method: 'HEAD', cache: 'no-cache' });
            if (head && head.ok) {
              fingerprint = head.headers.get('etag') || head.headers.get('last-modified') || head.headers.get('x-amz-version-id') || head.headers.get('content-length') || null;
            }
          } catch (err) {
            console.warn('HEAD for main js failed', err);
          }
        }
      }
    } catch (err) {
      // index.html fetch failed
    }

    // Fallback to manifest.json if we didn't get a fingerprint from main.*.js
    if (!fingerprint) {
      try {
        const head = await fetch('/manifest.json', { method: 'HEAD', cache: 'no-cache' });
        if (head && head.ok) {
          fingerprint = head.headers.get('etag') || head.headers.get('last-modified') || head.headers.get('x-amz-version-id') || head.headers.get('content-length') || null;
        }
      } catch (err) {
        // manifest head failed
      }
    }

    const prev = localStorage.getItem('app:assetFingerprint');
    const didCleanup = localStorage.getItem('app:didCleanup');
    if (fingerprint && prev && prev !== fingerprint && !didCleanup) {
      // preserve minimal auth info, clear the rest
      const preserved = { token: localStorage.getItem('token'), userId: localStorage.getItem('userId') };
      await unregisterSWsAndClearCaches();
      // Clear localStorage except preserved keys
      Object.keys(localStorage).forEach(k => {
        if (!['token', 'userId'].includes(k)) localStorage.removeItem(k);
      });
      if (preserved.token) localStorage.setItem('token', preserved.token);
      if (preserved.userId) localStorage.setItem('userId', preserved.userId);
      localStorage.setItem('app:didCleanup', '1');
      localStorage.setItem('app:assetFingerprint', fingerprint);
      // reload so the client fetches fresh assets
      window.location.reload();
      return; // don't continue to register SW in this run
    }
    if (fingerprint && (!prev || prev !== fingerprint)) {
      localStorage.setItem('app:assetFingerprint', fingerprint);
    }
  } catch (err) {
    // fingerprint detection failed
  }

  // Register service worker for simple offline support, only if file exists
  if ('serviceWorker' in navigator) {
    try {
      const res = await fetch('/service-worker.js', { method: 'HEAD' });
      if (res.ok) {
        navigator.serviceWorker.register('/service-worker.js').catch(() => {});
      } else {
        // no service-worker
      }
    } catch (err) {
      // service-worker check failed
    }
  }
}

window.addEventListener('load', () => {
  // run but do not block rendering; function may reload the page when cleaning caches
  // ONE-TIME DEPLOY FIX: forcefully unregister any service workers and clear caches
  // to avoid stale SW serving old assets after deploy. Remove this block after one successful deploy.
  (async () => {
    try {
      // Attempt a full cleanup first so the fresh build is loaded reliably
      await unregisterSWsAndClearCaches();
    } catch (err) {
      // don't block registration on cleanup errors
      console.warn('Forced SW/cache cleanup failed', err);
    }
    // Continue with normal registration/checks
    ensureFreshBuildThenRegisterSW();
  })();
});

