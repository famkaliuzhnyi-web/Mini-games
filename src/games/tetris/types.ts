/**
 * Tetris game type definitions
 */

// Cell value in the game grid (including ghost piece)
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | -1; // 0 = empty, 1-7 = different piece types, -1 = ghost

// Game grid (20 rows x 10 columns)
export type TetrisGrid = CellValue[][];

// Tetromino piece types
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// Tetromino piece shape (4x4 matrix)
export type PieceShape = number[][];

// Position on the grid
export interface Position {
  x: number;
  y: number;
}

// Active piece state
export interface ActivePiece {
  type: PieceType;
  shape: PieceShape;
  position: Position;
  rotation: number; // 0, 1, 2, 3 (0°, 90°, 180°, 270°)
}

// Game statistics
export interface GameStats {
  score: number;
  level: number;
  lines: number;
  pieces: number;
  elapsedTime: number; // seconds since game start
}

// Tetris-specific game data that extends the platform's game state
export interface TetrisGameData extends Record<string, unknown> {
  grid: TetrisGrid;
  activePiece: ActivePiece | null;
  ghostPiece: ActivePiece | null; // Preview where piece will land
  holdPiece: PieceType | null; // Currently held piece
  nextPieces: PieceType[]; // Queue of upcoming pieces (up to 6)
  stats: GameStats;
  gameOver: boolean;
  paused: boolean;
  lastMoveTime: number;
  dropSpeed: number; // milliseconds between automatic drops
  canHold: boolean; // Can only hold once per piece
  gameStartTime: number; // For timer display
  dangerZoneActive: boolean; // Warning when pieces get too high
}

// Movement directions
export type MoveDirection = 'left' | 'right' | 'down';
export type RotationDirection = 'clockwise' | 'counterclockwise';

// Game actions
export type TetrisAction = 
  | { type: 'MOVE'; direction: MoveDirection }
  | { type: 'ROTATE'; direction: RotationDirection }
  | { type: 'DROP' }
  | { type: 'HOLD' } // Hold current piece
  | { type: 'PAUSE' }
  | { type: 'UNPAUSE' }
  | { type: 'RESET' }
  | { type: 'TICK' }; // For automatic piece falling