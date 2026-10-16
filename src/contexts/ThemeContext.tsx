/* eslint-disable react-refresh/only-export-components */
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  toggleTheme: () => void;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getInitialTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';

  try {
    const savedTheme = window.localStorage.getItem('atlas_theme');
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light';
  } catch (error) {
    console.error('Não foi possível carregar a preferência de tema salva.', error);
    return 'light';
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    try {
      window.localStorage.setItem('atlas_theme', theme);
    } catch (error) {
      console.error('Não foi possível salvar a preferência de tema.', error);
    }
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle('light', theme === 'light');
    if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setThemeMode = (mode: ThemeMode) => {
    setTheme(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
