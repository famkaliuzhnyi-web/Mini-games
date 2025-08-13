/**
 * Application-wide constants and configuration values
 * Centralizes magic numbers and configuration for easier maintenance
 */

// Game configuration
export const GAME_DEFAULTS = {
  AUTO_SAVE_INTERVAL_MS: 5000,
  WEBSOCKET_RECONNECT_DELAY: 1000,
  WEBSOCKET_MAX_RECONNECT_ATTEMPTS: 5,
} as const;

// UI constants
export const UI_CONSTANTS = {
  DEBOUNCE_DELAY_MS: 300,
  ANIMATION_DURATION_MS: 200,
  TOAST_DURATION_MS: 3000,
} as const;

// Local storage keys (matching existing usage)
export const STORAGE_KEYS = {
  USER_PROFILE: 'minigames_user_profile',
  GAME_SAVES: 'minigames_saves',
  PWA_INSTALL_PROMPTED: 'minigames_pwa_prompted',
} as const;

// API endpoints (if any)
export const API_ENDPOINTS = {
  WEBSOCKET_URL: process.env.NODE_ENV === 'production' 
    ? 'wss://example.com/ws' 
    : 'ws://localhost:8080/ws',
} as const;

// Game categories and metadata
export const GAME_CATEGORIES = {
  PUZZLE: 'Puzzle',
  ARCADE: 'Arcade',
  STRATEGY: 'Strategy',
  CLASSIC: 'Classic',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  GAME_LOAD_FAILED: 'Failed to load game. Please try again.',
  SAVE_FAILED: 'Failed to save game progress.',
  CONNECTION_LOST: 'Connection lost. Attempting to reconnect...',
  INVALID_GAME_STATE: 'Invalid game state detected.',
} as const;