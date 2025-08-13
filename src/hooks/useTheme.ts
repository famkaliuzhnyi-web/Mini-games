import { useState, useEffect } from 'react';
import { ThemeService } from '../services/ThemeService';
import type { ThemeName } from '../services/ThemeService';

/**
 * Hook for managing themes across the application
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeName>(() => 
    ThemeService.getInstance().getCurrentTheme()
  );

  useEffect(() => {
    const themeService = ThemeService.getInstance();
    
    // Subscribe to theme changes
    const unsubscribe = themeService.subscribe((newTheme) => {
      setCurrentTheme(newTheme);
    });

    // Cleanup subscription
    return unsubscribe;
  }, []);

  const themeService = ThemeService.getInstance();

  return {
    // Current theme data
    currentTheme,
    theme: themeService.getTheme(currentTheme),
    
    // All available themes
    availableThemes: themeService.getAllThemes(),
    
    // Theme actions
    setTheme: (themeName: ThemeName) => themeService.setTheme(themeName),
    
    // Helper functions
    isTheme: (themeName: ThemeName) => currentTheme === themeName,
    getThemeByName: (themeName: ThemeName) => themeService.getTheme(themeName),
  };
}

export type UseThemeReturn = ReturnType<typeof useTheme>;