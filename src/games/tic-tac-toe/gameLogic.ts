/**
 * Tic-Tac-Toe Game Logic Utilities
 */

import type { Board, Player, GameStatus, WinningCombination } from './types';

/**
 * Create an empty 3x3 board
 */
export const createEmptyBoard = (): Board => [
  [null, null, null],
  [null, null, null],
  [null, null, null]
];

/**
 * Check if a move is valid (cell is empty)
 */
export const isValidMove = (board: Board, row: number, col: number): boolean => {
  if (row < 0 || row > 2 || col < 0 || col > 2) {
    return false;
  }
  return board[row][col] === null;
};

/**
 * Make a move on the board
 */
export const makeMove = (board: Board, row: number, col: number, player: Player): Board => {
  if (!isValidMove(board, row, col)) {
    throw new Error('Invalid move');
  }
  
  const newBoard = board.map(boardRow => [...boardRow]) as Board;
  newBoard[row][col] = player;
  return newBoard;
};

/**
 * Check for winning condition and return winner with winning combination
 */
export const checkWinnerWithCombination = (board: Board): { winner: Player | null; combination?: WinningCombination } => {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
      return {
        winner: board[row][0],
        combination: {
          positions: [[row, 0], [row, 1], [row, 2]],
          type: 'row'
        }
      };
    }
  }
  
  // Check columns
  for (let col = 0; col < 3; col++) {
    if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
      return {
        winner: board[0][col],
        combination: {
          positions: [[0, col], [1, col], [2, col]],
          type: 'column'
        }
      };
    }
  }
  
  // Check main diagonal (top-left to bottom-right)
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return {
      winner: board[0][0],
      combination: {
        positions: [[0, 0], [1, 1], [2, 2]],
        type: 'diagonal'
      }
    };
  }
  
  // Check anti-diagonal (top-right to bottom-left)
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return {
      winner: board[0][2],
      combination: {
        positions: [[0, 2], [1, 1], [2, 0]],
        type: 'diagonal'
      }
    };
  }
  
  return { winner: null };
};

/**
 * Check for winning condition (legacy function for compatibility)
 */
export const checkWinner = (board: Board): Player | null => {
  const result = checkWinnerWithCombination(board);
  return result.winner;
};

/**
 * Check if board is full (no empty cells)
 */
export const isBoardFull = (board: Board): boolean => {
  return board.every(row => row.every(cell => cell !== null));
};

/**
 * Determine current game status with winning combination
 */
export const getGameStatusWithCombination = (board: Board): { 
  status: GameStatus; 
  winningCombination?: WinningCombination;
} => {
  const { winner, combination } = checkWinnerWithCombination(board);
  
  if (winner === 'X') return { status: 'X-wins', winningCombination: combination };
  if (winner === 'O') return { status: 'O-wins', winningCombination: combination };
  if (isBoardFull(board)) return { status: 'tie' };
  
  return { status: 'playing' };
};

/**
 * Determine current game status (legacy function for compatibility)
 */
export const getGameStatus = (board: Board): GameStatus => {
  const result = getGameStatusWithCombination(board);
  return result.status;
};

/**
 * Get next player
 */
export const getNextPlayer = (currentPlayer: Player): Player => {
  return currentPlayer === 'X' ? 'O' : 'X';
};

/**
 * Count empty cells on the board
 */
export const countEmptyCells = (board: Board): number => {
  return board.flat().filter(cell => cell === null).length;
};

/**
 * Get all possible moves
 */
export const getPossibleMoves = (board: Board): { row: number; col: number }[] => {
  const moves: { row: number; col: number }[] = [];
  
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      if (board[row][col] === null) {
        moves.push({ row, col });
      }
    }
  }
  
  return moves;
};