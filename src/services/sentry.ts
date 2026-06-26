import * as Sentry from '@sentry/react';

interface SentryConfig {
  dsn?: string;
  environment?: string;
  enabled?: boolean;
  release?: string;
}

// S-7: track whether initSentry successfully initialized the SDK. Public
// methods (setUser, addBreadcrumb, etc.) early-return when this is false,
// so dev-mode code that calls them is a no-op instead of throwing on
// an uninitialized SDK.
let initialized = false;

export function isSentryInitialized(): boolean {
  return initialized;
}

export function initSentry(config: SentryConfig = {}) {
  const {
    dsn = import.meta.env.VITE_SENTRY_DSN,
    environment = import.meta.env.SENTRY_ENVIRONMENT || import.meta.env.MODE || 'development',
    enabled = import.meta.env.PROD,
    release = import.meta.env.VITE_APP_VERSION || '0.1.1',
  } = config;

  if (!enabled || !dsn) {
    console.log('Sentry disabled');
    return;
  }

  Sentry.init({
    dsn,
    environment,
    release,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    tracesSampleRate: 0.1,
    profilesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Don't send errors from development
      if (environment === 'development') {
        return null;
      }
      return event;
    },
    beforeSendTransaction(event) {
      if (environment === 'development') {
        return null;
      }
      return event;
    },
  });

  initialized = true;

  console.log('Sentry initialized', {
    environment,
    release,
    dsn: dsn.replace(/\/\/[^@]+@/, '//***@'),
  });
}

export function captureError(error: Error | string, context?: Record<string, unknown>) {
  if (!isSentryInitialized()) return;
  if (import.meta.env.DEV) {
    console.error('Error captured (Sentry disabled in dev):', error);
    return;
  }

  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Record<string, unknown>);
      });
    }
    Sentry.captureException(typeof error === 'string' ? new Error(error) : error);
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  if (!isSentryInitialized()) return;
  if (import.meta.env.DEV) {
    console.log(`[Sentry] ${level}: ${message}`);
    return;
  }

  Sentry.captureMessage(message, level);
}

export function setUser(id: string, email?: string, name?: string) {
  if (!isSentryInitialized()) return;
  Sentry.setUser({
    id,
    email,
    name,
  });
}

export function clearUser() {
  if (!isSentryInitialized()) return;
  Sentry.setUser(null);
}

export function setTag(key: string, value: string) {
  if (!isSentryInitialized()) return;
  Sentry.setTag(key, value);
}

export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  if (!isSentryInitialized()) return;
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    data,
  });
}
