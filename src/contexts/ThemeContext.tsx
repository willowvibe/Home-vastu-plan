import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

interface ThemeContextValue {
  darkMode: boolean;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: false,
  toggle: () => {},
});

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [darkMode, toggle] = useDarkMode();
  return <ThemeContext.Provider value={{ darkMode, toggle }}>{children}</ThemeContext.Provider>;
};

/** Read the current dark-mode state and the toggle function. */
export const useTheme = (): ThemeContextValue => useContext(ThemeContext);
