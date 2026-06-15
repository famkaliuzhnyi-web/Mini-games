import type { IGame } from '../_contract/IGame';
import type { Player } from '../../core';
import type { Game2048Data, GameGrid, Direction } from './types';
import { moveGrid, copyGrid, getEmptyPositions, createInitialGrid, canMove } from './logic';

export type Game2048Action =
  | { type: 'move'; direction: Direction; newTile: { row: number; col: number; value: 2 | 4 } | null }
  | { type: 'toggle-guests'; guestsCanPlay: boolean }
  | { type: 'new-game'; grid: GameGrid };

export class Game2048Game implements IGame<Game2048Data, Game2048Action> {
  readonly id = 'game2048';

  initialState(players: Player[]): Game2048Data {
    return {
      grid: createInitialGrid(),
      score: 0,
      bestScore: 0,
      gameOver: false,
      gameWon: false,
      canUndo: false,
      moves: 0,
      guestsCanPlay: true,
      hostPlayerId: players[0]?.id,
    };
  }

  reduce(state: Game2048Data, action: Game2048Action, from: Player): Game2048Data | null {
    switch (action.type) {
      case 'move': {
        if (state.gameOver) return null;

        const moveResult = moveGrid(state.grid, action.direction);
        if (!moveResult.moved) return null;

        const newGrid = copyGrid(moveResult.newGrid);
        if (action.newTile) {
          newGrid[action.newTile.row][action.newTile.col] = action.newTile.value;
        }

        const newScore = state.score + moveResult.scoreIncrease;
        const gameOver = moveResult.gameOver || !canMove(newGrid);

        return {
          ...state,
          grid: newGrid,
          score: newScore,
          bestScore: Math.max(state.bestScore, newScore),
          gameOver,
          gameWon: state.gameWon || moveResult.gameWon,
          canUndo: false,
          moves: state.moves + 1,
        };
      }

      case 'toggle-guests': {
        if (from.id !== state.hostPlayerId) return null;
        return { ...state, guestsCanPlay: action.guestsCanPlay };
      }

      case 'new-game': {
        if (from.id !== state.hostPlayerId) return null;
        return {
          ...state,
          grid: action.grid,
          score: 0,
          gameOver: false,
          gameWon: false,
          canUndo: false,
          moves: 0,
        };
      }

      default:
        return null;
    }
  }

  canAct(state: Game2048Data, playerId: string): boolean {
    if (state.gameOver) return false;
    if (playerId === state.hostPlayerId) return true;
    return state.guestsCanPlay;
  }

  validateSnapshot(snapshot: unknown): Game2048Data {
    const s = snapshot as Game2048Data;
    if (!s || !Array.isArray(s.grid) || s.grid.length !== 4) {
      throw new Error('Invalid Game2048 snapshot');
    }
    return s;
  }
}

/** Pick a random empty cell from the given grid. Returns null if the grid is full. */
export function pickRandomTile(grid: GameGrid): { row: number; col: number; value: 2 | 4 } | null {
  const empty = getEmptyPositions(grid);
  if (empty.length === 0) return null;
  const pos = empty[Math.floor(Math.random() * empty.length)];
  return { row: pos.row, col: pos.col, value: Math.random() < 0.9 ? 2 : 4 };
}

export const game2048Game = new Game2048Game();
