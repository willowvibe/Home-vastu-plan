// S-22: per-deploy cache name injected by vite.config.ts (see buildHash.ts).
// Falls back to 'vastuplan-dev' in sw.ts when this is undefined (dev mode).
declare const __VASTUPLAN_CACHE_NAME__: string | undefined;

// Q-7: declare the standard ServiceWorkerGlobalScope surface (addEventListener
// is inherited from EventTarget; clients/skipWaiting/WindowClient are used in
// sw.ts). The DOM lib doesn't ship these for the SW worker context.
interface ServiceWorkerGlobalScope extends EventTarget {
  caches: CacheStorage;
  registration: ServiceWorkerRegistration;
  clients: Clients;
  skipWaiting(): Promise<void>;
  addEventListener<K extends keyof ServiceWorkerGlobalScopeEventMap>(
    type: K,
    listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  removeEventListener<K extends keyof ServiceWorkerGlobalScopeEventMap>(
    type: K,
    listener: (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap[K]) => void,
    options?: boolean | EventListenerOptions
  ): void;
}

interface Clients {
  matchAll(options?: {
    type?: 'window' | 'worker' | 'sharedworker';
    includeUncontrolled?: boolean;
    includeHidden?: boolean;
  }): Promise<WindowClient[]>;
  claim(): Promise<void>;
  openWindow(url: string): Promise<WindowClient | null>;
  get(id: string): Promise<Client | null>;
}

interface WindowClient extends Client {
  focused: boolean;
  visibilityState: 'hidden' | 'visible' | 'prerender' | 'unloaded';
  focus(): Promise<WindowClient>;
  navigate(url: string): Promise<WindowClient | null>;
}

interface Client {
  id: string;
  url: string;
  type: 'window' | 'worker' | 'sharedworker';
  postMessage(message: unknown, transfer?: Transferable[]): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: unknown;
  source: Client | null;
}

interface ServiceWorkerGlobalScopeEventMap {
  install: ExtendableEvent;
  activate: ExtendableEvent;
  fetch: FetchEvent;
  push: PushEvent;
  notificationclick: NotificationEvent;
  message: ExtendableMessageEvent;
}

// Client is a global constructor inside a service worker.
declare const Client: {
  prototype: Client;
  new (): Client;
};

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
  preloadResponse: Promise<Response | undefined> | undefined;
}

interface PushEvent extends ExtendableEvent {
  data: PushData | null;
}

interface PushData {
  json(): Promise<unknown>;
  text(): Promise<string>;
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
}

interface NotificationEvent extends ExtendableEvent {
  notification: PushNotification;
  action: string;
}

interface PushNotification {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  data?: unknown;
  close(): void;
}

interface Window {
  showNotification?: (
    title: string,
    options?: { body?: string; icon?: string; tag?: string }
  ) => Promise<void>;
}
