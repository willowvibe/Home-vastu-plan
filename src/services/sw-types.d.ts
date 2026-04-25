interface ServiceWorkerGlobalScope {
  caches: CacheStorage;
  registration: ServiceWorkerRegistration;
}

interface ServiceWorkerGlobalScopeEventMap {
  install: ExtendableEvent;
  activate: ExtendableEvent;
  fetch: FetchEvent;
  push: PushEvent;
  notificationclick: NotificationEvent;
}

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface FetchEvent extends Event {
  request: Request;
  respondWith(response: Promise<Response>): void;
}

interface PushEvent extends Event {
  data: PushData | null;
}

interface PushData {
  json(): Promise<any>;
}

interface NotificationEvent extends Event {
  notification: PushNotification;
  action: string;
}

interface PushNotification {
  title: string;
  body?: string;
  icon?: string;
  tag?: string;
  close(): void;
}

interface Window {
  showNotification?: (
    title: string,
    options?: { body?: string; icon?: string; tag?: string }
  ) => Promise<void>;
}
