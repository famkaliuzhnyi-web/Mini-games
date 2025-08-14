/**
 * Tetris game logic - pure functions for game mechanics
 */
import type { 
  TetrisGrid, 
  PieceType, 
  PieceShape, 
  ActivePiece, 
  CellValue, 
  GameStats,
  MoveDirection,
  RotationDirection,
  MultiplayerGameState,
  TetrisPlayer
} from './types';

// Game constants
export const GRID_WIDTH = 10;
export const GRID_HEIGHT = 20;
export const INITIAL_DROP_SPEED = 1000; // 1 second
export const SPEED_INCREASE_FACTOR = 0.9; // Speed multiplies by this each level
export const COLUMNS_PER_PLAYER = 10; // Each player gets 10 columns

/**
 * Calculate grid width based on number of players
 */
export function calculateGridWidth(playerCount: number): number {
  return Math.max(GRID_WIDTH, playerCount * COLUMNS_PER_PLAYER);
}

// Tetromino piece definitions with their shapes and colors
export const PIECE_SHAPES: Record<PieceType, PieceShape[]> = {
  I: [
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,0,1,0], [0,0,1,0], [0,0,1,0], [0,0,1,0]], // 90°
    [[0,0,0,0], [0,0,0,0], [1,1,1,1], [0,0,0,0]], // 180°
    [[0,1,0,0], [0,1,0,0], [0,1,0,0], [0,1,0,0]]  // 270°
  ],
  O: [
    [[0,1,1,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]], // Same for all rotations
    [[0,1,1,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]],
    [[0,1,1,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]],
    [[0,1,1,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]]
  ],
  T: [
    [[0,1,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,1,0,0], [0,1,1,0], [0,1,0,0], [0,0,0,0]], // 90°
    [[0,0,0,0], [1,1,1,0], [0,1,0,0], [0,0,0,0]], // 180°
    [[0,1,0,0], [1,1,0,0], [0,1,0,0], [0,0,0,0]]  // 270°
  ],
  S: [
    [[0,1,1,0], [1,1,0,0], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,1,0,0], [0,1,1,0], [0,0,1,0], [0,0,0,0]], // 90°
    [[0,0,0,0], [0,1,1,0], [1,1,0,0], [0,0,0,0]], // 180°
    [[1,0,0,0], [1,1,0,0], [0,1,0,0], [0,0,0,0]]  // 270°
  ],
  Z: [
    [[1,1,0,0], [0,1,1,0], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,0,1,0], [0,1,1,0], [0,1,0,0], [0,0,0,0]], // 90°
    [[0,0,0,0], [1,1,0,0], [0,1,1,0], [0,0,0,0]], // 180°
    [[0,1,0,0], [1,1,0,0], [1,0,0,0], [0,0,0,0]]  // 270°
  ],
  J: [
    [[1,0,0,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,1,1,0], [0,1,0,0], [0,1,0,0], [0,0,0,0]], // 90°
    [[0,0,0,0], [1,1,1,0], [0,0,1,0], [0,0,0,0]], // 180°
    [[0,1,0,0], [0,1,0,0], [1,1,0,0], [0,0,0,0]]  // 270°
  ],
  L: [
    [[0,0,1,0], [1,1,1,0], [0,0,0,0], [0,0,0,0]], // 0°
    [[0,1,0,0], [0,1,0,0], [0,1,1,0], [0,0,0,0]], // 90°
    [[0,0,0,0], [1,1,1,0], [1,0,0,0], [0,0,0,0]], // 180°
    [[1,1,0,0], [0,1,0,0], [0,1,0,0], [0,0,0,0]]  // 270°
  ]
};

// Map piece types to cell values (colors)
export const PIECE_COLORS: Record<PieceType, CellValue> = {
  I: 1, // Cyan
  O: 2, // Yellow  
  T: 3, // Purple
  S: 4, // Green
  Z: 5, // Red
  J: 6, // Blue
  L: 7  // Orange
};

/**
 * Create an empty game grid
 */
export function createEmptyGrid(width: number = GRID_WIDTH): TetrisGrid {
  return Array(GRID_HEIGHT).fill(null).map(() => Array(width).fill(0));
}

/**
 * Get random piece type
 */
export function getRandomPieceType(): PieceType {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  return pieces[Math.floor(Math.random() * pieces.length)];
}

/**
 * Generate initial queue of next pieces (7-bag randomization for fairness)
 */
export function generateNextPieces(): PieceType[] {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const queue: PieceType[] = [];
  
  // Generate two full bags to ensure we have enough pieces
  for (let i = 0; i < 2; i++) {
    const bag = [...pieces];
    while (bag.length > 0) {
      const randomIndex = Math.floor(Math.random() * bag.length);
      queue.push(bag.splice(randomIndex, 1)[0]);
    }
  }
  
  return queue.slice(0, 6); // Return first 6 pieces
}

/**
 * Create a ghost piece showing where the active piece will land
 */
export function createGhostPiece(grid: TetrisGrid, activePiece: ActivePiece): ActivePiece | null {
  if (!activePiece) return null;
  
  let ghostPiece = { ...activePiece };
  
  // Drop the piece as far as possible
  while (isValidPosition(grid, movePiece(ghostPiece, 'down'))) {
    ghostPiece = movePiece(ghostPiece, 'down');
  }
  
  return ghostPiece;
}

/**
 * Create a new active piece for a specific player
 */
export function createActivePiece(type: PieceType, playerId?: string, columnStart: number = 0, gridWidth: number = GRID_WIDTH): ActivePiece {
  // Calculate spawn position within player's section
  const sectionCenter = columnStart + Math.floor(COLUMNS_PER_PLAYER / 2);
  const spawnX = Math.max(0, Math.min(sectionCenter - 2, gridWidth - 4)); // Ensure piece fits
  
  return {
    type,
    shape: PIECE_SHAPES[type][0], // Start with 0° rotation
    position: { x: spawnX, y: 0 }, // Center in player's section
    rotation: 0,
    playerId
  };
}

/**
 * Check if a piece position is valid (no collision)
 */
export function isValidPosition(grid: TetrisGrid, piece: ActivePiece): boolean {
  const { shape, position } = piece;
  const gridWidth = grid[0]?.length || GRID_WIDTH;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const gridX = position.x + col;
        const gridY = position.y + row;
        
        // Check boundaries
        if (gridX < 0 || gridX >= gridWidth || gridY >= GRID_HEIGHT) {
          return false;
        }
        
        // Check collision with existing pieces (but allow negative Y for pieces entering)
        if (gridY >= 0 && grid[gridY][gridX] !== 0) {
          return false;
        }
      }
    }
  }
  return true;
}

/**
 * Move a piece in the specified direction
 */
export function movePiece(piece: ActivePiece, direction: MoveDirection): ActivePiece {
  const newPosition = { ...piece.position };
  
  switch (direction) {
    case 'left':
      newPosition.x -= 1;
      break;
    case 'right':
      newPosition.x += 1;
      break;
    case 'down':
      newPosition.y += 1;
      break;
  }
  
  return { ...piece, position: newPosition };
}

/**
 * Rotate a piece
 */
export function rotatePiece(piece: ActivePiece, direction: RotationDirection): ActivePiece {
  const newRotation = direction === 'clockwise' 
    ? (piece.rotation + 1) % 4
    : (piece.rotation + 3) % 4; // +3 is same as -1 mod 4
  
  return {
    ...piece,
    rotation: newRotation,
    shape: PIECE_SHAPES[piece.type][newRotation]
  };
}

/**
 * Place a piece onto the grid
 */
export function placePiece(grid: TetrisGrid, piece: ActivePiece): TetrisGrid {
  const newGrid = grid.map(row => [...row]);
  const { shape, position } = piece;
  const color = PIECE_COLORS[piece.type];
  const gridWidth = grid[0]?.length || GRID_WIDTH;
  
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col] !== 0) {
        const gridX = position.x + col;
        const gridY = position.y + row;
        
        if (gridY >= 0 && gridY < GRID_HEIGHT && gridX >= 0 && gridX < gridWidth) {
          newGrid[gridY][gridX] = color;
        }
      }
    }
  }
  
  return newGrid;
}

/**
 * Check for and clear completed lines
 */
export function clearCompletedLines(grid: TetrisGrid): { grid: TetrisGrid; linesCleared: number } {
  const newGrid: TetrisGrid = [];
  const gridWidth = grid[0]?.length || GRID_WIDTH;
  let linesCleared = 0;
  
  // Check each row from bottom to top
  for (let row = GRID_HEIGHT - 1; row >= 0; row--) {
    if (grid[row].every(cell => cell !== 0)) {
      // Line is complete, don't add it to new grid
      linesCleared++;
    } else {
      // Line is not complete, add it to new grid
      newGrid.unshift([...grid[row]]);
    }
  }
  
  // Add empty rows at the top for cleared lines
  while (newGrid.length < GRID_HEIGHT) {
    newGrid.unshift(Array(gridWidth).fill(0));
  }
  
  return { grid: newGrid, linesCleared };
}

/**
 * Check if game is over (piece can't be placed at spawn)
 */
export function isGameOver(grid: TetrisGrid, piece: ActivePiece): boolean {
  return !isValidPosition(grid, piece);
}

/**
 * Calculate score based on lines cleared and level
 */
export function calculateScore(linesCleared: number, level: number): number {
  const baseScores = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 lines
  return (baseScores[linesCleared] || 0) * (level + 1);
}

/**
 * Calculate level based on total lines cleared
 */
export function calculateLevel(totalLines: number): number {
  return Math.floor(totalLines / 10); // Level up every 10 lines
}

/**
 * Calculate drop speed based on level
 */
export function calculateDropSpeed(level: number): number {
  return Math.max(50, Math.floor(INITIAL_DROP_SPEED * Math.pow(SPEED_INCREASE_FACTOR, level)));
}

/**
 * Check if the danger zone is active (pieces in top few rows)
 */
export function isDangerZoneActive(grid: TetrisGrid): boolean {
  // Check top 4 rows for any placed pieces
  for (let row = 0; row < 4; row++) {
    if (grid[row].some(cell => cell !== 0)) {
      return true;
    }
  }
  return false;
}

/**
 * Initialize game statistics
 */
export function createInitialStats(): GameStats {
  return {
    score: 0,
    level: 0,
    lines: 0,
    pieces: 0,
    elapsedTime: 0
  };
}

/**
 * Update game statistics after clearing lines
 */
export function updateStats(stats: GameStats, linesCleared: number, gameStartTime: number): GameStats {
  const newLines = stats.lines + linesCleared;
  const newLevel = calculateLevel(newLines);
  const scoreGain = calculateScore(linesCleared, newLevel);
  const elapsedTime = Math.floor((Date.now() - gameStartTime) / 1000);
  
  return {
    score: stats.score + scoreGain,
    level: newLevel,
    lines: newLines,
    pieces: stats.pieces + (linesCleared > 0 ? 0 : 1), // Only count piece if no lines cleared this turn
    elapsedTime
  };
}

/**
 * Create player column assignments for multiplayer
 */
export function createPlayerColumns(playerCount: number): { columnStart: number; columnEnd: number }[] {
  const assignments: { columnStart: number; columnEnd: number }[] = [];
  
  for (let i = 0; i < playerCount; i++) {
    assignments.push({
      columnStart: i * COLUMNS_PER_PLAYER,
      columnEnd: (i + 1) * COLUMNS_PER_PLAYER
    });
  }
  
  return assignments;
}

/**
 * Get player by ID from multiplayer state
 */
export function getPlayerById(multiplayer: MultiplayerGameState, playerId: string): TetrisPlayer | null {
  return multiplayer.players.find(p => p.id === playerId) || null;
}