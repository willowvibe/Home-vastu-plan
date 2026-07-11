// S-22: CACHE_NAME is injected by vite.config.ts as a per-deploy hash of
// index.html (see buildHash.ts). New deploys → new CACHE_NAME → activate
// handler prunes the old cache, clients fetch the new assets on next reload.
// Falls back to 'vastuplan-dev' for `npm run dev` and for environments that
// don't run Vite's define (e.g. a bare `tsc` build of the SW).
declare const __VASTUPLAN_CACHE_NAME__: string | undefined;
const CACHE_NAME: string =
  typeof __VASTUPLAN_CACHE_NAME__ !== 'undefined' ? __VASTUPLAN_CACHE_NAME__ : 'vastuplan-dev';
const ASSETS_TO_CACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json'];

// M-5: IndexedDB plan persistence. The SW keeps a small object store of plan
// snapshots so users can reload their last plan when offline. The app talks
// to the SW via postMessage; the SW replies with a matching requestId.
const DB_NAME = 'vastuplan-plans';
const DB_VERSION = 1;
const STORE_NAME = 'plans';

interface PersistedPlan {
  id: string;
  name: string;
  plan: unknown;
  timestamp: number;
  version: string;
}

interface PlanMessage {
  type: 'SAVE_PLAN' | 'LOAD_PLAN' | 'LIST_PLANS' | 'DELETE_PLAN';
  requestId?: string;
  payload?: Record<string, unknown>;
}

interface PlanResponse {
  requestId?: string;
  ok: boolean;
  data?: unknown;
  error?: string;
}

function openPlansDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

async function savePlan(id: string, name: string, plan: unknown, version: string): Promise<void> {
  const db = await openPlansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record: PersistedPlan = { id, name, plan, timestamp: Date.now(), version };
    const request = store.put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function loadPlan(id: string): Promise<PersistedPlan | undefined> {
  const db = await openPlansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as PersistedPlan | undefined);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function listPlans(): Promise<PersistedPlan[]> {
  const db = await openPlansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    const results: PersistedPlan[] = [];
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        results.push(cursor.value as PersistedPlan);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

async function deletePlan(id: string): Promise<void> {
  const db = await openPlansDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

// Q-7: cast `self` to ServiceWorkerGlobalScope so the addEventListener
// overloads below pick up ExtendableEvent / FetchEvent instead of plain
// Event. The DOM lib types `self` as Window & typeof globalThis.
const sw = self as unknown as ServiceWorkerGlobalScope;

// Install event - cache static assets
sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - cleanup old caches
sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
sw.addEventListener('fetch', (event) => {
  // For API requests, use network-first strategy
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('vastu') ||
    event.request.url.includes('gemini')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Push notification support (optional)
sw.addEventListener('push', (event) => {
  const dataPromise: Promise<{ title: string; body: string }> = event.data
    ? (event.data.json() as Promise<{ title: string; body: string }>)
    : Promise.resolve({ title: 'VastuPlan', body: 'New update available' });
  event.waitUntil(
    dataPromise.then((data) =>
      sw.registration.showNotification(data.title, {
        body: data.body,
        icon: '/icons/icon-192.png',
        tag: 'vastuplan-update',
      })
    )
  );
});

// Notification click handler
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    sw.clients.matchAll({ type: 'window', includeHidden: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return sw.clients.openWindow('/');
    })
  );
});

// M-5: handle plan persistence messages from the app.
sw.addEventListener('message', (event) => {
  const message = event.data as PlanMessage | undefined;
  if (!message || typeof message !== 'object') return;

  const respond = (response: PlanResponse) => {
    if (event.source instanceof Client) {
      event.source.postMessage({ ...response, requestId: message.requestId });
    }
  };

  const payload = message.payload || {};

  switch (message.type) {
    case 'SAVE_PLAN': {
      const id = typeof payload.id === 'string' ? payload.id : 'autosave';
      const name = typeof payload.name === 'string' ? payload.name : 'Untitled plan';
      const version = typeof payload.version === 'string' ? payload.version : '0.1.1';
      event.waitUntil(
        savePlan(id, name, payload.plan, version)
          .then(() => respond({ ok: true }))
          .catch((error) =>
            respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
          )
      );
      break;
    }
    case 'LOAD_PLAN': {
      const id = typeof payload.id === 'string' ? payload.id : 'autosave';
      event.waitUntil(
        loadPlan(id)
          .then((record) => respond({ ok: Boolean(record), data: record ?? null }))
          .catch((error) =>
            respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
          )
      );
      break;
    }
    case 'LIST_PLANS': {
      event.waitUntil(
        listPlans()
          .then((records) => respond({ ok: true, data: records }))
          .catch((error) =>
            respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
          )
      );
      break;
    }
    case 'DELETE_PLAN': {
      const id = typeof payload.id === 'string' ? payload.id : 'autosave';
      event.waitUntil(
        deletePlan(id)
          .then(() => respond({ ok: true }))
          .catch((error) =>
            respond({ ok: false, error: error instanceof Error ? error.message : String(error) })
          )
      );
      break;
    }
    default:
      break;
  }
});
