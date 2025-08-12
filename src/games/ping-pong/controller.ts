/**
 * Ping Pong Game Controller
 */
import type { GameController, GameConfig, GameState } from '../../types/game';
import type { PingPongGameData } from './types';
import { createInitialGameData } from './gameLogic';

export class PingPongGameController implements GameController<PingPongGameData> {
  public readonly config: GameConfig = {
    id: 'ping-pong',
    name: 'Ping Pong',
    description: 'Classic Pong game - control your paddle and beat the AI!',
    version: '1.0.0',
    autoSaveEnabled: true,
    autoSaveIntervalMs: 2000 // Save every 2 seconds during gameplay
  };

  /**
   * Get the initial state for a new game
   */
  getInitialState(): GameState<PingPongGameData> {
    const now = new Date().toISOString();
    
    return {
      gameId: this.config.id,
      playerId: '', // Will be set by the component
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: createInitialGameData(),
      isComplete: false,
      score: 0
    };
  }

  /**
   * Validate that the game state has the required structure
   */
  validateState(state: GameState<PingPongGameData>): boolean {
    try {
      const { data } = state;
      
      // Check required properties exist
      if (!data || typeof data !== 'object') return false;
      
      // Check game objects
      if (!data.playerPaddle || !data.aiPaddle || !data.ball || !data.gameArea) return false;
      
      // Check paddle structure
      const paddleProps = ['x', 'y', 'width', 'height', 'speed'] as const;
      if (!paddleProps.every(prop => typeof data.playerPaddle[prop] === 'number')) return false;
      if (!paddleProps.every(prop => typeof data.aiPaddle[prop] === 'number')) return false;
      
      // Check ball structure
      const ballProps = ['x', 'y', 'width', 'height', 'speed'] as const;
      if (!ballProps.every(prop => typeof data.ball[prop] === 'number')) return false;
      if (!data.ball.velocity || typeof data.ball.velocity.x !== 'number' || typeof data.ball.velocity.y !== 'number') return false;
      
      // Check game area
      if (typeof data.gameArea.width !== 'number' || typeof data.gameArea.height !== 'number') return false;
      
      // Check game state
      if (!['playing', 'paused', 'game-over'].includes(data.gameStatus)) return false;
      
      // Check score
      if (!data.score || typeof data.score.player !== 'number' || typeof data.score.ai !== 'number') return false;
      
      // Check statistics
      if (typeof data.gamesPlayed !== 'number' || 
          typeof data.gamesWon !== 'number' || 
          typeof data.gamesLost !== 'number' || 
          typeof data.totalPlayTime !== 'number') return false;
      
      // Check timestamps
      if (typeof data.gameStartTime !== 'string' || typeof data.lastUpdateTime !== 'string') return false;
      
      return true;
    } catch (error) {
      console.error('Error validating ping pong game state:', error);
      return false;
    }
  }

  /**
   * Handle when a save is loaded
   */
  onSaveLoad = (state: GameState<PingPongGameData>): void => {
    console.log(`Loaded Ping Pong game save from ${state.lastModified}`);
    console.log(`Current score: Player ${state.data.score.player} - AI ${state.data.score.ai}`);
    console.log(`Games played: ${state.data.gamesPlayed}, Won: ${state.data.gamesWon}, Lost: ${state.data.gamesLost}`);
  };

  /**
   * Handle when a save is dropped/deleted
   */
  onSaveDropped = (): void => {
    console.log('Ping Pong game save deleted');
  };
}