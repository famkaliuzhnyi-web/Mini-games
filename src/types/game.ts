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
  autoSaveIntervalMs: number;
}

// Game controller interface that all games should implement
export interface GameController<T = Record<string, unknown>> {
  config: GameConfig;
  getInitialState(): GameState<T>;
  validateState(state: GameState<T>): boolean;
  onSaveLoad?(state: GameState<T>): void;
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