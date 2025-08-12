/**
 * Ping Pong Game Logic
 */
import type { PingPongGameData, Ball, Paddle, Size, KeyState } from './types';

// Game constants
export const GAME_CONFIG = {
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
 * Create initial game state
 */
export function createInitialGameData(): PingPongGameData {
  const gameArea = {
    width: GAME_CONFIG.GAME_WIDTH,
    height: GAME_CONFIG.GAME_HEIGHT
  };

  const playerPaddle: Paddle = {
    x: GAME_CONFIG.PADDLE_MARGIN,
    y: (GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT) / 2,
    width: GAME_CONFIG.PADDLE_WIDTH,
    height: GAME_CONFIG.PADDLE_HEIGHT,
    speed: GAME_CONFIG.PADDLE_SPEED
  };

  const aiPaddle: Paddle = {
    x: GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.PADDLE_MARGIN - GAME_CONFIG.PADDLE_WIDTH,
    y: (GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.PADDLE_HEIGHT) / 2,
    width: GAME_CONFIG.PADDLE_WIDTH,
    height: GAME_CONFIG.PADDLE_HEIGHT,
    speed: GAME_CONFIG.PADDLE_SPEED
  };

  const ball: Ball = {
    x: (GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.BALL_SIZE) / 2,
    y: (GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.BALL_SIZE) / 2,
    width: GAME_CONFIG.BALL_SIZE,
    height: GAME_CONFIG.BALL_SIZE,
    velocity: {
      x: GAME_CONFIG.BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      y: GAME_CONFIG.BALL_INITIAL_SPEED * (Math.random() - 0.5)
    },
    speed: GAME_CONFIG.BALL_INITIAL_SPEED
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
export function updateAIPaddle(paddle: Paddle, ball: Ball, gameArea: Size): Paddle {
  const ballCenterY = ball.y + ball.height / 2;
  const paddleCenterY = paddle.y + paddle.height / 2;
  const difference = ballCenterY - paddleCenterY;
  
  let newY = paddle.y;
  
  // Move towards ball with some imperfection for playability
  if (Math.abs(difference) > 5) {
    if (difference > 0 && paddle.y + paddle.height < gameArea.height) {
      newY = Math.min(gameArea.height - paddle.height, paddle.y + GAME_CONFIG.AI_REACTION_SPEED);
    } else if (difference < 0 && paddle.y > 0) {
      newY = Math.max(0, paddle.y - GAME_CONFIG.AI_REACTION_SPEED);
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
    const speedMultiplier = 1 + GAME_CONFIG.BALL_SPEED_INCREMENT / newBall.speed;
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
    const speedMultiplier = 1 + GAME_CONFIG.BALL_SPEED_INCREMENT / newBall.speed;
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
export function resetBall(gameArea: Size): Ball {
  return {
    x: (gameArea.width - GAME_CONFIG.BALL_SIZE) / 2,
    y: (gameArea.height - GAME_CONFIG.BALL_SIZE) / 2,
    width: GAME_CONFIG.BALL_SIZE,
    height: GAME_CONFIG.BALL_SIZE,
    velocity: {
      x: GAME_CONFIG.BALL_INITIAL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      y: GAME_CONFIG.BALL_INITIAL_SPEED * (Math.random() - 0.5)
    },
    speed: GAME_CONFIG.BALL_INITIAL_SPEED
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