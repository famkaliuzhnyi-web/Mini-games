/**
 * Tic-Tac-Toe Game Types
 */

// Player symbols
export type Player = 'X' | 'O';

// Cell state on the board
export type CellValue = Player | null;

// Board is a 3x3 grid
export type Board = [
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue],
  [CellValue, CellValue, CellValue]
];

// Game status
export type GameStatus = 'playing' | 'X-wins' | 'O-wins' | 'tie';

// Move history for replaying/undoing
export interface Move {
  row: number;
  col: number;
  player: Player;
  timestamp: string;
}

// Winning combination positions
export interface WinningCombination {
  positions: [number, number][]; // Array of [row, col] positions
  type: 'row' | 'column' | 'diagonal';
}

// Tic-Tac-Toe specific game data that extends base game requirements
export interface TicTacToeGameData extends Record<string, unknown> {
  board: Board;
  currentPlayer: Player;
  gameStatus: GameStatus;
  moveHistory: Move[];
  gamesPlayed: number;
  xWins: number;
  oWins: number;
  ties: number;
  winningCombination?: WinningCombination;
}