/**
 * Tic-Tac-Toe Game Controller - manages game state and save/load functionality
 */

import type { GameController, GameState, GameConfig } from '../../types/game';
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
 * Tic-Tac-Toe Game Controller
 * Implements the GameController interface for save/load functionality
 */
export class TicTacToeGameController implements GameController<TicTacToeGameData> {
  config = TIC_TAC_TOE_CONFIG;

  /**
   * Get initial game state
   */
  getInitialState(): GameState<TicTacToeGameData> {
    const now = new Date().toISOString();
    return {
      gameId: 'tic-tac-toe',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        board: createEmptyBoard(),
        currentPlayer: 'X',
        gameStatus: 'playing',
        moveHistory: [],
        gamesPlayed: 0,
        xWins: 0,
        oWins: 0,
        ties: 0
      },
      isComplete: false,
      score: 0
    };
  }

  /**
   * Validate game state structure
   */
  validateState(state: GameState<TicTacToeGameData>): boolean {
    try {
      // Check if state exists and has required structure
      if (!state || !state.data) {
        return false;
      }

      const data = state.data;

      // Validate board structure (3x3 array)
      if (!Array.isArray(data.board) || data.board.length !== 3) {
        return false;
      }

      for (const row of data.board) {
        if (!Array.isArray(row) || row.length !== 3) {
          return false;
        }
        for (const cell of row) {
          if (cell !== null && cell !== 'X' && cell !== 'O') {
            return false;
          }
        }
      }

      // Validate other required fields
      if (data.currentPlayer !== 'X' && data.currentPlayer !== 'O') {
        return false;
      }

      if (!['playing', 'X-wins', 'O-wins', 'tie'].includes(data.gameStatus)) {
        return false;
      }

      if (!Array.isArray(data.moveHistory)) {
        return false;
      }

      // Validate statistics
      if (typeof data.gamesPlayed !== 'number' ||
          typeof data.xWins !== 'number' ||
          typeof data.oWins !== 'number' ||
          typeof data.ties !== 'number') {
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
   * Called when game state is loaded from save
   */
  onSaveLoad(state: GameState<TicTacToeGameData>): void {
    console.log('Tic-Tac-Toe game loaded:', {
      gameStatus: state.data.gameStatus,
      currentPlayer: state.data.currentPlayer,
      gamesPlayed: state.data.gamesPlayed,
      stats: {
        xWins: state.data.xWins,
        oWins: state.data.oWins,
        ties: state.data.ties
      }
    });
  }

  /**
   * Called when save data is dropped/deleted
   */
  onSaveDropped(): void {
    console.log('Tic-Tac-Toe game save data deleted');
  }
}

export default TicTacToeGameController;