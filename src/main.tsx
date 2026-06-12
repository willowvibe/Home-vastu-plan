import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './components/Toast';
import { initSentry } from './services/sentry';
import './index.css';

// Initialize Sentry for error tracking
initSentry();

// Register service worker for PWA
// S-22: register /sw.js (the bundled output of src/services/sw.ts) in
// production builds. In dev mode, Vite serves the source at
// /src/services/sw.ts via the dev server, so we use that path. The previous
// hard-coded /src/services/sw.ts was broken in production (the file didn't
// exist in dist/), so the SW never actually shipped to users.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const swPath = import.meta.env.DEV ? '/src/services/sw.ts' : '/sw.js';
    navigator.serviceWorker
      .register(swPath)
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
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
