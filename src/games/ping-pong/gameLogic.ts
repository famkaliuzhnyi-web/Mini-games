/**
 * Ping Pong Game Logic
 */
import type { PingPongGameData, Ball, Paddle, Size, KeyState } from './types';

// Game constants
export const GAME_CONFIG = {
  BASE_WIDTH: 800,
  BASE_HEIGHT: 400,
  PADDLE_WIDTH_RATIO: 0.025, // 20/800
  PADDLE_HEIGHT_RATIO: 0.2, // 80/400
  PADDLE_SPEED_RATIO: 0.00625, // 5/800
  BALL_SIZE_RATIO: 0.01875, // 15/800
  BALL_INITIAL_SPEED_RATIO: 0.005, // 4/800
  BALL_SPEED_INCREMENT: 0.2,
  PADDLE_MARGIN_RATIO: 0.025, // 20/800
  AI_REACTION_SPEED_RATIO: 0.004375, // 3.5/800
  WINNING_SCORE: 11
};

// Legacy constants for backward compatibility
export const LEGACY_GAME_CONFIG = {
  GAME_WIDTH: 800,
  GAME_HEIGHT: 400,
  PADDLE_WIDTH: 20,
  PADDLE_HEIGHT: 80,
  PADDLE_SPEED: 5,
  BALL_SIZE: 15,
  BALL_INITIAL_SPEED: 4,
  BALL_SPEED_INCREMENT: 0.2,
  PADDLE_MARGIN: 20,
  AI_REACTION_SPEED: 3.5,
  WINNING_SCORE: 11
};

/**
 * Calculate responsive game dimensions based on available space
 */
export function calculateGameDimensions(maxWidth: number, maxHeight?: number): {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballSize: number;
  ballInitialSpeed: number;
  paddleMargin: number;
  aiReactionSpeed: number;
} {
  // Calculate dimensions maintaining 2:1 aspect ratio
  const aspectRatio = GAME_CONFIG.BASE_WIDTH / GAME_CONFIG.BASE_HEIGHT;
  let width = Math.min(maxWidth, GAME_CONFIG.BASE_WIDTH);
  let height = width / aspectRatio;
  
  // If height is constrained, recalculate based on height
  if (maxHeight && height > maxHeight) {
    height = Math.min(maxHeight, GAME_CONFIG.BASE_HEIGHT);
    width = height * aspectRatio;
  }

  // Ensure minimum playable size
  const minWidth = 300;
  const minHeight = 150;
  if (width < minWidth) {
    width = minWidth;
    height = minHeight;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
    paddleWidth: Math.round(width * GAME_CONFIG.PADDLE_WIDTH_RATIO),
    paddleHeight: Math.round(height * GAME_CONFIG.PADDLE_HEIGHT_RATIO),
    paddleSpeed: Math.max(1, width * GAME_CONFIG.PADDLE_SPEED_RATIO),
    ballSize: Math.round(width * GAME_CONFIG.BALL_SIZE_RATIO),
    ballInitialSpeed: Math.max(1, width * GAME_CONFIG.BALL_INITIAL_SPEED_RATIO),
    paddleMargin: Math.round(width * GAME_CONFIG.PADDLE_MARGIN_RATIO),
    aiReactionSpeed: Math.max(1, width * GAME_CONFIG.AI_REACTION_SPEED_RATIO)
  };
}

/**
 * Create initial game state with optional dimensions
 */
export function createInitialGameData(dimensions?: {
  width: number;
  height: number;
  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;
  ballSize: number;
  ballInitialSpeed: number;
  paddleMargin: number;
}): PingPongGameData {
  // Use provided dimensions or fall back to legacy config
  const dims = dimensions || {
    width: LEGACY_GAME_CONFIG.GAME_WIDTH,
    height: LEGACY_GAME_CONFIG.GAME_HEIGHT,
    paddleWidth: LEGACY_GAME_CONFIG.PADDLE_WIDTH,
    paddleHeight: LEGACY_GAME_CONFIG.PADDLE_HEIGHT,
    paddleSpeed: LEGACY_GAME_CONFIG.PADDLE_SPEED,
    ballSize: LEGACY_GAME_CONFIG.BALL_SIZE,
    ballInitialSpeed: LEGACY_GAME_CONFIG.BALL_INITIAL_SPEED,
    paddleMargin: LEGACY_GAME_CONFIG.PADDLE_MARGIN
  };

  const gameArea = {
    width: dims.width,
    height: dims.height
  };

  const playerPaddle: Paddle = {
    x: dims.paddleMargin,
    y: (dims.height - dims.paddleHeight) / 2,
    width: dims.paddleWidth,
    height: dims.paddleHeight,
    speed: dims.paddleSpeed
  };

  const aiPaddle: Paddle = {
    x: dims.width - dims.paddleMargin - dims.paddleWidth,
    y: (dims.height - dims.paddleHeight) / 2,
    width: dims.paddleWidth,
    height: dims.paddleHeight,
    speed: dims.paddleSpeed
  };

  const ball: Ball = {
    x: (dims.width - dims.ballSize) / 2,
    y: (dims.height - dims.ballSize) / 2,
    width: dims.ballSize,
    height: dims.ballSize,
    velocity: {
      x: dims.ballInitialSpeed * (Math.random() > 0.5 ? 1 : -1),
      y: dims.ballInitialSpeed * (Math.random() - 0.5)
    },
    speed: dims.ballInitialSpeed
  };

  return {
    playerPaddle,
    aiPaddle,
    ball,
    gameArea,
    gameStatus: 'playing',
    score: { player: 0, ai: 0 },
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalPlayTime: 0,
    gameStartTime: new Date().toISOString(),
    lastUpdateTime: new Date().toISOString()
  };
}

/**
 * Update player paddle position based on key state
 */
export function updatePlayerPaddle(paddle: Paddle, keyState: KeyState, gameArea: Size): Paddle {
  let newY = paddle.y;
  
  if ((keyState.up || keyState.w) && paddle.y > 0) {
    newY = Math.max(0, paddle.y - paddle.speed);
  }
  
  if ((keyState.down || keyState.s) && paddle.y + paddle.height < gameArea.height) {
    newY = Math.min(gameArea.height - paddle.height, paddle.y + paddle.speed);
  }

  return {
    ...paddle,
    y: newY
  };
}

/**
 * Update AI paddle position using simple AI logic
 */
export function updateAIPaddle(paddle: Paddle, ball: Ball, gameArea: Size, aiReactionSpeed?: number): Paddle {
  const ballCenterY = ball.y + ball.height / 2;
  const paddleCenterY = paddle.y + paddle.height / 2;
  const difference = ballCenterY - paddleCenterY;
  
  // Use provided reaction speed or calculate from game area
  const reactionSpeed = aiReactionSpeed || (gameArea.width * GAME_CONFIG.AI_REACTION_SPEED_RATIO);
  
  let newY = paddle.y;
  
  // Move towards ball with some imperfection for playability
  if (Math.abs(difference) > 5) {
    if (difference > 0 && paddle.y + paddle.height < gameArea.height) {
      newY = Math.min(gameArea.height - paddle.height, paddle.y + reactionSpeed);
    } else if (difference < 0 && paddle.y > 0) {
      newY = Math.max(0, paddle.y - reactionSpeed);
    }
  }

  return {
    ...paddle,
    y: newY
  };
}

/**
 * Check collision between ball and paddle
 */
export function checkPaddleCollision(ball: Ball, paddle: Paddle): boolean {
  return ball.x < paddle.x + paddle.width &&
         ball.x + ball.width > paddle.x &&
         ball.y < paddle.y + paddle.height &&
         ball.y + ball.height > paddle.y;
}

/**
 * Update ball position and handle collisions
 */
export function updateBall(ball: Ball, playerPaddle: Paddle, aiPaddle: Paddle, gameArea: Size): {
  ball: Ball;
  scored: 'player' | 'ai' | null;
} {
  const newBall = { ...ball };
  let scored: 'player' | 'ai' | null = null;

  // Update position
  newBall.x += newBall.velocity.x;
  newBall.y += newBall.velocity.y;

  // Top and bottom wall collisions
  if (newBall.y <= 0 || newBall.y + newBall.height >= gameArea.height) {
    newBall.velocity.y = -newBall.velocity.y;
    newBall.y = newBall.y <= 0 ? 0 : gameArea.height - newBall.height;
  }

  // Paddle collisions
  if (checkPaddleCollision(newBall, playerPaddle)) {
    // Hit player paddle - reverse X direction and add some Y variation
    newBall.velocity.x = Math.abs(newBall.velocity.x);
    const hitPosition = (newBall.y + newBall.height / 2 - playerPaddle.y) / playerPaddle.height;
    newBall.velocity.y = (hitPosition - 0.5) * newBall.speed * 1.5;
    newBall.x = playerPaddle.x + playerPaddle.width;
    
    // Increase ball speed slightly
    const speedMultiplier = 1 + GAME_CONFIG.BALL_SPEED_INCREMENT / 10; // Normalize increment
    newBall.velocity.x *= speedMultiplier;
    newBall.velocity.y *= speedMultiplier;
    newBall.speed *= speedMultiplier;
  } else if (checkPaddleCollision(newBall, aiPaddle)) {
    // Hit AI paddle - reverse X direction
    newBall.velocity.x = -Math.abs(newBall.velocity.x);
    const hitPosition = (newBall.y + newBall.height / 2 - aiPaddle.y) / aiPaddle.height;
    newBall.velocity.y = (hitPosition - 0.5) * newBall.speed * 1.5;
    newBall.x = aiPaddle.x - newBall.width;
    
    // Increase ball speed slightly
    const speedMultiplier = 1 + GAME_CONFIG.BALL_SPEED_INCREMENT / 10; // Normalize increment
    newBall.velocity.x *= speedMultiplier;
    newBall.velocity.y *= speedMultiplier;
    newBall.speed *= speedMultiplier;
  }

  // Check for scoring
  if (newBall.x <= 0) {
    scored = 'ai';
  } else if (newBall.x + newBall.width >= gameArea.width) {
    scored = 'player';
  }

  return { ball: newBall, scored };
}

/**
 * Reset ball to center position
 */
export function resetBall(gameArea: Size, ballSize?: number, ballInitialSpeed?: number): Ball {
  // Use provided values or calculate from game area
  const bSize = ballSize || Math.round(gameArea.width * GAME_CONFIG.BALL_SIZE_RATIO);
  const bSpeed = ballInitialSpeed || Math.max(1, gameArea.width * GAME_CONFIG.BALL_INITIAL_SPEED_RATIO);
  
  return {
    x: (gameArea.width - bSize) / 2,
    y: (gameArea.height - bSize) / 2,
    width: bSize,
    height: bSize,
    velocity: {
      x: bSpeed * (Math.random() > 0.5 ? 1 : -1),
      y: bSpeed * (Math.random() - 0.5)
    },
    speed: bSpeed
  };
}

/**
 * Check if game is over
 */
export function isGameOver(score: { player: number; ai: number }): boolean {
  return score.player >= GAME_CONFIG.WINNING_SCORE || score.ai >= GAME_CONFIG.WINNING_SCORE;
}

/**
 * Get game winner
 */
export function getWinner(score: { player: number; ai: number }): 'player' | 'ai' | null {
  if (score.player >= GAME_CONFIG.WINNING_SCORE) return 'player';
  if (score.ai >= GAME_CONFIG.WINNING_SCORE) return 'ai';
  return null;
}