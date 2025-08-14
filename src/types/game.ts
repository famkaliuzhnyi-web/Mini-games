/**
 * Core game type definitions for the Mini-games platform
 */

// Base game state that all games should extend
export interface BaseGameState {
  gameId: string;
  playerId: string;
  version: string;
  createdAt: string;
  lastModified: string;
}

// Generic game state interface
export interface GameState<T = Record<string, unknown>> extends BaseGameState {
  data: T;
  isComplete: boolean;
  score?: number;
}

// Save data structure
export interface GameSaveData<T = Record<string, unknown>> {
  gameId: string;
  playerId: string;
  gameState: GameState<T>;
  savedAt: string;
  version: string;
  autoSave: boolean;
}

// Game configuration
export interface GameConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  autoSaveEnabled: boolean;
  autoSaveIntervalMs: number; // Kept for compatibility, but now represents debounce time
}

/**
 * Game controller interface that all games must implement for platform integration
 * Provides standardized methods for game initialization, state management, and save/load operations
 */
export interface GameController<T = Record<string, unknown>> {
  /** Game configuration including metadata and save settings */
  config: GameConfig;
  
  /** 
   * Creates the initial state when starting a new game
   * @returns Fresh game state with default values
   */
  getInitialState(): GameState<T>;
  
  /** 
   * Validates that a game state is structurally correct and contains required fields
   * @param state - The game state to validate
   * @returns true if state is valid, false otherwise
   */
  validateState(state: GameState<T>): boolean;
  
  /** 
   * Optional callback invoked when a saved game is loaded
   * @param state - The loaded game state
   */
  onSaveLoad?(state: GameState<T>): void;
  
  /** 
   * Optional callback invoked when a save is deleted/dropped
   */
  onSaveDropped?(): void;
}

// Save operation result
export interface SaveResult {
  success: boolean;
  error?: string;
  savedAt?: string;
}

// Load operation result
export interface LoadResult<T = Record<string, unknown>> {
  success: boolean;
  gameState?: GameState<T>;
  error?: string;
  loadedAt?: string;
}

// Game registry for managing multiple games
export interface GameRegistry {
  [gameId: string]: GameController;
}

// Save management actions
export type SaveAction = 'save' | 'load' | 'drop' | 'auto-save';

// Save event for notifications
export interface SaveEvent<T = Record<string, unknown>> {
  action: SaveAction;
  gameId: string;
  success: boolean;
  gameState?: GameState<T>;
  error?: string;
  timestamp: string;
}

// Player data for saves
export interface PlayerProfile {
  id: string;
  name: string;
  joinedAt: string;
}