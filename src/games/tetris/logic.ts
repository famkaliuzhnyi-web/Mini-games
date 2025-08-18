/**
 * Tetris game logic - completely rewritten to eliminate TypeErrors
 * This implementation includes comprehensive error handling and type safety
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
  if (typeof playerCount !== 'number' || playerCount < 1) {
    return GRID_WIDTH;
  }
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
 * Safely get grid dimensions
 */
function getGridDimensions(grid: TetrisGrid): { width: number; height: number } {
  if (!Array.isArray(grid) || grid.length === 0) {
    return { width: GRID_WIDTH, height: GRID_HEIGHT };
  }
  
  const height = grid.length;
  const width = Array.isArray(grid[0]) ? grid[0].length : GRID_WIDTH;
  
  return { width, height };
}

/**
 * Safely check if grid position is within bounds
 */
function isWithinBounds(x: number, y: number, gridWidth: number, gridHeight: number): boolean {
  return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

/**
 * Safely access grid cell
 */
function getGridCell(grid: TetrisGrid, x: number, y: number): CellValue {
  if (!Array.isArray(grid) || !Array.isArray(grid[y]) || x < 0 || y < 0) {
    return 0; // Default to empty
  }
  
  const cell = grid[y]?.[x];
  return typeof cell === 'number' ? cell as CellValue : 0;
}

/**
 * Safely set grid cell
 */
function setGridCell(grid: TetrisGrid, x: number, y: number, value: CellValue): void {
  if (!Array.isArray(grid) || !Array.isArray(grid[y]) || x < 0 || y < 0) {
    return; // Silently ignore invalid coordinates
  }
  
  if (grid[y] && typeof grid[y][x] !== 'undefined') {
    grid[y][x] = value;
  }
}

/**
 * Create an empty game grid with error checking
 */
export function createEmptyGrid(width: number = GRID_WIDTH): TetrisGrid {
  const safeWidth = Math.max(1, Math.min(width || GRID_WIDTH, 100)); // Constrain width
  const safeHeight = GRID_HEIGHT;
  
  const grid: TetrisGrid = [];
  for (let row = 0; row < safeHeight; row++) {
    const gridRow: CellValue[] = [];
    for (let col = 0; col < safeWidth; col++) {
      gridRow.push(0);
    }
    grid.push(gridRow);
  }
  
  return grid;
}

/**
 * Get random piece type with error handling
 */
export function getRandomPieceType(): PieceType {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const randomIndex = Math.floor(Math.random() * pieces.length);
  return pieces[randomIndex] || 'I'; // Fallback to 'I' if something goes wrong
}

/**
 * Generate initial queue of next pieces (7-bag randomization for fairness)
 * Completely rewritten to avoid array mutation issues
 */
export function generateNextPieces(): PieceType[] {
  const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
  const queue: PieceType[] = [];
  
  // Generate two full bags to ensure we have enough pieces
  for (let bagCount = 0; bagCount < 2; bagCount++) {
    // Create a copy of pieces array for each bag
    const bagPieces = [...pieces];
    
    // Shuffle the bag using Fisher-Yates algorithm
    for (let i = bagPieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [bagPieces[i], bagPieces[j]] = [bagPieces[j], bagPieces[i]];
    }
    
    // Add shuffled pieces to queue
    queue.push(...bagPieces);
  }
  
  // Return first 6 pieces
  return queue.slice(0, 6);
}

/**
 * Advance the next pieces queue safely
 */
export function advanceNextPieces(nextPieces: PieceType[]): PieceType[] {
  if (!Array.isArray(nextPieces) || nextPieces.length === 0) {
    return generateNextPieces();
  }
  
  // Create a safe copy
  const newQueue = [...nextPieces];
  
  // Remove first piece if possible
  if (newQueue.length > 0) {
    newQueue.shift();
  }
  
  // Add a new random piece to the end
  newQueue.push(getRandomPieceType());
  
  // Ensure we always have at least 5 pieces
  while (newQueue.length < 5) {
    newQueue.push(getRandomPieceType());
  }
  
  return newQueue;
}

/**
 * Get the next piece from the queue and advance it safely
 */
export function consumeNextPiece(nextPieces: PieceType[]): { piece: PieceType; newQueue: PieceType[] } {
  if (!Array.isArray(nextPieces) || nextPieces.length === 0) {
    const newQueue = generateNextPieces();
    return {
      piece: newQueue[0] || 'I',
      newQueue: advanceNextPieces(newQueue)
    };
  }
  
  const piece = nextPieces[0] || getRandomPieceType();
  const newQueue = advanceNextPieces(nextPieces);
  
  return { piece, newQueue };
}

/**
 * Create a ghost piece showing where the active piece will land with bounds checking
 */
export function createGhostPiece(grid: TetrisGrid, activePiece: ActivePiece): ActivePiece | null {
  if (!activePiece || !activePiece.shape || !activePiece.position) {
    return null;
  }
  
  let ghostPiece = { ...activePiece };
  let iterations = 0;
  const maxIterations = GRID_HEIGHT + 5; // Prevent infinite loops
  
  // Drop the piece as far as possible
  while (iterations < maxIterations) {
    const nextPiece = movePiece(ghostPiece, 'down');
    if (isValidPosition(grid, nextPiece)) {
      ghostPiece = nextPiece;
      iterations++;
    } else {
      break;
    }
  }
  
  return ghostPiece;
}

/**
 * Create a new active piece with comprehensive error checking
 */
export function createActivePiece(
  type: PieceType, 
  playerId?: string, 
  columnStart: number = 0, 
  gridWidth: number = GRID_WIDTH
): ActivePiece {
  // Validate piece type
  if (!type || !PIECE_SHAPES[type]) {
    type = 'I'; // Fallback to I piece
  }
  
  // Validate parameters
  const safeColumnStart = Math.max(0, columnStart || 0);
  const safeGridWidth = Math.max(GRID_WIDTH, gridWidth || GRID_WIDTH);
  
  // Calculate spawn position within player's section
  const sectionCenter = safeColumnStart + Math.floor(COLUMNS_PER_PLAYER / 2);
  const spawnX = Math.max(0, Math.min(sectionCenter - 2, safeGridWidth - 4));
  
  // Get the piece shape safely
  const shapes = PIECE_SHAPES[type];
  const shape = (shapes && shapes[0]) ? shapes[0] : PIECE_SHAPES.I[0];
  
  return {
    type,
    shape,
    position: { x: spawnX, y: 0 },
    rotation: 0,
    playerId
  };
}

/**
 * Check if a piece position is valid with comprehensive bounds checking
 */
export function isValidPosition(grid: TetrisGrid, piece: ActivePiece): boolean {
  if (!piece || !piece.shape || !piece.position) {
    return false;
  }
  
  const { shape, position } = piece;
  const { width: gridWidth, height: gridHeight } = getGridDimensions(grid);
  
  // Check if shape is valid
  if (!Array.isArray(shape)) {
    return false;
  }
  
  for (let row = 0; row < shape.length; row++) {
    const shapeRow = shape[row];
    if (!Array.isArray(shapeRow)) {
      continue; // Skip invalid rows
    }
    
    for (let col = 0; col < shapeRow.length; col++) {
      if (shapeRow[col] !== 0) {
        const gridX = position.x + col;
        const gridY = position.y + row;
        
        // Check boundaries
        if (gridX < 0 || gridX >= gridWidth || gridY >= gridHeight) {
          return false;
        }
        
        // Check collision with existing pieces (but allow negative Y for pieces entering)
        if (gridY >= 0 && getGridCell(grid, gridX, gridY) !== 0) {
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Move a piece in the specified direction with error checking
 */
export function movePiece(piece: ActivePiece, direction: MoveDirection): ActivePiece {
  if (!piece || !piece.position) {
    return piece; // Return unchanged if invalid
  }
  
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
    default:
      // Invalid direction, return unchanged
      return piece;
  }
  
  return { ...piece, position: newPosition };
}

/**
 * Rotate a piece with comprehensive error checking
 */
export function rotatePiece(piece: ActivePiece, direction: RotationDirection): ActivePiece {
  if (!piece || !piece.type || typeof piece.rotation !== 'number') {
    return piece; // Return unchanged if invalid
  }
  
  const shapes = PIECE_SHAPES[piece.type];
  if (!shapes || !Array.isArray(shapes)) {
    return piece; // Return unchanged if no shapes available
  }
  
  const newRotation = direction === 'clockwise' 
    ? (piece.rotation + 1) % 4
    : (piece.rotation + 3) % 4; // +3 is same as -1 mod 4
  
  const newShape = shapes[newRotation];
  if (!newShape) {
    return piece; // Return unchanged if shape doesn't exist
  }
  
  return {
    ...piece,
    rotation: newRotation,
    shape: newShape
  };
}

/**
 * Place a piece onto the grid with comprehensive error checking
 */
export function placePiece(grid: TetrisGrid, piece: ActivePiece): TetrisGrid {
  if (!piece || !piece.shape || !piece.position || !Array.isArray(grid)) {
    return grid; // Return unchanged if invalid
  }
  
  // Create a deep copy of the grid
  const newGrid: TetrisGrid = grid.map(row => Array.isArray(row) ? [...row] : []);
  const { shape, position } = piece;
  const color = PIECE_COLORS[piece.type] || 1; // Fallback color
  const { width: gridWidth, height: gridHeight } = getGridDimensions(newGrid);
  
  if (!Array.isArray(shape)) {
    return newGrid; // Return unchanged if shape is invalid
  }
  
  for (let row = 0; row < shape.length; row++) {
    const shapeRow = shape[row];
    if (!Array.isArray(shapeRow)) {
      continue; // Skip invalid rows
    }
    
    for (let col = 0; col < shapeRow.length; col++) {
      if (shapeRow[col] !== 0) {
        const gridX = position.x + col;
        const gridY = position.y + row;
        
        if (isWithinBounds(gridX, gridY, gridWidth, gridHeight)) {
          setGridCell(newGrid, gridX, gridY, color);
        }
      }
    }
  }
  
  return newGrid;
}

/**
 * Check for and clear completed lines with robust error handling
 */
export function clearCompletedLines(grid: TetrisGrid): { grid: TetrisGrid; linesCleared: number } {
  if (!Array.isArray(grid) || grid.length === 0) {
    return { grid: createEmptyGrid(), linesCleared: 0 };
  }
  
  const { width: gridWidth, height: gridHeight } = getGridDimensions(grid);
  const newGrid: TetrisGrid = [];
  let linesCleared = 0;
  
  // Check each row from bottom to top
  for (let row = gridHeight - 1; row >= 0; row--) {
    const gridRow = grid[row];
    if (!Array.isArray(gridRow)) {
      // If row is invalid, create empty row
      newGrid.unshift(Array(gridWidth).fill(0));
      continue;
    }
    
    // Check if line is complete
    let isComplete = true;
    for (let col = 0; col < gridWidth; col++) {
      const cell = gridRow[col];
      if (typeof cell !== 'number' || cell === 0) {
        isComplete = false;
        break;
      }
    }
    
    if (isComplete) {
      linesCleared++;
      // Don't add this row to new grid (it's cleared)
    } else {
      // Add the row to new grid, ensuring it has correct width
      const newRow: CellValue[] = [];
      for (let col = 0; col < gridWidth; col++) {
        const cell = gridRow[col];
        newRow.push(typeof cell === 'number' ? cell as CellValue : 0);
      }
      newGrid.unshift(newRow);
    }
  }
  
  // Add empty rows at the top for cleared lines
  while (newGrid.length < gridHeight) {
    newGrid.unshift(Array(gridWidth).fill(0));
  }
  
  return { grid: newGrid, linesCleared };
}

/**
 * Check if game is over with error handling
 */
export function isGameOver(grid: TetrisGrid, piece: ActivePiece): boolean {
  if (!piece) {
    return true; // No piece means game over
  }
  
  return !isValidPosition(grid, piece);
}

/**
 * Calculate score based on lines cleared and level
 */
export function calculateScore(linesCleared: number, level: number): number {
  if (typeof linesCleared !== 'number' || typeof level !== 'number') {
    return 0;
  }
  
  const baseScores = [0, 40, 100, 300, 1200]; // 0, 1, 2, 3, 4 lines
  const safeIndex = Math.max(0, Math.min(linesCleared, baseScores.length - 1));
  const safeLevel = Math.max(0, level);
  
  return baseScores[safeIndex] * (safeLevel + 1);
}

/**
 * Calculate level based on total lines cleared
 */
export function calculateLevel(totalLines: number): number {
  if (typeof totalLines !== 'number' || totalLines < 0) {
    return 0;
  }
  
  return Math.floor(totalLines / 10); // Level up every 10 lines
}

/**
 * Calculate drop speed based on level
 */
export function calculateDropSpeed(level: number): number {
  if (typeof level !== 'number' || level < 0) {
    return INITIAL_DROP_SPEED;
  }
  
  return Math.max(50, Math.floor(INITIAL_DROP_SPEED * Math.pow(SPEED_INCREASE_FACTOR, level)));
}

/**
 * Check if the danger zone is active (pieces in top few rows)
 */
export function isDangerZoneActive(grid: TetrisGrid): boolean {
  if (!Array.isArray(grid)) {
    return false;
  }
  
  // Check top 4 rows for any placed pieces
  for (let row = 0; row < Math.min(4, grid.length); row++) {
    const gridRow = grid[row];
    if (Array.isArray(gridRow)) {
      for (let col = 0; col < gridRow.length; col++) {
        const cell = gridRow[col];
        if (typeof cell === 'number' && cell !== 0) {
          return true;
        }
      }
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
 * Update game statistics after clearing lines with error checking
 */
export function updateStats(stats: GameStats, linesCleared: number, gameStartTime: number): GameStats {
  if (!stats || typeof stats !== 'object') {
    stats = createInitialStats();
  }
  
  const safeLinesCleared = typeof linesCleared === 'number' ? Math.max(0, linesCleared) : 0;
  const safeGameStartTime = typeof gameStartTime === 'number' ? gameStartTime : Date.now();
  
  const newLines = (stats.lines || 0) + safeLinesCleared;
  const newLevel = calculateLevel(newLines);
  const scoreGain = calculateScore(safeLinesCleared, newLevel);
  const elapsedTime = Math.floor((Date.now() - safeGameStartTime) / 1000);
  
  return {
    score: (stats.score || 0) + scoreGain,
    level: newLevel,
    lines: newLines,
    pieces: (stats.pieces || 0) + (safeLinesCleared > 0 ? 0 : 1),
    elapsedTime: Math.max(0, elapsedTime)
  };
}

/**
 * Create player column assignments for multiplayer
 */
export function createPlayerColumns(playerCount: number): { columnStart: number; columnEnd: number }[] {
  const safePlayerCount = Math.max(1, Math.min(playerCount || 1, 10)); // Limit to reasonable number
  const assignments: { columnStart: number; columnEnd: number }[] = [];
  
  for (let i = 0; i < safePlayerCount; i++) {
    assignments.push({
      columnStart: i * COLUMNS_PER_PLAYER,
      columnEnd: (i + 1) * COLUMNS_PER_PLAYER
    });
  }
  
  return assignments;
}

/**
 * Get player by ID from multiplayer state with error checking
 */
export function getPlayerById(multiplayer: MultiplayerGameState, playerId: string): TetrisPlayer | null {
  if (!multiplayer || !Array.isArray(multiplayer.players) || !playerId) {
    return null;
  }
  
  return multiplayer.players.find(p => p && p.id === playerId) || null;
}