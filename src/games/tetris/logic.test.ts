/**
 * Tetris Game Logic Tests
 * Comprehensive test suite for Tetris game mechanics with performance validation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyGrid,
  getRandomPieceType,
  createActivePiece,
  isValidPosition,
  movePiece,
  rotatePiece,
  placePiece,
  clearCompletedLines,
  isGameOver,
  calculateScore,
  calculateLevel,
  calculateDropSpeed,
  createInitialStats,
  updateStats,
  GRID_WIDTH,
  GRID_HEIGHT,
  PIECE_SHAPES,
  PIECE_COLORS,
  INITIAL_DROP_SPEED
} from './logic'
import type { TetrisGrid, PieceType } from './types'

describe('Tetris Game Logic', () => {
  let grid: TetrisGrid

  beforeEach(() => {
    grid = createEmptyGrid()
  })

  describe('Grid Management', () => {
    it('should create empty grid with correct dimensions', () => {
      const start = performance.now()
      const emptyGrid = createEmptyGrid()
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(emptyGrid.length).toBe(GRID_HEIGHT)
      expect(emptyGrid[0].length).toBe(GRID_WIDTH)
      
      // All cells should be empty (0)
      for (let row = 0; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          expect(emptyGrid[row][col]).toBe(0)
        }
      }
    })

    it('should create grids efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        createEmptyGrid()
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should handle grid operations without mutation', () => {
      const start = performance.now()
      const originalGrid = createEmptyGrid()
      const modifiedGrid = originalGrid.map(row => [...row])
      modifiedGrid[0][0] = 1
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(originalGrid[0][0]).toBe(0)
      expect(modifiedGrid[0][0]).toBe(1)
    })
  })

  describe('Piece Generation', () => {
    it('should generate valid piece types', () => {
      const start = performance.now()
      const validTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
      
      for (let i = 0; i < 100; i++) {
        const pieceType = getRandomPieceType()
        expect(validTypes).toContain(pieceType)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })

    it('should generate reasonably random distribution', () => {
      const start = performance.now()
      const counts: Record<PieceType, number> = {
        I: 0, O: 0, T: 0, S: 0, Z: 0, J: 0, L: 0
      }
      
      for (let i = 0; i < 700; i++) {
        const pieceType = getRandomPieceType()
        counts[pieceType]++
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
      
      // Each piece should appear at least a few times in 700 iterations
      Object.values(counts).forEach(count => {
        expect(count).toBeGreaterThan(50)
        expect(count).toBeLessThan(200)
      })
    })

    it('should generate pieces rapidly', () => {
      const start = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        getRandomPieceType()
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Active Piece Creation', () => {
    it('should create active piece with correct initial properties', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(piece.type).toBe('T')
      expect(piece.rotation).toBe(0)
      expect(piece.position.x).toBe(Math.floor(GRID_WIDTH / 2) - 2)
      expect(piece.position.y).toBe(0)
      expect(piece.shape).toEqual(PIECE_SHAPES.T[0])
    })

    it('should create pieces for all types correctly', () => {
      const start = performance.now()
      const pieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
      
      pieceTypes.forEach(type => {
        const piece = createActivePiece(type)
        expect(piece.type).toBe(type)
        expect(piece.shape).toEqual(PIECE_SHAPES[type][0])
      })
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5)
    })

    it('should create active pieces efficiently', () => {
      const start = performance.now()
      const pieceTypes: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']
      
      for (let i = 0; i < 1000; i++) {
        const type = pieceTypes[i % pieceTypes.length]
        createActivePiece(type)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Position Validation', () => {
    it('should validate valid positions correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const isValid = isValidPosition(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(true)
    })

    it('should detect collision with existing pieces', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      testGrid[1][4] = 1 // Place obstacle
      
      const piece = createActivePiece('T')
      piece.position.y = 0 // Position where T piece would collide
      
      const isValid = isValidPosition(testGrid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(false)
    })

    it('should detect collision with left boundary', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.x = -2 // Too far left
      
      const isValid = isValidPosition(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(false)
    })

    it('should detect collision with right boundary', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.x = GRID_WIDTH - 1 // Too far right
      
      const isValid = isValidPosition(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(false)
    })

    it('should detect collision with bottom boundary', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.y = GRID_HEIGHT - 1 // Too far down
      
      const isValid = isValidPosition(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(false)
    })

    it('should allow pieces to start above grid (negative Y)', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.y = -1 // Above grid
      
      const isValid = isValidPosition(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(isValid).toBe(true)
    })

    it('should validate positions efficiently', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      
      for (let i = 0; i < 1000; i++) {
        piece.position.x = Math.max(0, Math.min(GRID_WIDTH - 4, i % GRID_WIDTH))
        piece.position.y = Math.max(0, Math.min(GRID_HEIGHT - 4, Math.floor(i / 10) % GRID_HEIGHT))
        isValidPosition(grid, piece)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(20)
    })
  })

  describe('Piece Movement', () => {
    it('should move piece left correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const originalX = piece.position.x
      const movedPiece = movePiece(piece, 'left')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(movedPiece.position.x).toBe(originalX - 1)
      expect(movedPiece.position.y).toBe(piece.position.y)
    })

    it('should move piece right correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const originalX = piece.position.x
      const movedPiece = movePiece(piece, 'right')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(movedPiece.position.x).toBe(originalX + 1)
      expect(movedPiece.position.y).toBe(piece.position.y)
    })

    it('should move piece down correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const originalY = piece.position.y
      const movedPiece = movePiece(piece, 'down')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(movedPiece.position.x).toBe(piece.position.x)
      expect(movedPiece.position.y).toBe(originalY + 1)
    })

    it('should not mutate original piece when moving', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const originalX = piece.position.x
      const movedPiece = movePiece(piece, 'left')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(piece.position.x).toBe(originalX) // Original unchanged
      expect(movedPiece.position.x).toBe(originalX - 1) // New piece moved
    })

    it('should process movements efficiently', () => {
      const start = performance.now()
      let piece = createActivePiece('T')
      
      for (let i = 0; i < 5000; i++) {
        const direction = ['left', 'right', 'down'][i % 3] as any
        piece = movePiece(piece, direction)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(15)
    })
  })

  describe('Piece Rotation', () => {
    it('should rotate piece clockwise correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const rotatedPiece = rotatePiece(piece, 'clockwise')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(rotatedPiece.rotation).toBe(1)
      expect(rotatedPiece.shape).toEqual(PIECE_SHAPES.T[1])
    })

    it('should rotate piece counterclockwise correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      const rotatedPiece = rotatePiece(piece, 'counterclockwise')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(rotatedPiece.rotation).toBe(3)
      expect(rotatedPiece.shape).toEqual(PIECE_SHAPES.T[3])
    })

    it('should wrap rotation values correctly', () => {
      const start = performance.now()
      let piece = createActivePiece('T')
      
      // Rotate clockwise 4 times should return to original
      for (let i = 0; i < 4; i++) {
        piece = rotatePiece(piece, 'clockwise')
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(1)
      expect(piece.rotation).toBe(0)
      expect(piece.shape).toEqual(PIECE_SHAPES.T[0])
    })

    it('should handle O piece rotation (no visual change)', () => {
      const start = performance.now()
      const piece = createActivePiece('O')
      const rotatedPiece = rotatePiece(piece, 'clockwise')
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(rotatedPiece.rotation).toBe(1)
      expect(rotatedPiece.shape).toEqual(PIECE_SHAPES.O[1])
      // O piece looks the same at all rotations
      expect(rotatedPiece.shape).toEqual(PIECE_SHAPES.O[0])
    })

    it('should process rotations efficiently', () => {
      const start = performance.now()
      let piece = createActivePiece('T')
      
      for (let i = 0; i < 2000; i++) {
        const direction = i % 2 === 0 ? 'clockwise' : 'counterclockwise'
        piece = rotatePiece(piece, direction)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Piece Placement', () => {
    it('should place piece on grid correctly', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.x = 4
      piece.position.y = 1
      
      const newGrid = placePiece(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      // T piece at position (4,1) with shape:
      // [0,1,0,0] at row 1 -> places at grid[1][5] 
      // [1,1,1,0] at row 2 -> places at grid[2][4], grid[2][5], grid[2][6]
      expect(newGrid[1][5]).toBe(PIECE_COLORS.T) // Top center
      expect(newGrid[2][4]).toBe(PIECE_COLORS.T) // Bottom left
      expect(newGrid[2][5]).toBe(PIECE_COLORS.T) // Bottom center  
      expect(newGrid[2][6]).toBe(PIECE_COLORS.T) // Bottom right
    })

    it('should not mutate original grid when placing piece', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.x = 4
      piece.position.y = 1
      
      const newGrid = placePiece(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(grid[2][5]).toBe(0) // Original grid unchanged
      expect(newGrid[2][5]).toBe(PIECE_COLORS.T) // New grid has piece
    })

    it('should handle piece placement outside grid bounds safely', () => {
      const start = performance.now()
      const piece = createActivePiece('T')
      piece.position.x = GRID_WIDTH - 2 // Near right boundary
      piece.position.y = 0
      
      const newGrid = placePiece(grid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      // T piece near right boundary should only place cells within bounds
      // At position (8, 0), the T piece should place correctly within grid
      expect(newGrid[0][9]).toBe(PIECE_COLORS.T) // Top center (position.x + 1)
      expect(newGrid[1][8]).toBe(PIECE_COLORS.T) // Bottom left
      expect(newGrid[1][9]).toBe(PIECE_COLORS.T) // Bottom center
      // The rightmost part would be at column 10, which is out of bounds and should be ignored
    })

    it('should place pieces efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 500; i++) {
        const piece = createActivePiece('T')
        piece.position.x = Math.max(0, Math.min(GRID_WIDTH - 4, i % (GRID_WIDTH - 3)))
        piece.position.y = Math.max(0, Math.min(GRID_HEIGHT - 4, Math.floor(i / 10) % (GRID_HEIGHT - 2)))
        placePiece(grid, piece)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(20)
    })
  })

  describe('Line Clearing', () => {
    it('should clear completed lines correctly', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      
      // Fill bottom line completely
      for (let col = 0; col < GRID_WIDTH; col++) {
        testGrid[GRID_HEIGHT - 1][col] = 1
      }
      
      const result = clearCompletedLines(testGrid)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.linesCleared).toBe(1)
      expect(result.grid[GRID_HEIGHT - 1].every(cell => cell === 0)).toBe(true)
    })

    it('should clear multiple completed lines', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      
      // Fill bottom two lines completely
      for (let row = GRID_HEIGHT - 2; row < GRID_HEIGHT; row++) {
        for (let col = 0; col < GRID_WIDTH; col++) {
          testGrid[row][col] = 1
        }
      }
      
      const result = clearCompletedLines(testGrid)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.linesCleared).toBe(2)
      expect(result.grid[GRID_HEIGHT - 1].every(cell => cell === 0)).toBe(true)
      expect(result.grid[GRID_HEIGHT - 2].every(cell => cell === 0)).toBe(true)
    })

    it('should not clear incomplete lines', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      
      // Fill bottom line almost completely (missing one cell)
      for (let col = 0; col < GRID_WIDTH - 1; col++) {
        testGrid[GRID_HEIGHT - 1][col] = 1
      }
      
      const result = clearCompletedLines(testGrid)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.linesCleared).toBe(0)
      expect(result.grid[GRID_HEIGHT - 1][GRID_WIDTH - 1]).toBe(0) // Last cell still empty
    })

    it('should maintain grid structure after clearing lines', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      
      // Add some pieces above the line to be cleared
      testGrid[GRID_HEIGHT - 3][5] = 2
      testGrid[GRID_HEIGHT - 4][3] = 3
      
      // Fill bottom line completely
      for (let col = 0; col < GRID_WIDTH; col++) {
        testGrid[GRID_HEIGHT - 1][col] = 1
      }
      
      const result = clearCompletedLines(testGrid)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(result.linesCleared).toBe(1)
      expect(result.grid[GRID_HEIGHT - 2][5]).toBe(2) // Piece moved down
      expect(result.grid[GRID_HEIGHT - 3][3]).toBe(3) // Piece moved down
      expect(result.grid.length).toBe(GRID_HEIGHT)
    })

    it('should process line clearing efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        const testGrid = createEmptyGrid()
        // Randomly fill some lines
        if (i % 5 === 0) {
          for (let col = 0; col < GRID_WIDTH; col++) {
            testGrid[GRID_HEIGHT - 1][col] = 1
          }
        }
        clearCompletedLines(testGrid)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(20)
    })
  })

  describe('Game Over Detection', () => {
    it('should detect game over when piece cannot be placed at spawn', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      
      // Block spawn area
      testGrid[0][4] = 1
      testGrid[0][5] = 1
      
      const piece = createActivePiece('T')
      const gameOver = isGameOver(testGrid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(gameOver).toBe(true)
    })

    it('should not detect game over when spawn area is clear', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      const piece = createActivePiece('T')
      const gameOver = isGameOver(testGrid, piece)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(gameOver).toBe(false)
    })

    it('should check game over condition efficiently', () => {
      const start = performance.now()
      const testGrid = createEmptyGrid()
      const piece = createActivePiece('T')
      
      for (let i = 0; i < 5000; i++) {
        isGameOver(testGrid, piece)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Scoring System', () => {
    it('should calculate score for single line', () => {
      const start = performance.now()
      const score = calculateScore(1, 0)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(40) // Base score for 1 line at level 0
    })

    it('should calculate score for double lines', () => {
      const start = performance.now()
      const score = calculateScore(2, 0)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(100)
    })

    it('should calculate score for triple lines', () => {
      const start = performance.now()
      const score = calculateScore(3, 0)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(300)
    })

    it('should calculate score for tetris (4 lines)', () => {
      const start = performance.now()
      const score = calculateScore(4, 0)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(1200)
    })

    it('should multiply score by level', () => {
      const start = performance.now()
      const score = calculateScore(1, 2)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(40 * 3) // 40 * (level + 1)
    })

    it('should return 0 for no lines cleared', () => {
      const start = performance.now()
      const score = calculateScore(0, 5)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(score).toBe(0)
    })

    it('should calculate scores efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        calculateScore(i % 5, i % 10)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(5)
    })
  })

  describe('Level System', () => {
    it('should calculate level based on lines cleared', () => {
      const start = performance.now()
      expect(calculateLevel(0)).toBe(0)
      expect(calculateLevel(5)).toBe(0)
      expect(calculateLevel(10)).toBe(1)
      expect(calculateLevel(25)).toBe(2)
      expect(calculateLevel(100)).toBe(10)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
    })

    it('should calculate drop speed based on level', () => {
      const start = performance.now()
      const speed0 = calculateDropSpeed(0)
      const speed1 = calculateDropSpeed(1)
      const speed5 = calculateDropSpeed(5)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(speed0).toBe(INITIAL_DROP_SPEED)
      expect(speed1).toBeLessThan(speed0)
      expect(speed5).toBeLessThan(speed1)
      expect(speed5).toBeGreaterThanOrEqual(50) // Minimum speed
    })

    it('should process level calculations efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 10000; i++) {
        calculateLevel(i)
        calculateDropSpeed(i % 20)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Game Statistics', () => {
    it('should create initial stats correctly', () => {
      const start = performance.now()
      const stats = createInitialStats()
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(stats).toEqual({
        score: 0,
        level: 0,
        lines: 0,
        pieces: 0
      })
    })

    it('should update stats after clearing lines', () => {
      const start = performance.now()
      const stats = createInitialStats()
      const updatedStats = updateStats(stats, 2)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(updatedStats.lines).toBe(2)
      expect(updatedStats.score).toBeGreaterThan(0)
      expect(updatedStats.level).toBe(0) // Still level 0 at 2 lines
    })

    it('should increment level when reaching threshold', () => {
      const start = performance.now()
      const stats = { score: 0, level: 0, lines: 8, pieces: 10 }
      const updatedStats = updateStats(stats, 3) // Total 11 lines
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(updatedStats.lines).toBe(11)
      expect(updatedStats.level).toBe(1) // Should level up
    })

    it('should not increment pieces when lines are cleared', () => {
      const start = performance.now()
      const stats = { score: 0, level: 0, lines: 0, pieces: 5 }
      const updatedStats = updateStats(stats, 1)
      const duration = performance.now() - start
      
      expect(duration).toBeLessThan(1)
      expect(updatedStats.pieces).toBe(5) // No piece increment when lines cleared
    })

    it('should process stats updates efficiently', () => {
      const start = performance.now()
      let stats = createInitialStats()
      
      for (let i = 0; i < 2000; i++) {
        stats = updateStats(stats, i % 5)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(10)
    })
  })

  describe('Performance Benchmarks', () => {
    it('should handle complete game cycle efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 500; i++) {
        // Simulate a complete game cycle
        const grid = createEmptyGrid()
        const piece = createActivePiece(getRandomPieceType())
        
        // Simulate piece movement
        let currentPiece = piece
        for (let move = 0; move < 10; move++) {
          const moved = movePiece(currentPiece, 'down')
          if (isValidPosition(grid, moved)) {
            currentPiece = moved
          } else {
            break
          }
        }
        
        // Place piece and clear lines
        const newGrid = placePiece(grid, currentPiece)
        const cleared = clearCompletedLines(newGrid)
        
        // Update stats
        const stats = createInitialStats()
        updateStats(stats, cleared.linesCleared)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(100) // Should handle 500 game cycles efficiently
    })

    it('should validate piece operations rapidly', () => {
      const start = performance.now()
      const grid = createEmptyGrid()
      
      for (let i = 0; i < 2000; i++) {
        const piece = createActivePiece('T')
        piece.position.x = Math.max(0, Math.min(GRID_WIDTH - 4, i % GRID_WIDTH))
        piece.position.y = Math.max(0, Math.min(GRID_HEIGHT - 4, Math.floor(i / 100) % GRID_HEIGHT))
        
        isValidPosition(grid, piece)
        if (i % 4 === 0) rotatePiece(piece, 'clockwise')
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(30)
    })

    it('should handle intensive grid operations efficiently', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        let grid = createEmptyGrid()
        
        // Place multiple pieces
        for (let p = 0; p < 5; p++) {
          const piece = createActivePiece('T')
          piece.position.y = p * 4
          piece.position.x = (p * 2) % (GRID_WIDTH - 3)
          grid = placePiece(grid, piece)
        }
        
        // Clear lines
        clearCompletedLines(grid)
      }
      
      const duration = performance.now() - start
      expect(duration).toBeLessThan(50)
    })
  })
})