/**
 * Ping Pong Game Logic
 */
import type { Ball, Paddle, GameField, Difficulty } from './types';
import { GAME_CONSTANTS } from './controller';

/**
 * Check if ball collides with paddle
 */
export function checkPaddleCollision(ball: Ball, paddle: Paddle): boolean {
  const ballLeft = ball.x - ball.radius;
  const ballRight = ball.x + ball.radius;
  const ballTop = ball.y - ball.radius;
  const ballBottom = ball.y + ball.radius;
  
  return ballRight >= paddle.x &&
         ballLeft <= paddle.x + paddle.width &&
         ballBottom >= paddle.y &&
         ballTop <= paddle.y + paddle.height;
}

/**
 * Update ball position and handle collisions
 */
export function updateBall(ball: Ball, playerPaddle: Paddle, aiPaddle: Paddle, gameField: GameField): {
  ball: Ball;
  playerScored: boolean;
  aiScored: boolean;
} {
  const newBall = { ...ball };
  let playerScored = false;
  let aiScored = false;

  // Update ball position
  newBall.x += newBall.vx;
  newBall.y += newBall.vy;

  // Top and bottom wall collisions
  if (newBall.y - newBall.radius <= 0 || newBall.y + newBall.radius >= gameField.height) {
    newBall.vy = -newBall.vy;
    // Ensure ball stays within bounds
    newBall.y = Math.max(newBall.radius, Math.min(gameField.height - newBall.radius, newBall.y));
  }

  // Left wall collision (AI scores)
  if (newBall.x - newBall.radius <= 0) {
    aiScored = true;
    return { ball: newBall, playerScored, aiScored };
  }

  // Right wall collision (Player scores)
  if (newBall.x + newBall.radius >= gameField.width) {
    playerScored = true;
    return { ball: newBall, playerScored, aiScored };
  }

  // Paddle collisions
  if (checkPaddleCollision(newBall, playerPaddle)) {
    // Calculate relative intersect y
    const relativeIntersectY = (playerPaddle.y + playerPaddle.height / 2) - newBall.y;
    const normalizedRelativeIntersectionY = relativeIntersectY / (playerPaddle.height / 2);
    const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4; // Max 45 degrees
    
    newBall.vx = Math.abs(newBall.vx); // Ensure ball goes right
    newBall.vy = -Math.sin(bounceAngle) * newBall.speed;
    
    // Increase ball speed slightly
    const speedIncrease = 1 + GAME_CONSTANTS.BALL_SPEED_INCREASE;
    newBall.vx *= speedIncrease;
    newBall.vy *= speedIncrease;
    newBall.speed *= speedIncrease;
    
    // Ensure ball is outside paddle
    newBall.x = playerPaddle.x + playerPaddle.width + newBall.radius;
  }

  if (checkPaddleCollision(newBall, aiPaddle)) {
    // Calculate relative intersect y
    const relativeIntersectY = (aiPaddle.y + aiPaddle.height / 2) - newBall.y;
    const normalizedRelativeIntersectionY = relativeIntersectY / (aiPaddle.height / 2);
    const bounceAngle = normalizedRelativeIntersectionY * Math.PI / 4; // Max 45 degrees
    
    newBall.vx = -Math.abs(newBall.vx); // Ensure ball goes left
    newBall.vy = -Math.sin(bounceAngle) * newBall.speed;
    
    // Increase ball speed slightly
    const speedIncrease = 1 + GAME_CONSTANTS.BALL_SPEED_INCREASE;
    newBall.vx *= speedIncrease;
    newBall.vy *= speedIncrease;
    newBall.speed *= speedIncrease;
    
    // Ensure ball is outside paddle
    newBall.x = aiPaddle.x - newBall.radius;
  }

  return { ball: newBall, playerScored, aiScored };
}

/**
 * Update AI paddle position based on difficulty
 */
export function updateAiPaddle(aiPaddle: Paddle, ball: Ball, difficulty: Difficulty, gameField: GameField): Paddle {
  const newAiPaddle = { ...aiPaddle };
  
  // AI difficulty settings
  const difficultySettings = {
    easy: { speed: 0.6, accuracy: 0.8, reactionDelay: 0.3 },
    medium: { speed: 0.8, accuracy: 0.9, reactionDelay: 0.15 },
    hard: { speed: 1.0, accuracy: 0.95, reactionDelay: 0.05 }
  };
  
  const settings = difficultySettings[difficulty];
  const targetY = ball.y - aiPaddle.height / 2;
  const currentY = aiPaddle.y;
  
  // Add some randomness based on accuracy
  const accuracyOffset = (1 - settings.accuracy) * aiPaddle.height * (Math.random() - 0.5);
  const adjustedTargetY = targetY + accuracyOffset;
  
  // Move towards target position
  const diff = adjustedTargetY - currentY;
  const moveDistance = Math.min(Math.abs(diff), aiPaddle.speed * settings.speed);
  
  if (Math.abs(diff) > 5) { // Dead zone to prevent jittering
    newAiPaddle.y += diff > 0 ? moveDistance : -moveDistance;
  }
  
  // Keep paddle within bounds
  newAiPaddle.y = Math.max(0, Math.min(gameField.height - aiPaddle.height, newAiPaddle.y));
  
  return newAiPaddle;
}

/**
 * Reset ball to center with random direction
 */
export function resetBall(gameField: GameField): Ball {
  const angle = (Math.random() - 0.5) * Math.PI / 3; // Max 60 degrees
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  return {
    x: gameField.width / 2,
    y: gameField.height / 2,
    vx: GAME_CONSTANTS.BALL_SPEED * Math.cos(angle) * direction,
    vy: GAME_CONSTANTS.BALL_SPEED * Math.sin(angle),
    radius: GAME_CONSTANTS.BALL_RADIUS,
    speed: GAME_CONSTANTS.BALL_SPEED
  };
}

/**
 * Check if game is over
 */
export function isGameOver(playerScore: number, aiScore: number): boolean {
  return playerScore >= GAME_CONSTANTS.WIN_SCORE || aiScore >= GAME_CONSTANTS.WIN_SCORE;
}

/**
 * Get game winner
 */
export function getGameWinner(playerScore: number, aiScore: number): 'player' | 'ai' | null {
  if (playerScore >= GAME_CONSTANTS.WIN_SCORE) return 'player';
  if (aiScore >= GAME_CONSTANTS.WIN_SCORE) return 'ai';
  return null;
}

/**
 * Update paddle position based on input
 */
export function updatePlayerPaddle(paddle: Paddle, direction: 'up' | 'down' | 'none', gameField: GameField): Paddle {
  if (direction === 'none') return paddle;
  
  const newPaddle = { ...paddle };
  const moveDistance = paddle.speed;
  
  if (direction === 'up') {
    newPaddle.y = Math.max(0, paddle.y - moveDistance);
  } else if (direction === 'down') {
    newPaddle.y = Math.min(gameField.height - paddle.height, paddle.y + moveDistance);
  }
  
  return newPaddle;
}

/**
 * Initialize game state for new game
 */
export function initializeGame(gameField: GameField): {
  ball: Ball;
  playerPaddle: Paddle;
  aiPaddle: Paddle;
} {
  const { PADDLE_WIDTH, PADDLE_HEIGHT } = GAME_CONSTANTS;
  
  return {
    ball: resetBall(gameField),
    playerPaddle: {
      x: 20,
      y: gameField.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: GAME_CONSTANTS.PADDLE_SPEED
    },
    aiPaddle: {
      x: gameField.width - 20 - PADDLE_WIDTH,
      y: gameField.height / 2 - PADDLE_HEIGHT / 2,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      speed: GAME_CONSTANTS.PADDLE_SPEED
    }
  };
}