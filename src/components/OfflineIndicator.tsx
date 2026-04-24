import { useState, useEffect } from 'react';

export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // Set initial state
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-amber-500 text-white text-sm py-2 text-center z-50">
      <span className="flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M1.5 12h3.86c.45 0 .87.26 1.05.69l.8 1.58c.44.87 1.43 1.32 2.36 1.22l1.58-.24c.64-.1 1.28 0 1.87.28l1.58.86c.87.48 1.94.25 2.62-.5l.86-1.06c.64-.78 1.85-1.06 2.83-.6l1.06.43c.97.39 2.15.08 2.83-.76l.43-1.06c.68-.84 1.08-2.03.84-3.15l-.43-1.06c-.68-.84-1.85-1.15-2.83-.76l-1.06.43c-.97.39-2.15.08-2.83-.76l-.43-1.06c-.24-1.12.16-2.31.84-3.15l1.06-.43c.97-.39 2.15-.08 2.83.76l.43 1.06c.68.84 1.08 2.03.84 3.15l-.43 1.06c-.78 1.03-2.07 1.43-3.29 1.07l-1.07-.43c-.97-.39-2.15-.08-2.83.76l-.43 1.06c-.24 1.12.16 2.31.84 3.15l1.06.43c.97.39 2.15.08 2.83-.76l.43-1.06c.68-.84 1.08-2.03.84-3.15l-.43-1.06c-.78-1.03-2.07-1.43-3.29-1.07l-1.07.43c-.97.39-2.15.08-2.83-.76l-.43-1.06c-.24-1.12.16-2.31.84-3.15l1.06-.43c.97-.39 2.15-.08 2.83.76l.43 1.06c.68.84 1.08 2.03.84 3.15l-.43 1.06c-.78 1.03-2.07 1.43-3.29 1.07l-1.07.43c-.97.39-2.15.08-2.83-.76l-.43-1.06c-.24-1.12.16-2.31.84-3.15l1.06-.43c.97-.39 2.15-.08 2.83.76l.43 1.06c.68.84 1.08 2.03.84 3.15l-.43 1.06c-.78 1.03-2.07 1.43-3.29 1.07l-1.07.43c-.97.39-2.15.08-2.83-.76l-.43-1.06c-.24-1.12.16-2.31.84-3.15l1.06-.43c.97-.39 2.15-.08 2.83.76l.43 1.06c.68.84 1.08 2.03.84 3.15l-.43 1.06c-.78 1.03-2.07 1.43-3.29 1.07l-1.07.43c-.97.39-2.15.08-2.83-.76l-.43-1.06c-.24-1.12.16-2.31.84-3.15l1.06-.43c.97-.39 2.15-.08 2.83.76l.43 1.06c.68.84 1.08 2.03.84 3.15l-.43 1.06c-.78 1.03-2.07 1.43-3.29 1.07l-1.07.43c-.97.39-2.15.08-2.83-.76l-.43-1.06" />
        </svg>
        You're offline. Changes will sync when you reconnect.
      </span>
    </div>
  );
}
