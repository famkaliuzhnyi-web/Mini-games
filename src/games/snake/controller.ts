/**
 * Snake Game Controller - Platform integration
 */

import type { GameController, GameState } from '../../types/game';
import type { SnakeGameData } from './types';
import { createInitialGameState, DEFAULT_CONFIG } from './logic';

export class SnakeGameController implements GameController<SnakeGameData> {
  public readonly config = {
    id: 'snake',
    name: 'Snake',
    description: 'Classic snake game with multiplayer battles',
    version: '1.0.0',
    autoSaveEnabled: true,
    autoSaveIntervalMs: 2000, // Auto-save every 2 seconds
  };

  /**
   * Creates initial game state for a new Snake game
   */
  getInitialState(): GameState<SnakeGameData> {
    const gameData = createInitialGameState('player-1', DEFAULT_CONFIG, 'single');
    
    return {
      gameId: this.config.id,
      playerId: 'player-1', // Will be overridden by platform
      version: this.config.version,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      data: gameData,
      isComplete: false,
      score: 0
    };
  }

  /**
   * Validates that a game state has the correct structure
   */
  validateState(state: GameState<SnakeGameData>): boolean {
    try {
      if (!state.data) return false;
      
      const data = state.data;
      
      // Check required properties
      if (!data.grid || !Array.isArray(data.grid)) return false;
      if (!data.snakes || !Array.isArray(data.snakes)) return false;
      if (!data.food || !Array.isArray(data.food)) return false;
      if (!data.config || typeof data.config !== 'object') return false;
      if (!data.stats || typeof data.stats !== 'object') return false;
      
      // Check grid dimensions
      const { gridHeight, gridWidth } = data.config;
      if (data.grid.length !== gridHeight) return false;
      if (data.grid[0]?.length !== gridWidth) return false;
      
      // Check that all snakes have required properties
      for (const snake of data.snakes) {
        if (!snake.id || !snake.segments || !Array.isArray(snake.segments)) return false;
        if (!snake.direction || typeof snake.alive !== 'boolean') return false;
        if (typeof snake.score !== 'number') return false;
      }

      // Check that all food items have positions
      for (const food of data.food) {
        if (typeof food.x !== 'number' || typeof food.y !== 'number') return false;
        if (typeof food.value !== 'number') return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Called when a saved game is loaded
   */
  onSaveLoad?(state: GameState<SnakeGameData>): void {
    // Update elapsed time if game was saved while running
    if (state.data.stats && !state.data.gameOver && !state.data.isPaused) {
      const now = Date.now();
      const timeSinceSave = now - new Date(state.lastModified).getTime();
      state.data.stats.elapsedTime += Math.floor(timeSinceSave / 1000);
    }
  }

  /**
   * Called when a save is dropped/deleted
   */
  onSaveDropped?(): void {
    // Cleanup any resources if needed
    // For Snake game, no special cleanup is required
  }
}

// Export singleton instance
export const snakeGameController = new SnakeGameController();