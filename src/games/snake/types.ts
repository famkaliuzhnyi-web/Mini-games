export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Pos {
  x: number;
  y: number;
}

export interface PlayerSnake {
  playerId: string;
  playerName: string;
  color: string;
  segments: Pos[];       // [0] is head
  direction: Direction;
  nextDirection: Direction;
  alive: boolean;
  deadTick: number | null;
}

export interface SnakeGameState {
  snakes: Record<string, PlayerSnake>;
  food: Pos[];
  width: number;
  height: number;
  status: 'waiting' | 'playing' | 'game-over';
  scores: Record<string, number>;
  tick: number;
}

export type SnakeAction =
  | { type: 'change-direction'; direction: Direction }
  | { type: 'tick'; newFood: Pos[] }
  | { type: 'start'; snakeStarts: Record<string, SnakeStart>; food: Pos[] }
  | { type: 'new-game'; snakeStarts: Record<string, SnakeStart>; food: Pos[] };

export interface SnakeStart {
  segments: Pos[];
  direction: Direction;
  color: string;
  playerName: string;
}
