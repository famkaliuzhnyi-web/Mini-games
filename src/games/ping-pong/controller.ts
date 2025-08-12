/**
 * Ping Pong Game Controller
 */
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { PingPongGameData, GameConstants } from './types';

// Game constants
export const GAME_CONSTANTS: GameConstants = {
  PADDLE_SPEED: 5,
  BALL_SPEED: 4,
  BALL_SPEED_INCREASE: 0.1,
  AI_REACTION_DELAY: 0.1,
  WIN_SCORE: 11,
  FIELD_WIDTH: 800,
  FIELD_HEIGHT: 400,
  PADDLE_WIDTH: 20,
  PADDLE_HEIGHT: 100,
  BALL_RADIUS: 10
};

const PING_PONG_CONFIG: GameConfig = {
  id: 'ping-pong',
  name: 'Ping Pong',
  description: 'Classic ping pong game - compete against AI and improve your skills!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 20000 // Save every 20 seconds
};

export class PingPongGameController implements GameController<PingPongGameData> {
  config = PING_PONG_CONFIG;

  getInitialState(): GameState<PingPongGameData> {
    const now = new Date().toISOString();
    const { FIELD_WIDTH, FIELD_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, BALL_RADIUS, BALL_SPEED } = GAME_CONSTANTS;
    
    return {
      gameId: 'ping-pong',
      playerId: '', // Will be set by the component
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        ball: {
          x: FIELD_WIDTH / 2,
          y: FIELD_HEIGHT / 2,
          vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
          vy: BALL_SPEED * (Math.random() - 0.5) * 0.8,
          radius: BALL_RADIUS,
          speed: BALL_SPEED
        },
        playerPaddle: {
          x: 20,
          y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT,
          speed: GAME_CONSTANTS.PADDLE_SPEED
        },
        aiPaddle: {
          x: FIELD_WIDTH - 20 - PADDLE_WIDTH,
          y: FIELD_HEIGHT / 2 - PADDLE_HEIGHT / 2,
          width: PADDLE_WIDTH,
          height: PADDLE_HEIGHT,
          speed: GAME_CONSTANTS.PADDLE_SPEED
        },
        gameField: {
          width: FIELD_WIDTH,
          height: FIELD_HEIGHT
        },
        score: {
          player: 0,
          ai: 0
        },
        gameStatus: 'waiting',
        difficulty: 'medium',
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        highScore: 0,
        totalTimePlayed: 0,
        lastGameDuration: 0
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<PingPongGameData>): boolean {
    if (!state || !state.data) return false;
    
    const data = state.data;
    
    return !!(
      data.ball &&
      typeof data.ball.x === 'number' &&
      typeof data.ball.y === 'number' &&
      typeof data.ball.vx === 'number' &&
      typeof data.ball.vy === 'number' &&
      data.playerPaddle &&
      typeof data.playerPaddle.x === 'number' &&
      typeof data.playerPaddle.y === 'number' &&
      data.aiPaddle &&
      typeof data.aiPaddle.x === 'number' &&
      typeof data.aiPaddle.y === 'number' &&
      data.score &&
      typeof data.score.player === 'number' &&
      typeof data.score.ai === 'number' &&
      data.gameStatus &&
      ['waiting', 'playing', 'paused', 'game-over'].includes(data.gameStatus) &&
      data.difficulty &&
      ['easy', 'medium', 'hard'].includes(data.difficulty)
    );
  }

  onSaveLoad(state: GameState<PingPongGameData>): void {
    console.log('Ping Pong game loaded:', {
      score: state.data.score,
      status: state.data.gameStatus,
      gamesPlayed: state.data.gamesPlayed
    });
  }

  onSaveDropped(): void {
    console.log('Ping Pong game save dropped');
  }
}