import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type ThemeOption = 'system' | 'light' | 'dark';
type Theme = 'light' | 'dark';

interface ThemeContextType {
  themeOption: ThemeOption;
  setThemeOption: (themeOption: ThemeOption) => void;
  effectiveTheme: Theme; // To be used by components for styling
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// Custom hook to manage theme setup
const useThemeSetup = (effectiveTheme: Theme) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
  }, [effectiveTheme]);
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [themeOption, setThemeOption] = useState<ThemeOption>('system');
  const [effectiveTheme, setEffectiveTheme] = useState<Theme>('light');

  const applyTheme = useCallback(() => {
    if (themeOption === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
    } else {
      setEffectiveTheme(themeOption);
    }
  }, [themeOption]);

  useEffect(() => {
    applyTheme();
    // Listen for changes in system preference if 'system' is selected
    if (themeOption === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
  }, [themeOption, applyTheme]);

  useThemeSetup(effectiveTheme); // Apply theme to documentElement

  const handleSetThemeOption = (newThemeOption: ThemeOption) => {
    setThemeOption(newThemeOption);
  };

  return (
    <ThemeContext.Provider value={{ themeOption, setThemeOption: handleSetThemeOption, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider. Make sure a ThemeProvider wraps your component.');
  }
  return context;
};
