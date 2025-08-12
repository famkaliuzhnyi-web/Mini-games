/**
 * Tic-Tac-Toe Game Logic Tests
 * Focus on speed and comprehensive coverage
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createEmptyBoard,
  isValidMove,
  makeMove,
  checkWinnerWithCombination,
  checkWinner,
  getGameStatus,
  getGameStatusWithCombination,
  isBoardFull,
  getNextPlayer,
  countEmptyCells,
  getPossibleMoves
} from './gameLogic'
import type { Board, Player } from './types'

describe('Tic-Tac-Toe Game Logic', () => {
  describe('createEmptyBoard', () => {
    it('should create a 3x3 board with all null values', () => {
      const board = createEmptyBoard()
      expect(board).toHaveLength(3)
      expect(board[0]).toHaveLength(3)
      expect(board[1]).toHaveLength(3)
      expect(board[2]).toHaveLength(3)
      
      // Check all cells are null
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          expect(board[row][col]).toBeNull()
        }
      }
    })

    it('should create a new board instance each time', () => {
      const board1 = createEmptyBoard()
      const board2 = createEmptyBoard()
      expect(board1).not.toBe(board2)
      expect(board1[0]).not.toBe(board2[0])
    })
  })

  describe('isValidMove', () => {
    let board: Board

    beforeEach(() => {
      board = createEmptyBoard()
    })

    it('should return true for empty cells', () => {
      expect(isValidMove(board, 0, 0)).toBe(true)
      expect(isValidMove(board, 1, 1)).toBe(true)
      expect(isValidMove(board, 2, 2)).toBe(true)
    })

    it('should return false for occupied cells', () => {
      board[0][0] = 'X'
      board[1][1] = 'O'
      
      expect(isValidMove(board, 0, 0)).toBe(false)
      expect(isValidMove(board, 1, 1)).toBe(false)
    })

    it('should return false for out-of-bounds coordinates', () => {
      expect(isValidMove(board, -1, 0)).toBe(false)
      expect(isValidMove(board, 0, -1)).toBe(false)
      expect(isValidMove(board, 3, 0)).toBe(false)
      expect(isValidMove(board, 0, 3)).toBe(false)
      expect(isValidMove(board, -1, -1)).toBe(false)
      expect(isValidMove(board, 3, 3)).toBe(false)
    })
  })

  describe('makeMove', () => {
    let board: Board

    beforeEach(() => {
      board = createEmptyBoard()
    })

    it('should place player symbol on empty cell', () => {
      const newBoard = makeMove(board, 1, 1, 'X')
      expect(newBoard[1][1]).toBe('X')
    })

    it('should not mutate the original board', () => {
      const originalBoard = createEmptyBoard()
      const newBoard = makeMove(originalBoard, 1, 1, 'X')
      
      expect(originalBoard[1][1]).toBeNull()
      expect(newBoard[1][1]).toBe('X')
      expect(originalBoard).not.toBe(newBoard)
    })

    it('should throw error for invalid moves', () => {
      board[0][0] = 'X'
      
      expect(() => makeMove(board, 0, 0, 'O')).toThrow('Invalid move')
      expect(() => makeMove(board, -1, 0, 'X')).toThrow('Invalid move')
      expect(() => makeMove(board, 0, 3, 'O')).toThrow('Invalid move')
    })
  })

  describe('checkWinnerWithCombination', () => {
    it('should detect row wins', () => {
      const board: Board = [
        ['X', 'X', 'X'],
        [null, 'O', null],
        [null, null, 'O']
      ]
      
      const result = checkWinnerWithCombination(board)
      expect(result.winner).toBe('X')
      expect(result.combination?.type).toBe('row')
      expect(result.combination?.positions).toEqual([[0, 0], [0, 1], [0, 2]])
    })

    it('should detect column wins', () => {
      const board: Board = [
        ['O', 'X', null],
        ['O', 'X', null],
        ['O', null, 'X']
      ]
      
      const result = checkWinnerWithCombination(board)
      expect(result.winner).toBe('O')
      expect(result.combination?.type).toBe('column')
      expect(result.combination?.positions).toEqual([[0, 0], [1, 0], [2, 0]])
    })

    it('should detect diagonal wins', () => {
      const board: Board = [
        ['X', 'O', null],
        ['O', 'X', null],
        [null, null, 'X']
      ]
      
      const result = checkWinnerWithCombination(board)
      expect(result.winner).toBe('X')
      expect(result.combination?.type).toBe('diagonal')
      expect(result.combination?.positions).toEqual([[0, 0], [1, 1], [2, 2]])
    })

    it('should detect anti-diagonal wins', () => {
      const board: Board = [
        ['O', 'X', 'X'],
        ['O', 'X', null],
        ['X', null, null]
      ]
      
      const result = checkWinnerWithCombination(board)
      expect(result.winner).toBe('X')
      expect(result.combination?.type).toBe('diagonal')
      expect(result.combination?.positions).toEqual([[0, 2], [1, 1], [2, 0]])
    })

    it('should return null for no winner', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'X', 'O'],
        ['O', 'X', null]
      ]
      
      const result = checkWinnerWithCombination(board)
      expect(result.winner).toBeNull()
      expect(result.combination).toBeUndefined()
    })
  })

  describe('checkWinner', () => {
    it('should return winner when game is won', () => {
      const board: Board = [
        ['X', 'X', 'X'],
        ['O', 'O', null],
        [null, null, null]
      ]
      
      expect(checkWinner(board)).toBe('X')
    })

    it('should return null when no winner', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'X', 'O'],
        ['O', 'X', null]
      ]
      
      expect(checkWinner(board)).toBeNull()
    })
  })

  describe('getGameStatus', () => {
    it('should return playing status for ongoing game', () => {
      const board: Board = [
        ['X', 'O', null],
        [null, 'X', null],
        [null, null, null]
      ]
      
      const status = getGameStatus(board)
      expect(status).toBe('playing')
    })

    it('should return X-wins when X has won', () => {
      const board: Board = [
        ['X', 'X', 'X'],
        ['O', 'O', null],
        [null, null, null]
      ]
      
      const status = getGameStatus(board)
      expect(status).toBe('X-wins')
    })

    it('should return O-wins when O has won', () => {
      const board: Board = [
        ['O', 'O', 'O'],
        ['X', 'X', null],
        [null, null, null]
      ]
      
      const status = getGameStatus(board)
      expect(status).toBe('O-wins')
    })

    it('should return tie when board is full with no winner', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ]
      
      const status = getGameStatus(board)
      expect(status).toBe('tie')
    })
  })

  describe('isBoardFull', () => {
    it('should return true for full board', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ]
      
      expect(isBoardFull(board)).toBe(true)
    })

    it('should return false for board with empty cells', () => {
      const board: Board = [
        ['X', 'O', null],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ]
      
      expect(isBoardFull(board)).toBe(false)
    })

    it('should return false for empty board', () => {
      const board = createEmptyBoard()
      expect(isBoardFull(board)).toBe(false)
    })
  })

  describe('getNextPlayer', () => {
    it('should return O when current player is X', () => {
      expect(getNextPlayer('X')).toBe('O')
    })

    it('should return X when current player is O', () => {
      expect(getNextPlayer('O')).toBe('X')
    })
  })

  describe('countEmptyCells', () => {
    it('should count empty cells correctly', () => {
      const board: Board = [
        ['X', 'O', null],
        [null, 'X', null],
        ['O', null, null]
      ]
      
      expect(countEmptyCells(board)).toBe(5)
    })

    it('should return 9 for empty board', () => {
      const board = createEmptyBoard()
      expect(countEmptyCells(board)).toBe(9)
    })

    it('should return 0 for full board', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ]
      
      expect(countEmptyCells(board)).toBe(0)
    })
  })

  describe('getPossibleMoves', () => {
    it('should return all positions for empty board', () => {
      const board = createEmptyBoard()
      const moves = getPossibleMoves(board)
      
      expect(moves).toHaveLength(9)
      expect(moves).toContainEqual({ row: 0, col: 0 })
      expect(moves).toContainEqual({ row: 1, col: 1 })
      expect(moves).toContainEqual({ row: 2, col: 2 })
    })

    it('should return only empty positions', () => {
      const board: Board = [
        ['X', 'O', null],
        [null, 'X', null],
        ['O', null, null]
      ]
      
      const moves = getPossibleMoves(board)
      expect(moves).toHaveLength(5)
      expect(moves).toContainEqual({ row: 0, col: 2 })
      expect(moves).toContainEqual({ row: 1, col: 0 })
      expect(moves).toContainEqual({ row: 1, col: 2 })
      expect(moves).toContainEqual({ row: 2, col: 1 })
      expect(moves).toContainEqual({ row: 2, col: 2 })
    })

    it('should return empty array for full board', () => {
      const board: Board = [
        ['X', 'O', 'X'],
        ['O', 'O', 'X'],
        ['O', 'X', 'O']
      ]
      
      const moves = getPossibleMoves(board)
      expect(moves).toHaveLength(0)
    })
  })

  describe('Performance Tests', () => {
    it('should check winner quickly for large number of boards', () => {
      const start = performance.now()
      
      // Test with 1000 different board configurations
      for (let i = 0; i < 1000; i++) {
        const board = createEmptyBoard()
        // Fill random positions
        const positions = Math.floor(Math.random() * 9)
        for (let j = 0; j < positions; j++) {
          const row = Math.floor(Math.random() * 3)
          const col = Math.floor(Math.random() * 3)
          if (board[row][col] === null) {
            board[row][col] = Math.random() > 0.5 ? 'X' : 'O'
          }
        }
        checkWinnerWithCombination(board)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 1000 checks in less than 10ms (very fast)
      expect(duration).toBeLessThan(10)
    })

    it('should validate moves quickly', () => {
      const board = createEmptyBoard()
      const start = performance.now()
      
      // Test 10000 move validations
      for (let i = 0; i < 10000; i++) {
        const row = Math.floor(Math.random() * 5) - 1 // Include invalid coordinates
        const col = Math.floor(Math.random() * 5) - 1
        isValidMove(board, row, col)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 10000 validations in less than 5ms
      expect(duration).toBeLessThan(5)
    })

    it('should calculate possible moves quickly', () => {
      const start = performance.now()
      
      // Test with 1000 different board configurations
      for (let i = 0; i < 1000; i++) {
        const board = createEmptyBoard()
        // Fill random positions
        const positions = Math.floor(Math.random() * 9)
        for (let j = 0; j < positions; j++) {
          const row = Math.floor(Math.random() * 3)
          const col = Math.floor(Math.random() * 3)
          if (board[row][col] === null) {
            board[row][col] = Math.random() > 0.5 ? 'X' : 'O'
          }
        }
        getPossibleMoves(board)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // Should complete 1000 possible move calculations in less than 5ms
      expect(duration).toBeLessThan(5)
    })
  })
})