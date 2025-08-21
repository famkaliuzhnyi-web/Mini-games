/**
 * Tic-Tac-Toe Game Controller - Refactored to use BaseGameController
 * 
 * This is an example of how to refactor existing game controllers to use
 * the new shared BaseGameController class and utilities.
 */

import type { GameConfig } from '../../types/game';
import { BaseGameController } from '../../components/game/BaseGameController';
import type { TicTacToeGameData } from './types';
import { createEmptyBoard } from './gameLogic';

// Tic-Tac-Toe game configuration
const TIC_TAC_TOE_CONFIG: GameConfig = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  description: 'Classic 3x3 grid game - get three in a row to win!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 15000 // Save every 15 seconds
};

/**
 * Refactored Tic-Tac-Toe Game Controller
 * Now extends BaseGameController for shared functionality
 */
export class RefactoredTicTacToeGameController extends BaseGameController<TicTacToeGameData> {
  public readonly config = TIC_TAC_TOE_CONFIG;

  /**
   * Get initial game-specific data
   * Only need to implement game-specific logic now
   */
  protected getInitialGameData(): TicTacToeGameData {
    return {
      board: createEmptyBoard(),
      currentPlayer: 'X',
      gameStatus: 'playing',
      moveHistory: [],
      gamesPlayed: 0,
      xWins: 0,
      oWins: 0,
      ties: 0,
      gameMode: 'single-player',
      multiplayer: {
        isMultiplayer: false
      }
    };
  }

  /**
   * Validate game-specific data structure
   * Base validation is handled by parent class
   */
  protected validateGameData(data: TicTacToeGameData): boolean {
    try {
      // Validate board structure (3x3 array)
      if (!this.isValidArray(data.board, 3)) {
        return false;
      }

      for (const row of data.board) {
        if (!this.isValidArray(row, 3)) {
          return false;
        }
        for (const cell of row) {
          if (cell !== null && cell !== 'X' && cell !== 'O') {
            return false;
          }
        }
      }

      // Validate current player
      if (data.currentPlayer !== 'X' && data.currentPlayer !== 'O') {
        return false;
      }

      // Validate game status
      if (!['playing', 'X-wins', 'O-wins', 'tie'].includes(data.gameStatus)) {
        return false;
      }

      // Validate move history
      if (!Array.isArray(data.moveHistory)) {
        return false;
      }

      // Validate statistics using helper method
      const statsValid = [
        this.isValidNumber(data.gamesPlayed, 0),
        this.isValidNumber(data.xWins, 0),
        this.isValidNumber(data.oWins, 0),
        this.isValidNumber(data.ties, 0)
      ].every(Boolean);

      if (!statsValid) {
        return false;
      }

      // Validate game mode (optional for backward compatibility)
      if (data.gameMode && !['single-player', 'multiplayer'].includes(data.gameMode)) {
        return false;
      }

      // Validate multiplayer fields
      if (data.multiplayer && typeof data.multiplayer !== 'object') {
        return false;
      }

      if (data.multiplayer && typeof data.multiplayer.isMultiplayer !== 'boolean') {
        return false;
      }

      // Validate that win stats don't exceed games played
      if (data.xWins + data.oWins + data.ties > data.gamesPlayed) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Enhanced save load callback with more detailed logging
   */
  onSaveLoad(state: import('../../types/game').GameState<TicTacToeGameData>): void {
    // Call parent implementation for basic logging
    super.onSaveLoad?.(state);
    
    // Add game-specific logging
    console.log('Tic-Tac-Toe game details:', {
      gameStatus: state.data.gameStatus,
      currentPlayer: state.data.currentPlayer,
      gamesPlayed: state.data.gamesPlayed,
      winRatio: state.data.gamesPlayed > 0 ? 
        (state.data.xWins + state.data.oWins) / state.data.gamesPlayed : 0,
      stats: {
        xWins: state.data.xWins,
        oWins: state.data.oWins,
        ties: state.data.ties
      }
    });
  }

  /**
   * Example of using shared utility methods
   * This method shows how the shared functionality simplifies game state updates
   */
  updateGameStats(
    currentState: import('../../types/game').GameState<TicTacToeGameData>,
    gameResult: 'X-wins' | 'O-wins' | 'tie'
  ): import('../../types/game').GameState<TicTacToeGameData> {
    const newData: Partial<TicTacToeGameData> = {
      gamesPlayed: currentState.data.gamesPlayed + 1,
      gameStatus: gameResult
    };

    // Update win counts based on result
    switch (gameResult) {
      case 'X-wins':
        newData.xWins = currentState.data.xWins + 1;
        break;
      case 'O-wins':
        newData.oWins = currentState.data.oWins + 1;
        break;
      case 'tie':
        newData.ties = currentState.data.ties + 1;
        break;
    }

    // Use parent's helper method to create updated state
    return this.createUpdatedState(currentState, newData, {
      isComplete: true,
      score: currentState.data.gamesPlayed + 1 // Simple scoring: games completed
    });
  }
}

// Export both original and refactored for comparison
export { TicTacToeGameController } from './controller';
export const refactoredTicTacToeController = new RefactoredTicTacToeGameController();