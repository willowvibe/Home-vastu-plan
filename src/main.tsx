import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary';
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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  </StrictMode>
);
