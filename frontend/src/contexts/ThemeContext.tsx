// src/contexts/ThemeContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  isDark: false,
  setTheme: () => {},
  toggle: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('etrans-theme') as Theme) || 'system';
    } catch {
      return 'system';
    }
  });

  const [isDark, setIsDark] = useState(false);

  const applyTheme = useCallback((t: Theme) => {
    let dark = false;

    if (t === 'dark') {
      dark = true;
    } else if (t === 'system') {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    setIsDark(dark);

    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem('etrans-theme', t);
    } catch {}
    applyTheme(t);
  }, [applyTheme]);

  const toggle = useCallback(() => {
    setTheme(isDark ? 'light' : 'dark');
  }, [isDark, setTheme]);

  // Apply on mount
  useEffect(() => {
    applyTheme(theme);
  }, []);

  // Listen for system changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};
