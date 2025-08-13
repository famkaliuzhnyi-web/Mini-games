/**
 * 2048 Game Type Definitions
 */

// Tile value type (powers of 2 from 2 to 2048, or 0 for empty)
export type TileValue = 0 | 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048;

// 4x4 grid of tiles
export type GameGrid = TileValue[][];

// Game directions for movement
export type Direction = 'up' | 'down' | 'left' | 'right';

// Game state data that extends Record<string, unknown>
export interface Game2048Data extends Record<string, unknown> {
  grid: GameGrid;
  score: number;
  bestScore: number;
  gameOver: boolean;
  gameWon: boolean;
  canUndo: boolean;
  previousGrid?: GameGrid;
  previousScore?: number;
  moves: number;
}

// Move result information
export interface MoveResult {
  moved: boolean;
  scoreIncrease: number;
  newGrid: GameGrid;
  gameOver: boolean;
  gameWon: boolean;
  animationData?: {
    movedTiles: Array<{ from: Position; to: Position; value: TileValue }>;
    mergedTiles: Array<{ position: Position; value: TileValue }>;
    newTilePosition?: Position;
  };
}

// Position on the grid
export interface Position {
  row: number;
  col: number;
}

// Tile animation state
export interface TileAnimationState {
  isNew: boolean;
  isMerged: boolean;
  isMoving: boolean;
  fromPosition?: Position;
  toPosition?: Position;
}

// Enhanced tile data with animation info
export interface AnimatedTile {
  value: TileValue;
  position: Position;
  animationState: TileAnimationState;
  key: string; // Unique key for React rendering
}