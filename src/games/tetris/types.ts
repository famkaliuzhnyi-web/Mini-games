/**
 * Tetris Game Type Definitions
 */

// Tetris piece types
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Game board cell - 0 for empty, PieceType for filled
export type CellValue = 0 | PieceType;

// Game board (20 rows x 10 columns)
export type GameBoard = CellValue[][];

// Position on the game board
export interface Position {
  row: number;
  col: number;
}

// Tetris piece shape (4x4 matrix)
export type PieceShape = number[][];

// Active tetris piece
export interface TetrisPiece {
  type: PieceType;
  shape: PieceShape;
  position: Position;
  rotation: number; // 0, 1, 2, 3 for 4 rotations
}

// Game state data that extends Record<string, unknown>
export interface TetrisData extends Record<string, unknown> {
  board: GameBoard;
  activePiece: TetrisPiece | null;
  nextPiece: PieceType;
  score: number;
  level: number;
  lines: number;
  gameOver: boolean;
  isPaused: boolean;
  dropTime: number; // Time until next automatic drop
}

// Game actions
export type TetrisAction = 
  | { type: 'MOVE_LEFT' }
  | { type: 'MOVE_RIGHT' }
  | { type: 'MOVE_DOWN' }
  | { type: 'ROTATE' }
  | { type: 'HARD_DROP' }
  | { type: 'PAUSE' }
  | { type: 'NEW_GAME' }
  | { type: 'TICK' }; // Automatic game tick

// Tetris piece definitions
export interface PieceDefinition {
  type: PieceType;
  shapes: PieceShape[]; // 4 rotation states
  color: string;
}

// Move result information
export interface MoveResult {
  success: boolean;
  newPosition?: Position;
  clearedLines?: number[];
  gameOver?: boolean;
}