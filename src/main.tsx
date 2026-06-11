import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProvider } from './components/Toast';
import { initSentry } from './services/sentry';
import './index.css';

// Initialize Sentry for error tracking
initSentry();

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/src/services/sw.ts')
      .then((registration) => {
        console.log('ServiceWorker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// S-21: previously this wrapped <App> in both <Sentry.ErrorBoundary>
// AND the custom <ErrorBoundary> below. The custom one already calls
// captureError() inside componentDidCatch (see ErrorBoundary.tsx), so
// the Sentry wrapper was double-reporting. Drop the Sentry wrapper —
// the custom one is the single source of truth for the fallback UI
// and the Sentry report.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ErrorBoundary>
  </StrictMode>
);
