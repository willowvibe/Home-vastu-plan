import { useEffect, useState } from 'react';

const STORAGE_KEY = 'vastuplan-darkmode';

/**
 * Read the persisted dark-mode preference from localStorage. Falls back to
 * the current `<html class="dark">` state (so a manual toggle in DevTools
 * is respected), then to `false` for a fresh user.
 */
function readInitial(): boolean {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) return stored === 'true';
  return document.documentElement.classList.contains('dark');
}

/**
 * Dark mode as a hook. Returns `[isDark, toggle]` as a tuple. Writes to BOTH
 * `document.documentElement.classList` (for Tailwind's `dark:` variant) and
 * `localStorage` (for persistence) on every change.
 */
export function useDarkMode(): readonly [boolean, () => void] {
  const [dark, setDark] = useState<boolean>(readInitial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try {
      localStorage.setItem(STORAGE_KEY, String(dark));
    } catch {
      // localStorage can throw in private-browsing or quota-exceeded scenarios.
      // The class is already toggled; failing to persist just means the
      // preference won't survive a reload. Silent, intentional.
    }
  }, [dark]);
  return [dark, () => setDark((d) => !d)] as const;
}
