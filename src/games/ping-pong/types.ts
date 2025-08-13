/**
 * Ping Pong Game Type Definitions
 */

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Velocity {
  x: number;
  y: number;
}

export interface Paddle extends Position, Size {
  speed: number;
}

export interface Ball extends Position, Size {
  velocity: Velocity;
  speed: number;
}

export type GameStatus = 'playing' | 'paused' | 'game-over';

export interface Score {
  player: number;
  ai: number;
}

export interface PingPongGameData extends Record<string, unknown> {
  // Game objects
  playerPaddle: Paddle;
  aiPaddle: Paddle;
  ball: Ball;
  gameArea: Size;
  
  // Game state
  gameStatus: GameStatus;
  score: Score;
  
  // Game statistics
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalPlayTime: number; // in seconds
  
  // Current game tracking
  gameStartTime: string;
  lastUpdateTime: string;
}

export interface KeyState {
  up: boolean;
  down: boolean;
  w: boolean;
  s: boolean;
  space: boolean;
}

export interface TouchState {
  isActive: boolean;
  startY: number;
  currentY: number;
  paddleStartY: number;
}