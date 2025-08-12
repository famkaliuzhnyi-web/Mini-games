/**
 * Tic-Tac-Toe Game Logic Utilities
 */

import type { Board, Player, GameStatus } from './types';

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
 * Check for winning condition
 */
export const checkWinner = (board: Board): Player | null => {
  // Check rows
  for (let row = 0; row < 3; row++) {
    if (board[row][0] && board[row][0] === board[row][1] && board[row][1] === board[row][2]) {
      return board[row][0];
    }
  }
  
  // Check columns
  for (let col = 0; col < 3; col++) {
    if (board[0][col] && board[0][col] === board[1][col] && board[1][col] === board[2][col]) {
      return board[0][col];
    }
  }
  
  // Check diagonals
  if (board[0][0] && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
    return board[0][0];
  }
  
  if (board[0][2] && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
    return board[0][2];
  }
  
  return null;
};

/**
 * Check if board is full (no empty cells)
 */
export const isBoardFull = (board: Board): boolean => {
  return board.every(row => row.every(cell => cell !== null));
};

/**
 * Determine current game status
 */
export const getGameStatus = (board: Board): GameStatus => {
  const winner = checkWinner(board);
  
  if (winner === 'X') return 'X-wins';
  if (winner === 'O') return 'O-wins';
  if (isBoardFull(board)) return 'tie';
  
  return 'playing';
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