/**
 * Ping Pong Game Logic Tests
 * Comprehensive test suite for ping pong game mechanics with performance validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createInitialGameData,
  updatePlayerPaddle,
  updateAIPaddle,
  checkPaddleCollision,
  updateBall,
  resetBall,
  isGameOver,
  getWinner,
  GAME_CONFIG
} from './gameLogic'
import type { PingPongGameData, KeyState, Ball, Paddle } from './types'

describe('Ping Pong Game Logic', () => {
  let gameData: PingPongGameData
  let keyState: KeyState

  beforeEach(() => {
    gameData = createInitialGameData()
    keyState = {
      up: false,
      down: false,
      w: false,
      s: false,
      space: false
    }
  })

  describe('Game Initialization', () => {
    it('should create initial game data with correct structure', () => {
      const start = performance.now()
      const data = createInitialGameData()
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(data).toEqual(expect.objectContaining({
        gameStatus: 'playing',
        score: { player: 0, ai: 0 },
        gamesPlayed: 0,
        gamesWon: 0,
        gamesLost: 0,
        totalPlayTime: 0
      }))
      
      // Validate game area
      expect(data.gameArea.width).toBe(GAME_CONFIG.GAME_WIDTH)
      expect(data.gameArea.height).toBe(GAME_CONFIG.GAME_HEIGHT)
      
      // Validate paddles are positioned correctly
      expect(data.playerPaddle.x).toBe(GAME_CONFIG.PADDLE_MARGIN)
      expect(data.aiPaddle.x).toBe(GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.PADDLE_MARGIN - GAME_CONFIG.PADDLE_WIDTH)
      
      // Validate ball is centered
      expect(data.ball.x).toBe((GAME_CONFIG.GAME_WIDTH - GAME_CONFIG.BALL_SIZE) / 2)
      expect(data.ball.y).toBe((GAME_CONFIG.GAME_HEIGHT - GAME_CONFIG.BALL_SIZE) / 2)
    })

    it('should create ball with random velocity direction', () => {
      const start = performance.now()
      let leftCount = 0
      let rightCount = 0
      
      for (let i = 0; i < 100; i++) {
        const data = createInitialGameData()
        if (data.ball.velocity.x > 0) rightCount++
        else leftCount++
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
      
      // Should have roughly equal distribution
      expect(leftCount).toBeGreaterThan(30)
      expect(rightCount).toBeGreaterThan(30)
    })

    it('should have correct paddle dimensions and positions', () => {
      const start = performance.now()
      const data = createInitialGameData()
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(data.playerPaddle.width).toBe(GAME_CONFIG.PADDLE_WIDTH)
      expect(data.playerPaddle.height).toBe(GAME_CONFIG.PADDLE_HEIGHT)
      expect(data.aiPaddle.width).toBe(GAME_CONFIG.PADDLE_WIDTH)
      expect(data.aiPaddle.height).toBe(GAME_CONFIG.PADDLE_HEIGHT)
    })
  })

  describe('Player Paddle Movement', () => {
    it('should move paddle up when up key pressed', () => {
      const start = performance.now()
      keyState.up = true
      const newPaddle = updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeLessThan(gameData.playerPaddle.y)
    })

    it('should move paddle down when down key pressed', () => {
      const start = performance.now()
      keyState.down = true
      const newPaddle = updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeGreaterThan(gameData.playerPaddle.y)
    })

    it('should move paddle up when W key pressed', () => {
      const start = performance.now()
      keyState.w = true
      const newPaddle = updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeLessThan(gameData.playerPaddle.y)
    })

    it('should move paddle down when S key pressed', () => {
      const start = performance.now()
      keyState.s = true
      const newPaddle = updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeGreaterThan(gameData.playerPaddle.y)
    })

    it('should not move paddle above game boundary', () => {
      const start = performance.now()
      const paddle = { ...gameData.playerPaddle, y: 0 }
      keyState.up = true
      const newPaddle = updatePlayerPaddle(paddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBe(0)
    })

    it('should not move paddle below game boundary', () => {
      const start = performance.now()
      const paddle = { 
        ...gameData.playerPaddle, 
        y: gameData.gameArea.height - GAME_CONFIG.PADDLE_HEIGHT 
      }
      keyState.down = true
      const newPaddle = updatePlayerPaddle(paddle, keyState, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBe(gameData.gameArea.height - GAME_CONFIG.PADDLE_HEIGHT)
    })

    it('should handle multiple key presses efficiently', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        keyState.up = i % 2 === 0
        keyState.down = i % 3 === 0
        updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
      }
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5)
    })
  })

  describe('AI Paddle Movement', () => {
    it('should move AI paddle towards ball', () => {
      const start = performance.now()
      const ball: Ball = { 
        ...gameData.ball, 
        y: gameData.aiPaddle.y + 100 // Ball below paddle
      }
      const newPaddle = updateAIPaddle(gameData.aiPaddle, ball, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeGreaterThan(gameData.aiPaddle.y)
    })

    it('should move AI paddle up when ball is above', () => {
      const start = performance.now()
      const ball: Ball = { 
        ...gameData.ball, 
        y: gameData.aiPaddle.y - 50 // Ball above paddle
      }
      const newPaddle = updateAIPaddle(gameData.aiPaddle, ball, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeLessThan(gameData.aiPaddle.y)
    })

    it('should not move AI paddle beyond game boundaries', () => {
      const start = performance.now()
      const paddleAtTop = { ...gameData.aiPaddle, y: 0 }
      const ballAbove: Ball = { ...gameData.ball, y: -50 }
      const newPaddle = updateAIPaddle(paddleAtTop, ballAbove, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newPaddle.y).toBeGreaterThanOrEqual(0)
    })

    it('should not move when ball is close to paddle center', () => {
      const start = performance.now()
      const ball: Ball = { 
        ...gameData.ball, 
        y: gameData.aiPaddle.y + gameData.aiPaddle.height / 2 - 2 // Very close to center
      }
      const newPaddle = updateAIPaddle(gameData.aiPaddle, ball, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      // AI paddle should move very little or not at all when ball is close to center
      expect(Math.abs(newPaddle.y - gameData.aiPaddle.y)).toBeLessThanOrEqual(GAME_CONFIG.AI_REACTION_SPEED)
    })

    it('should process AI movement efficiently', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        const ball = { ...gameData.ball, y: i % gameData.gameArea.height }
        updateAIPaddle(gameData.aiPaddle, ball, gameData.gameArea)
      }
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5)
    })
  })

  describe('Ball Physics', () => {
    it('should detect collision with player paddle correctly', () => {
      const start = performance.now()
      const ball: Ball = {
        x: gameData.playerPaddle.x + gameData.playerPaddle.width - 1,
        y: gameData.playerPaddle.y + 10,
        width: GAME_CONFIG.BALL_SIZE,
        height: GAME_CONFIG.BALL_SIZE,
        velocity: { x: -2, y: 0 },
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
      }
      
      const collision = checkPaddleCollision(ball, gameData.playerPaddle)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(collision).toBe(true)
    })

    it('should detect collision with AI paddle correctly', () => {
      const start = performance.now()
      const ball: Ball = {
        x: gameData.aiPaddle.x + 1,
        y: gameData.aiPaddle.y + 10,
        width: GAME_CONFIG.BALL_SIZE,
        height: GAME_CONFIG.BALL_SIZE,
        velocity: { x: 2, y: 0 },
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
      }
      
      const collision = checkPaddleCollision(ball, gameData.aiPaddle)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(collision).toBe(true)
    })

    it('should not detect collision when ball is away from paddle', () => {
      const start = performance.now()
      const ball: Ball = {
        x: gameData.playerPaddle.x + 100,
        y: gameData.playerPaddle.y + 100,
        width: GAME_CONFIG.BALL_SIZE,
        height: GAME_CONFIG.BALL_SIZE,
        velocity: { x: 2, y: 0 },
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
      }
      
      const collision = checkPaddleCollision(ball, gameData.playerPaddle)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(collision).toBe(false)
    })

    it('should update ball position based on velocity', () => {
      const start = performance.now()
      const initialX = gameData.ball.x
      const initialY = gameData.ball.y
      
      const result = updateBall(gameData.ball, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.ball.x).toBe(initialX + gameData.ball.velocity.x)
      expect(result.ball.y).toBe(initialY + gameData.ball.velocity.y)
    })

    it('should bounce ball off top and bottom walls', () => {
      const start = performance.now()
      const ballAtTop: Ball = {
        ...gameData.ball,
        y: -1,
        velocity: { x: 2, y: -3 }
      }
      
      const result = updateBall(ballAtTop, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.ball.velocity.y).toBeGreaterThan(0) // Should bounce down
      expect(result.ball.y).toBe(0) // Should be at boundary
    })

    it('should detect scoring when ball goes off left side', () => {
      const start = performance.now()
      const ballOffLeft: Ball = {
        ...gameData.ball,
        x: -5,
        velocity: { x: -2, y: 0 }
      }
      
      const result = updateBall(ballOffLeft, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.scored).toBe('ai')
    })

    it('should detect scoring when ball goes off right side', () => {
      const start = performance.now()
      const ballOffRight: Ball = {
        ...gameData.ball,
        x: gameData.gameArea.width + 5,
        velocity: { x: 2, y: 0 }
      }
      
      const result = updateBall(ballOffRight, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.scored).toBe('player')
    })

    it('should increase ball speed after paddle collision', () => {
      const start = performance.now()
      const ballNearPaddle: Ball = {
        x: gameData.playerPaddle.x + gameData.playerPaddle.width - 1,
        y: gameData.playerPaddle.y + 10,
        width: GAME_CONFIG.BALL_SIZE,
        height: GAME_CONFIG.BALL_SIZE,
        velocity: { x: -2, y: 0 },
        speed: GAME_CONFIG.BALL_INITIAL_SPEED
      }
      
      const result = updateBall(ballNearPaddle, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.ball.speed).toBeGreaterThan(GAME_CONFIG.BALL_INITIAL_SPEED)
    })

    it('should process ball physics efficiently', () => {
      const start = performance.now()
      for (let i = 0; i < 1000; i++) {
        updateBall(gameData.ball, gameData.playerPaddle, gameData.aiPaddle, gameData.gameArea)
      }
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Ball Reset', () => {
    it('should reset ball to center position', () => {
      const start = performance.now()
      const newBall = resetBall(gameData.gameArea)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(newBall.x).toBe((gameData.gameArea.width - GAME_CONFIG.BALL_SIZE) / 2)
      expect(newBall.y).toBe((gameData.gameArea.height - GAME_CONFIG.BALL_SIZE) / 2)
      expect(newBall.speed).toBe(GAME_CONFIG.BALL_INITIAL_SPEED)
    })

    it('should create ball with random horizontal direction', () => {
      const start = performance.now()
      let leftCount = 0
      let rightCount = 0
      
      for (let i = 0; i < 50; i++) {
        const ball = resetBall(gameData.gameArea)
        if (ball.velocity.x > 0) rightCount++
        else leftCount++
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5)
      expect(leftCount).toBeGreaterThan(10)
      expect(rightCount).toBeGreaterThan(10)
    })
  })

  describe('Game State Management', () => {
    it('should detect game over when player reaches winning score', () => {
      const start = performance.now()
      const score = { player: GAME_CONFIG.WINNING_SCORE, ai: 5 }
      const isOver = isGameOver(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isOver).toBe(true)
    })

    it('should detect game over when AI reaches winning score', () => {
      const start = performance.now()
      const score = { player: 5, ai: GAME_CONFIG.WINNING_SCORE }
      const isOver = isGameOver(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isOver).toBe(true)
    })

    it('should not detect game over when neither player reaches winning score', () => {
      const start = performance.now()
      const score = { player: 5, ai: 5 }
      const isOver = isGameOver(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isOver).toBe(false)
    })

    it('should identify player as winner', () => {
      const start = performance.now()
      const score = { player: GAME_CONFIG.WINNING_SCORE, ai: 5 }
      const winner = getWinner(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(winner).toBe('player')
    })

    it('should identify AI as winner', () => {
      const start = performance.now()
      const score = { player: 5, ai: GAME_CONFIG.WINNING_SCORE }
      const winner = getWinner(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(winner).toBe('ai')
    })

    it('should return no winner when game is not over', () => {
      const start = performance.now()
      const score = { player: 5, ai: 5 }
      const winner = getWinner(score)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(winner).toBeNull()
    })

    it('should process game state checks efficiently', () => {
      const start = performance.now()
      for (let i = 0; i < 10000; i++) {
        const score = { player: i % 15, ai: (i + 5) % 15 }
        isGameOver(score)
        getWinner(score)
      }
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should handle rapid game updates efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        // Simulate a full game update cycle
        keyState.up = i % 2 === 0
        keyState.down = i % 3 === 0
        
        const newPlayerPaddle = updatePlayerPaddle(gameData.playerPaddle, keyState, gameData.gameArea)
        const newAIPaddle = updateAIPaddle(gameData.aiPaddle, gameData.ball, gameData.gameArea)
        const ballResult = updateBall(gameData.ball, newPlayerPaddle, newAIPaddle, gameData.gameArea)
        
        checkPaddleCollision(ballResult.ball, newPlayerPaddle)
        checkPaddleCollision(ballResult.ball, newAIPaddle)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(20) // Should handle 1000 updates in under 20ms
    })

    it('should initialize game data rapidly', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        createInitialGameData()
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should perform collision detection efficiently', () => {
      const start = performance.now()
      
      const ball = gameData.ball
      const paddle = gameData.playerPaddle
      
      for (let i = 0; i < 50000; i++) {
        checkPaddleCollision(ball, paddle)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(20)
    })
  })
})