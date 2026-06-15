import type { IGame } from '../_contract/IGame';
import type { Player } from '../../core';
import type { TetrisGameState, TetrisAction, PlayerBoard } from './types';
import { TARGET_SCORE, emptyBoard } from './gameLogic';

export class TetrisGameLogic implements IGame<TetrisGameState, TetrisAction> {
  readonly id = 'tetris';

  initialState(_players: Player[]): TetrisGameState {
    return {
      status: 'waiting',
      boards: {},
      scores: {},
      winnerId: null,
      targetScore: TARGET_SCORE,
      playerOrder: [],
      gameCount: 0,
    };
  }

  reduce(state: TetrisGameState, action: TetrisAction, from: Player): TetrisGameState | null {
    switch (action.type) {
      case 'start':
        return this.applyStart(state, action);
      case 'board-update':
        return this.applyBoardUpdate(state, action, from);
      case 'board-game-over':
        return this.applyBoardGameOver(state, action, from);
    }
  }

  canAct(): boolean {
    return true;
  }

  validateSnapshot(raw: unknown): TetrisGameState {
    const s = raw as TetrisGameState;
    if (!s || typeof s !== 'object' || !('status' in s) || !('boards' in s)) {
      throw new Error('Invalid tetris snapshot');
    }
    return s;
  }

  private applyStart(
    state: TetrisGameState,
    action: { playerOrder: string[]; playerNames: Record<string, string> },
  ): TetrisGameState {
    const boards: Record<string, PlayerBoard> = {};
    for (const id of action.playerOrder) {
      boards[id] = {
        playerId: id,
        playerName: action.playerNames[id] ?? id,
        board: emptyBoard(),
        score: 0,
        level: 0,
        lines: 0,
        gameOver: false,
      };
    }
    return {
      ...state,
      status: 'playing',
      boards,
      scores: {},
      winnerId: null,
      playerOrder: action.playerOrder,
      gameCount: state.gameCount + 1,
    };
  }

  private applyBoardUpdate(
    state: TetrisGameState,
    action: { board: Board; score: number; level: number; lines: number },
    from: Player,
  ): TetrisGameState {
    if (state.status !== 'playing') return state;
    const existing = state.boards[from.id];
    const board: PlayerBoard = {
      playerId: from.id,
      playerName: existing?.playerName ?? from.name,
      board: action.board,
      score: action.score,
      level: action.level,
      lines: action.lines,
      gameOver: false,
    };
    const newBoards = { ...state.boards, [from.id]: board };
    const newScores = { ...state.scores, [from.id]: action.score };
    let winnerId = state.winnerId;
    let status: TetrisGameState['status'] = state.status;
    if (!winnerId && action.score >= state.targetScore) {
      winnerId = from.id;
      status = 'finished';
    }
    return { ...state, boards: newBoards, scores: newScores, winnerId, status };
  }

  private applyBoardGameOver(
    state: TetrisGameState,
    action: { score: number; board: Board },
    from: Player,
  ): TetrisGameState {
    const existing = state.boards[from.id];
    if (!existing) return state;
    const board: PlayerBoard = { ...existing, score: action.score, board: action.board, gameOver: true };
    const newBoards = { ...state.boards, [from.id]: board };
    const newScores = { ...state.scores, [from.id]: action.score };
    let winnerId = state.winnerId;
    let status: TetrisGameState['status'] = state.status;
    if (!winnerId) {
      const all = Object.values(newBoards);
      if (all.length > 0 && all.every(b => b.gameOver)) {
        status = 'finished';
        winnerId = all.reduce((a, b) => (b.score > a.score ? b : a)).playerId;
      }
    }
    return { ...state, boards: newBoards, scores: newScores, winnerId, status };
  }
}

// Workaround for the type reference in private methods
type Board = import('./types').Board;

export const tetrisGame = new TetrisGameLogic();
