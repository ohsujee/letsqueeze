'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { storage } from '@/lib/utils/storage';

const ThemeContext = createContext({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: (theme) => {},
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState('dark'); // Dark mode par défaut
  const [mounted, setMounted] = useState(false);

  // Load theme from storage on mount
  useEffect(() => {
    setMounted(true);
    const savedTheme = storage.getOrDefault('theme', 'dark');
    setThemeState(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    storage.set('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
