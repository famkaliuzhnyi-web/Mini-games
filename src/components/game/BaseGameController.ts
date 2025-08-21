/**
 * Base Game Controller - Abstract class providing common game controller functionality
 * 
 * This class implements the GameController interface and provides default implementations
 * for common patterns used across games, reducing code duplication and ensuring consistency.
 */

import type { GameController, GameState, GameConfig } from '../../types/game';

/**
 * Abstract base class for game controllers
 * Provides common functionality and patterns used across all games
 */
export abstract class BaseGameController<T extends Record<string, unknown>> 
  implements GameController<T> {
  
  public abstract readonly config: GameConfig;

  /**
   * Creates the initial state for a new game
   * Subclasses should override getInitialGameData() to provide game-specific data
   */
  getInitialState(): GameState<T> {
    const now = new Date().toISOString();
    
    return {
      gameId: this.config.id,
      playerId: '', // Will be set by the component
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: this.getInitialGameData(),
      isComplete: false,
      score: 0
    };
  }

  /**
   * Abstract method to get initial game-specific data
   * Must be implemented by subclasses
   */
  protected abstract getInitialGameData(): T;

  /**
   * Validates basic game state structure
   * Subclasses can override to add game-specific validation
   */
  validateState(state: GameState<T>): boolean {
    try {
      // Validate base structure
      if (!state || typeof state !== 'object') {
        return false;
      }

      // Validate required base fields
      if (!state.gameId || typeof state.gameId !== 'string') {
        return false;
      }

      if (!state.playerId || typeof state.playerId !== 'string') {
        return false;
      }

      if (!state.version || typeof state.version !== 'string') {
        return false;
      }

      if (!state.createdAt || typeof state.createdAt !== 'string') {
        return false;
      }

      if (!state.lastModified || typeof state.lastModified !== 'string') {
        return false;
      }

      if (!state.data || typeof state.data !== 'object') {
        return false;
      }

      if (typeof state.isComplete !== 'boolean') {
        return false;
      }

      if (state.score !== undefined && typeof state.score !== 'number') {
        return false;
      }

      // Validate game ID matches
      if (state.gameId !== this.config.id) {
        return false;
      }

      // Call game-specific validation
      return this.validateGameData(state.data);
    } catch (error) {
      console.error(`Error validating ${this.config.name} game state:`, error);
      return false;
    }
  }

  /**
   * Abstract method for validating game-specific data
   * Must be implemented by subclasses
   */
  protected abstract validateGameData(data: T): boolean;

  /**
   * Default implementation for save load callback
   * Subclasses can override for custom behavior
   */
  onSaveLoad?(state: GameState<T>): void {
    console.log(`${this.config.name} game loaded:`, {
      gameId: state.gameId,
      score: state.score,
      isComplete: state.isComplete,
      lastModified: state.lastModified
    });
  }

  /**
   * Default implementation for save dropped callback
   * Subclasses can override for custom behavior
   */
  onSaveDropped?(): void {
    console.log(`${this.config.name} game save data deleted`);
  }

  /**
   * Helper method to create a new game state with updated data
   */
  protected createUpdatedState(
    currentState: GameState<T>, 
    newData: Partial<T>,
    options: {
      score?: number;
      isComplete?: boolean;
    } = {}
  ): GameState<T> {
    return {
      ...currentState,
      data: {
        ...currentState.data,
        ...newData
      },
      score: options.score ?? currentState.score,
      isComplete: options.isComplete ?? currentState.isComplete,
      lastModified: new Date().toISOString()
    };
  }

  /**
   * Helper method to validate timestamps
   */
  protected isValidTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime());
    } catch {
      return false;
    }
  }

  /**
   * Helper method to validate numeric range
   */
  protected isValidNumber(
    value: unknown, 
    min: number = Number.MIN_SAFE_INTEGER, 
    max: number = Number.MAX_SAFE_INTEGER
  ): boolean {
    return typeof value === 'number' && 
           !isNaN(value) && 
           value >= min && 
           value <= max;
  }

  /**
   * Helper method to validate array structure
   */
  protected isValidArray<U>(
    value: unknown, 
    expectedLength?: number,
    itemValidator?: (item: unknown) => boolean
  ): value is U[] {
    if (!Array.isArray(value)) {
      return false;
    }

    if (expectedLength !== undefined && value.length !== expectedLength) {
      return false;
    }

    if (itemValidator) {
      return value.every(itemValidator);
    }

    return true;
  }
}