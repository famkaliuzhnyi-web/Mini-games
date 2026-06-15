export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | null;
export type Board = Cell[][];

export interface Piece {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  x: number;
  y: number;
}

export interface LocalState {
  board: Board;
  piece: Piece;
  next: PieceType;
  hold: PieceType | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  status: 'playing' | 'game-over';
}

export interface PlayerBoard {
  playerId: string;
  playerName: string;
  board: Board;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
}

export interface TetrisGameState {
  status: 'waiting' | 'playing' | 'finished';
  boards: Record<string, PlayerBoard>;
  scores: Record<string, number>;
  winnerId: string | null;
  targetScore: number;
  playerOrder: string[];
  gameCount: number;
}

export type TetrisAction =
  | { type: 'start'; playerOrder: string[]; playerNames: Record<string, string> }
  | { type: 'board-update'; board: Board; score: number; level: number; lines: number }
  | { type: 'board-game-over'; score: number; board: Board };
