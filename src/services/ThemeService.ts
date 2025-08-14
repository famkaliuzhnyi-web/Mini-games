/**
 * Theme Service - Handles theme management and persistence
 */
export type ThemeName = 'dark' | 'light' | 'matrix';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  colors: {
    // Background colors
    primary: string;
    secondary: string;
    surface: string;
    surfaceDarker: string;
    surfaceHover: string;
    card: string;
    
    // Text colors
    text: string;
    textSecondary: string;
    textMuted: string;
    
    // UI colors
    border: string;
    borderLight: string;
    accent: string;
    accentLight: string;
    accentHover: string;
    success: string;
    successLight: string;
    error: string;
    errorLight: string;
    warning: string;
    warningLight: string;
    info: string;
    infoLight: string;
    
    // Game specific
    gameBackground: string;
    gameSurface: string;
  };
  fonts: {
    primary: string;
    mono: string;
  };
}

export const THEMES: Record<ThemeName, Theme> = {
  dark: {
    name: 'dark',
    displayName: 'Dark',
    description: 'A sleek dark theme that\'s easy on the eyes',
    colors: {
      primary: '#1a1a1a',
      secondary: '#2d2d2d',
      surface: '#3d3d3d',
      surfaceDarker: '#2a2a2a',
      surfaceHover: '#4d4d4d',
      card: '#4a4a4a',
      
      text: '#ffffff',
      textSecondary: '#e0e0e0',
      textMuted: '#a0a0a0',
      
      border: '#555555',
      borderLight: '#666666',
      accent: '#646cff',
      accentLight: '#7c84ff',
      accentHover: '#747bff',
      success: '#4caf50',
      successLight: '#81c784',
      error: '#f44336',
      errorLight: '#ef5350',
      warning: '#ff9800',
      warningLight: '#ffb74d',
      info: '#00BCD4',
      infoLight: '#4dd0e1',
      
      gameBackground: '#2d2d2d',
      gameSurface: '#3d3d3d',
    },
    fonts: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      mono: 'Consolas, "Courier New", Monaco, monospace',
    },
  },
  
  light: {
    name: 'light',
    displayName: 'Light',
    description: 'A clean and bright theme for daytime use',
    colors: {
      primary: '#ffffff',
      secondary: '#f8f9fa',
      surface: '#f1f3f4',
      surfaceDarker: '#e8eaed',
      surfaceHover: '#f8f9fa',
      card: '#ffffff',
      
      text: '#333333',
      textSecondary: '#555555',
      textMuted: '#777777',
      
      border: '#e0e0e0',
      borderLight: '#f0f0f0',
      accent: '#1976d2',
      accentLight: '#e3f2fd',
      accentHover: '#1565c0',
      success: '#2e7d32',
      successLight: '#e8f5e8',
      error: '#d32f2f',
      errorLight: '#ffebee',
      warning: '#ed6c02',
      warningLight: '#fff3e0',
      info: '#0288d1',
      infoLight: '#e1f5fe',
      
      gameBackground: '#f8f9fa',
      gameSurface: '#ffffff',
    },
    fonts: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
      mono: 'Consolas, "Courier New", Monaco, monospace',
    },
  },
  
  matrix: {
    name: 'matrix',
    displayName: 'Matrix',
    description: 'Enter the Matrix with green-on-black cyber aesthetics',
    colors: {
      primary: '#000000',
      secondary: '#001100',
      surface: '#002200',
      surfaceDarker: '#001100',
      surfaceHover: '#003300',
      card: '#003300',
      
      text: '#00ff00',
      textSecondary: '#00dd00',
      textMuted: '#00aa00',
      
      border: '#004400',
      borderLight: '#006600',
      accent: '#00ff41',
      accentLight: '#66ff66',
      accentHover: '#00cc33',
      success: '#00ff00',
      successLight: '#44ff44',
      error: '#ff0000',
      errorLight: '#ff4444',
      warning: '#ffff00',
      warningLight: '#ffff88',
      info: '#00ffff',
      infoLight: '#88ffff',
      
      gameBackground: '#001100',
      gameSurface: '#002200',
    },
    fonts: {
      primary: '"Courier New", Consolas, Monaco, monospace',
      mono: '"Courier New", Consolas, Monaco, monospace',
    },
  },
};

export class ThemeService {
  private static instance: ThemeService | null = null;
  private static readonly STORAGE_KEY = 'minigames_theme';
  private currentTheme: ThemeName = 'dark'; // Default theme
  private listeners: ((theme: ThemeName) => void)[] = [];

  private constructor() {
    this.loadTheme();
    this.applyTheme(this.currentTheme);
  }

  public static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Get current theme name
   */
  public getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  /**
   * Get current theme object
   */
  public getTheme(themeName?: ThemeName): Theme {
    return THEMES[themeName || this.currentTheme];
  }

  /**
   * Get all available themes
   */
  public getAllThemes(): Theme[] {
    return Object.values(THEMES);
  }

  /**
   * Set theme and persist to storage
   */
  public setTheme(themeName: ThemeName): void {
    if (!THEMES[themeName]) {
      console.warn(`Unknown theme: ${themeName}`);
      return;
    }

    this.currentTheme = themeName;
    this.saveTheme();
    this.applyTheme(themeName);
    this.notifyListeners();
  }

  /**
   * Subscribe to theme changes
   */
  public subscribe(callback: (theme: ThemeName) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Load theme from localStorage
   */
  private loadTheme(): void {
    try {
      const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
      if (stored && THEMES[stored as ThemeName]) {
        this.currentTheme = stored as ThemeName;
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    }
  }

  /**
   * Save theme to localStorage
   */
  private saveTheme(): void {
    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, this.currentTheme);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  }

  /**
   * Apply theme to document root
   */
  private applyTheme(themeName: ThemeName): void {
    const theme = THEMES[themeName];
    const root = document.documentElement;

    // Apply CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Apply font variables
    Object.entries(theme.fonts).forEach(([key, value]) => {
      root.style.setProperty(`--font-${key}`, value);
    });

    // Add theme class to body
    document.body.className = document.body.className
      .split(' ')
      .filter(className => !className.startsWith('theme-'))
      .concat(`theme-${themeName}`)
      .join(' ');

    console.log(`Theme applied: ${theme.displayName}`);
  }

  /**
   * Notify all listeners of theme change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentTheme);
      } catch (error) {
        console.error('Theme listener error:', error);
      }
    });
  }
}