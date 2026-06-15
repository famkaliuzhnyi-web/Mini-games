import type { IGame } from '../_contract/IGame';
import type { Player } from '../../core';
import type { Board, TicTacToeGameData } from './types';
import {
  createEmptyBoard,
  isValidMove,
  makeMove,
  getGameStatusWithCombination,
  getNextPlayer,
} from './gameLogic';

export interface TicTacToeAction {
  row: number;
  col: number;
}

/**
 * Pure game logic implementing the IGame contract.
 * No React — just data in, data out.
 *
 * Role assignment: first player in the players array is X (host), second is O (guest).
 * In single-player mode, pass a single-element array — both X and O are local.
 */
export class TicTacToeGame implements IGame<TicTacToeGameData, TicTacToeAction> {
  readonly id = 'tic-tac-toe';

  initialState(players: Player[]): TicTacToeGameData {
    // Shuffle so X and O are randomly assigned each new game
    const shuffled = players.length > 1
      ? [...players].sort(() => Math.random() - 0.5)
      : players;
    return {
      board: createEmptyBoard(),
      currentPlayer: 'X',
      gameStatus: 'playing',
      moveHistory: [],
      gamesPlayed: 0,
      xWins: 0,
      oWins: 0,
      ties: 0,
      winningCombination: undefined,
      gameMode: players.length > 1 ? 'multiplayer' : 'single-player',
      multiplayer: {
        isMultiplayer: players.length > 1,
        xPlayerId: shuffled[0]?.id,
        oPlayerId: shuffled[1]?.id,
      },
    };
  }

  reduce(state: TicTacToeGameData, action: TicTacToeAction, from: Player): TicTacToeGameData | null {
    if (state.gameStatus !== 'playing') return null;
    if (!isValidMove(state.board, action.row, action.col)) return null;

    // In multiplayer, verify it's this player's turn
    if (state.multiplayer.isMultiplayer) {
      const expectedId =
        state.currentPlayer === 'X'
          ? state.multiplayer.xPlayerId
          : state.multiplayer.oPlayerId;
      if (from.id !== expectedId) return null;
    }

    const newBoard = makeMove(state.board, action.row, action.col, state.currentPlayer);
    const { status, winningCombination } = getGameStatusWithCombination(newBoard);

    return {
      ...state,
      board: newBoard,
      currentPlayer: getNextPlayer(state.currentPlayer),
      gameStatus: status,
      winningCombination,
      moveHistory: [
        ...state.moveHistory,
        { row: action.row, col: action.col, player: state.currentPlayer, timestamp: new Date().toISOString() },
      ],
    };
  }

  canAct(state: TicTacToeGameData, playerId: string): boolean {
    if (state.gameStatus !== 'playing') return false;
    if (!state.multiplayer.isMultiplayer) return true;

    const expectedId =
      state.currentPlayer === 'X'
        ? state.multiplayer.xPlayerId
        : state.multiplayer.oPlayerId;

    return playerId === expectedId;
  }

  validateSnapshot(snapshot: unknown): TicTacToeGameData {
    const s = snapshot as TicTacToeGameData;
    if (!s || !Array.isArray(s.board) || s.board.length !== 3) {
      throw new Error('Invalid TicTacToe snapshot');
    }
    return s;
  }
}

export function buildInitialStats(prev?: TicTacToeGameData): Pick<TicTacToeGameData, 'gamesPlayed' | 'xWins' | 'oWins' | 'ties'> {
  if (!prev) return { gamesPlayed: 0, xWins: 0, oWins: 0, ties: 0 };

  const finished = prev.gameStatus !== 'playing';
  return {
    gamesPlayed: prev.gamesPlayed + (finished ? 1 : 0),
    xWins: prev.xWins + (prev.gameStatus === 'X-wins' ? 1 : 0),
    oWins: prev.oWins + (prev.gameStatus === 'O-wins' ? 1 : 0),
    ties: prev.ties + (prev.gameStatus === 'tie' ? 1 : 0),
  };
}

// Singleton — no state, safe to share
export const ticTacToeGame = new TicTacToeGame();

// Helpers re-exported so consumers only need one import
export { createEmptyBoard } from './gameLogic';
export type { Board };
