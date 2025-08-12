/**
 * Ping Pong Game Types
 */

// Game paddle position and size
export interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
}

// Ball position, velocity and properties
export interface Ball {
  x: number;
  y: number;
  vx: number; // velocity x
  vy: number; // velocity y
  radius: number;
  speed: number;
}

// Game field dimensions
export interface GameField {
  width: number;
  height: number;
}

// Player scores
export interface Score {
  player: number;
  ai: number;
}

// Game state
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'game-over';

// Game difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard';

// Ping pong specific game data that extends base game requirements
export interface PingPongGameData extends Record<string, unknown> {
  ball: Ball;
  playerPaddle: Paddle;
  aiPaddle: Paddle;
  gameField: GameField;
  score: Score;
  gameStatus: GameStatus;
  difficulty: Difficulty;
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  highScore: number;
  totalTimePlayed: number; // in seconds
  lastGameDuration: number; // in seconds
}

// Game constants
export interface GameConstants {
  PADDLE_SPEED: number;
  BALL_SPEED: number;
  BALL_SPEED_INCREASE: number;
  AI_REACTION_DELAY: number;
  WIN_SCORE: number;
  FIELD_WIDTH: number;
  FIELD_HEIGHT: number;
  PADDLE_WIDTH: number;
  PADDLE_HEIGHT: number;
  BALL_RADIUS: number;
}