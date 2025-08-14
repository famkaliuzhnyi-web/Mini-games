/**
 * Snake game type definitions
 */

// Position on the grid
export interface Position {
  x: number;
  y: number;
}

// Snake segment
export interface SnakeSegment extends Position {
  id?: string; // Optional identifier for the segment
}

// Movement directions
export type Direction = 'up' | 'down' | 'left' | 'right';

// Food item
export interface Food extends Position {
  value: number; // Points value
}

// Individual snake state
export interface Snake {
  id: string; // Player ID who owns this snake
  segments: SnakeSegment[];
  direction: Direction;
  nextDirection?: Direction; // Buffered direction change
  alive: boolean;
  color: string; // Visual distinction
  score: number;
}

// Game grid cell types
export type CellType = 'empty' | 'snake' | 'food' | 'wall';

// Game grid cell
export interface GridCell {
  type: CellType;
  snakeId?: string; // Which snake owns this cell (if type is 'snake')
  food?: Food; // Food data (if type is 'food')
}

// Game configuration
export interface GameConfig {
  gridWidth: number;
  gridHeight: number;
  initialSnakeLength: number;
  moveSpeed: number; // milliseconds between moves
  maxPlayers: number;
}

// Game statistics
export interface GameStats {
  totalFood: number;
  gameStartTime: number;
  elapsedTime: number;
}

// Snake game data that extends the platform's game state
export interface SnakeGameData extends Record<string, unknown> {
  grid: GridCell[][];
  snakes: Snake[];
  food: Food[];
  config: GameConfig;
  stats: GameStats;
  gameOver: boolean;
  isPaused: boolean;
  winner?: string; // Player ID of the winner (if any)
  gameMode: 'single' | 'multiplayer';
  currentTick: number; // For synchronized multiplayer updates
}

// Game actions
export type SnakeAction = 
  | { type: 'CHANGE_DIRECTION'; playerId: string; direction: Direction }
  | { type: 'TICK' } // Game loop update
  | { type: 'PAUSE' }
  | { type: 'UNPAUSE' }
  | { type: 'RESET' }
  | { type: 'ADD_PLAYER'; playerId: string; name: string }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'SPAWN_FOOD'; position: Position; value?: number };

// Collision types
export type CollisionType = 'wall' | 'self' | 'other_snake' | 'food';

// Game events for multiplayer synchronization
export interface SnakeGameEvent {
  type: 'snake_died' | 'food_eaten' | 'game_over' | 'score_update';
  playerId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}