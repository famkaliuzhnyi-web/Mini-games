export type ThemeName = 'cyberpunk' | 'xbox' | 'playstation' | 'nintendo' | 'steam';

export interface Theme {
  name: ThemeName;
  displayName: string;
  description: string;
  swatchBg: string;
  swatchAccent: string;
}

export const THEMES: Record<ThemeName, Theme> = {
  cyberpunk: {
    name: 'cyberpunk',
    displayName: 'Cyberpunk',
    description: 'Dark military terminal. Amber glow. Zero mercy.',
    swatchBg: '#0d0e10',
    swatchAccent: '#c8a84b',
  },
  xbox: {
    name: 'xbox',
    displayName: 'Xbox',
    description: 'Dark charcoal. Xbox green. Clean edges.',
    swatchBg: '#111111',
    swatchAccent: '#107c10',
  },
  playstation: {
    name: 'playstation',
    displayName: 'PlayStation',
    description: 'Deep navy. PlayStation blue. Premium feel.',
    swatchBg: '#0a0e14',
    swatchAccent: '#0075ce',
  },
  nintendo: {
    name: 'nintendo',
    displayName: 'Nintendo',
    description: 'Bright and friendly. Nintendo red. Pill buttons.',
    swatchBg: '#f5f5f5',
    swatchAccent: '#e60012',
  },
  steam: {
    name: 'steam',
    displayName: 'Steam',
    description: 'Dark navy-blue. Steam blue. Familiar.',
    swatchBg: '#1b2838',
    swatchAccent: '#1b9fe8',
  },
};

export class ThemeService {
  private static instance: ThemeService | null = null;
  private static readonly STORAGE_KEY = 'minigames_theme';
  private currentTheme: ThemeName = 'cyberpunk';
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

  public getCurrentTheme(): ThemeName {
    return this.currentTheme;
  }

  public getTheme(themeName?: ThemeName): Theme {
    return THEMES[themeName ?? this.currentTheme];
  }

  public getAllThemes(): Theme[] {
    return Object.values(THEMES);
  }

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

  public subscribe(callback: (theme: ThemeName) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  private loadTheme(): void {
    try {
      const stored = localStorage.getItem(ThemeService.STORAGE_KEY);
      if (stored && THEMES[stored as ThemeName]) {
        this.currentTheme = stored as ThemeName;
      }
    } catch {}
  }

  private saveTheme(): void {
    try {
      localStorage.setItem(ThemeService.STORAGE_KEY, this.currentTheme);
    } catch {}
  }

  private applyTheme(themeName: ThemeName): void {
    document.documentElement.dataset.theme = themeName;
  }

  private notifyListeners(): void {
    this.listeners.forEach(cb => {
      try { cb(this.currentTheme); } catch {}
    });
  }
}
