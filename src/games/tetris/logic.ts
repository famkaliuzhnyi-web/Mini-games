/**
 * Tetris Game Logic
 */
import type { 
  GameBoard, 
  CellValue, 
  TetrisPiece, 
  PieceType, 
  Position, 
  PieceDefinition
} from './types';

// Game constants
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BOARD_BUFFER = 4; // Hidden rows at top for piece spawning

// Tetris piece definitions with rotation states
export const PIECE_DEFINITIONS: Record<PieceType, PieceDefinition> = {
  I: {
    type: 'I',
    color: '#00f0f0',
    shapes: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], // Horizontal
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]], // Vertical
      [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]], // Horizontal
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]]  // Vertical
    ]
  },
  O: {
    type: 'O',
    color: '#f0f000',
    shapes: [
      [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // Square (no rotation)
      [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]]
    ]
  },
  T: {
    type: 'T',
    color: '#a000f0',
    shapes: [
      [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // T
      [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]], // Right
      [[0, 0, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]], // Upside down
      [[0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]  // Left
    ]
  },
  S: {
    type: 'S',
    color: '#00f000',
    shapes: [
      [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // S
      [[0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]], // Vertical
      [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]], // S
      [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]  // Vertical
    ]
  },
  Z: {
    type: 'Z',
    color: '#f00000',
    shapes: [
      [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // Z
      [[0, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]], // Vertical
      [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]], // Z
      [[0, 1, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]]  // Vertical
    ]
  },
  J: {
    type: 'J',
    color: '#0000f0',
    shapes: [
      [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // J
      [[0, 1, 1, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]], // Right
      [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]], // Upside down
      [[0, 1, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]]  // Left
    ]
  },
  L: {
    type: 'L',
    color: '#f0a000',
    shapes: [
      [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]], // L
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]], // Right
      [[0, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]], // Upside down
      [[1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]]  // Left
    ]
  }
};

// Create empty game board
export const createEmptyBoard = (): GameBoard => {
  return Array.from({ length: BOARD_HEIGHT + BOARD_BUFFER }, () => 
    Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue)
  );
};

// Generate random piece type
export const getRandomPieceType = (): PieceType => {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return pieces[Math.floor(Math.random() * pieces.length)];
};

// Create new tetris piece
export const createPiece = (type: PieceType): TetrisPiece => {
  return {
    type,
    shape: PIECE_DEFINITIONS[type].shapes[0],
    position: { row: 0, col: Math.floor((BOARD_WIDTH - 4) / 2) },
    rotation: 0
  };
};

// Check if position is valid for piece
export const isValidPosition = (board: GameBoard, piece: TetrisPiece, position: Position): boolean => {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (piece.shape[row][col]) {
        const newRow = position.row + row;
        const newCol = position.col + col;
        
        // Check bounds
        if (newRow < 0 || newRow >= BOARD_HEIGHT + BOARD_BUFFER || 
            newCol < 0 || newCol >= BOARD_WIDTH) {
          return false;
        }
        
        // Check collision with placed pieces
        if (board[newRow][newCol] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
};

// Rotate piece
export const rotatePiece = (piece: TetrisPiece): TetrisPiece => {
  const newRotation = (piece.rotation + 1) % 4;
  return {
    ...piece,
    rotation: newRotation,
    shape: PIECE_DEFINITIONS[piece.type].shapes[newRotation]
  };
};

// Place piece on board
export const placePiece = (board: GameBoard, piece: TetrisPiece): GameBoard => {
  const newBoard = board.map(row => [...row]);
  
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (piece.shape[row][col]) {
        const boardRow = piece.position.row + row;
        const boardCol = piece.position.col + col;
        if (boardRow >= 0 && boardRow < BOARD_HEIGHT + BOARD_BUFFER && 
            boardCol >= 0 && boardCol < BOARD_WIDTH) {
          newBoard[boardRow][boardCol] = piece.type;
        }
      }
    }
  }
  
  return newBoard;
};

// Check for completed lines
export const getCompletedLines = (board: GameBoard): number[] => {
  const completedLines: number[] = [];
  
  for (let row = BOARD_BUFFER; row < BOARD_HEIGHT + BOARD_BUFFER; row++) {
    if (board[row].every(cell => cell !== 0)) {
      completedLines.push(row);
    }
  }
  
  return completedLines;
};

// Clear completed lines
export const clearLines = (board: GameBoard, lines: number[]): GameBoard => {
  const newBoard = board.map(row => [...row]);
  
  // Remove completed lines (from bottom to top)
  const sortedLines = [...lines].sort((a, b) => b - a);
  for (const line of sortedLines) {
    newBoard.splice(line, 1);
    // Add empty line at top
    newBoard.unshift(Array.from({ length: BOARD_WIDTH }, () => 0 as CellValue));
  }
  
  return newBoard;
};

// Calculate score for cleared lines
export const calculateScore = (lines: number, level: number): number => {
  const baseScores = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 lines
  return baseScores[lines] * (level + 1);
};

// Calculate level based on lines cleared
export const calculateLevel = (totalLines: number): number => {
  return Math.floor(totalLines / 10);
};

// Calculate drop speed based on level
export const getDropSpeed = (level: number): number => {
  // Drop speed in milliseconds (faster as level increases)
  return Math.max(50, 1000 - (level * 50));
};

// Check if game is over
export const isGameOver = (board: GameBoard): boolean => {
  // Check if any cells in the visible area (starting from BOARD_BUFFER) are filled
  for (let col = 0; col < BOARD_WIDTH; col++) {
    if (board[BOARD_BUFFER][col] !== 0) {
      return true;
    }
  }
  return false;
};

// Get hard drop position
export const getHardDropPosition = (board: GameBoard, piece: TetrisPiece): Position => {
  const dropPosition = { ...piece.position };
  
  while (isValidPosition(board, piece, { row: dropPosition.row + 1, col: dropPosition.col })) {
    dropPosition.row++;
  }
  
  return dropPosition;
};