import type { Board, Cell, Piece, PieceType } from './types';

export const COLS = 10;
export const ROWS = 20;
export const TARGET_SCORE = 1500;

export const PIECE_COLORS: Record<PieceType, string> = {
  I: '#00e5ff',
  O: '#ffea00',
  T: '#e040fb',
  S: '#00e676',
  Z: '#ff5252',
  J: '#448aff',
  L: '#ff6d00',
};

// All 4 rotations per piece; each rotation is a list of rows (0=empty, 1=filled).
// I and O use 4×4, T/S/Z/J/L use 3×3.
export const SHAPES: Record<PieceType, readonly (readonly number[])[][]> = {
  I: [
    // 0
    [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    // 1
    [
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
      [0, 0, 1, 0],
    ],
    // 2
    [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
    ],
    // 3
    [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ],
  ],
  O: [
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
    [[1, 1], [1, 1]],
  ],
  T: [
    [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  S: [
    [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 0, 0],
      [0, 1, 1],
      [1, 1, 0],
    ],
    [
      [1, 0, 0],
      [1, 1, 0],
      [0, 1, 0],
    ],
  ],
  Z: [
    [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 1, 0],
      [1, 1, 0],
      [1, 0, 0],
    ],
  ],
  J: [
    [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 1],
      [0, 1, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [0, 0, 1],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  ],
  L: [
    [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    [
      [0, 1, 0],
      [0, 1, 0],
      [0, 1, 1],
    ],
    [
      [0, 0, 0],
      [1, 1, 1],
      [1, 0, 0],
    ],
    [
      [1, 1, 0],
      [0, 1, 0],
      [0, 1, 0],
    ],
  ],
};

export function emptyBoard(): Board {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function randomPieceType(): PieceType {
  return PIECE_TYPES[Math.floor(Math.random() * PIECE_TYPES.length)];
}

export function getShape(piece: Piece): number[][] {
  return SHAPES[piece.type][piece.rotation] as number[][];
}

export function spawnPiece(type: PieceType): Piece {
  const shape = SHAPES[type][0] as number[][];
  const cols = shape[0].length;
  const x = Math.floor((COLS - cols) / 2);
  // Start one row above visible board so piece slides in
  return { type, rotation: 0, x, y: -1 };
}

export function isValid(board: Board, piece: Piece): boolean {
  const shape = getShape(piece);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;
      const boardRow = piece.y + row;
      const boardCol = piece.x + col;
      // Allow above the board (negative rows) — only check bounds for rows >= 0
      if (boardRow >= ROWS) return false;
      if (boardCol < 0 || boardCol >= COLS) return false;
      if (boardRow >= 0 && board[boardRow][boardCol] !== null) return false;
    }
  }
  return true;
}

export function lockBoard(board: Board, piece: Piece): Board {
  const newBoard: Board = board.map(row => [...row]);
  const shape = getShape(piece);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (!shape[row][col]) continue;
      const boardRow = piece.y + row;
      const boardCol = piece.x + col;
      if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
        newBoard[boardRow][boardCol] = piece.type;
      }
    }
  }
  return newBoard;
}

export function clearLines(board: Board): { board: Board; count: number } {
  const remaining = board.filter(row => row.some(cell => cell === null));
  const count = ROWS - remaining.length;
  const empties: Board = Array.from({ length: count }, () => Array<Cell>(COLS).fill(null));
  return { board: [...empties, ...remaining], count };
}

export function ghostY(board: Board, piece: Piece): number {
  let y = piece.y;
  while (isValid(board, { ...piece, y: y + 1 })) {
    y++;
  }
  return y;
}

export function calcScore(cleared: number, level: number): number {
  const base = [0, 100, 300, 500, 800][cleared] ?? 0;
  return base * (level + 1);
}

export function fallSpeed(level: number): number {
  return Math.max(80, 800 - level * 75);
}
