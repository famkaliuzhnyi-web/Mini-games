/**
 * Snake Game Logic - Pure game mechanics without UI dependencies
 */

import type {
  Position,
  Snake,
  SnakeSegment,
  Direction,
  Food,
  SnakeGameData,
  GridCell,
  GameConfig,
  CollisionType,
  CellType
} from './types';

// Default game configuration
export const DEFAULT_CONFIG: GameConfig = {
  gridWidth: 20,
  gridHeight: 20,
  initialSnakeLength: 3,
  moveSpeed: 200,
  maxPlayers: 4
};

// Snake colors for multiplayer
export const SNAKE_COLORS = [
  '#4CAF50', // Green
  '#2196F3', // Blue  
  '#FF9800', // Orange
  '#E91E63'  // Pink
];

// Direction vectors for movement
const DIRECTION_VECTORS: Record<Direction, Position> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};

// Opposite directions (to prevent 180-degree turns)
const OPPOSITE_DIRECTIONS: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left'
};

/**
 * Creates initial game state
 */
export function createInitialGameState(
  playerId: string,
  config: Partial<GameConfig> = {},
  gameMode: 'single' | 'multiplayer' = 'single'
): SnakeGameData {
  const gameConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Create empty grid
  const grid: GridCell[][] = Array(gameConfig.gridHeight).fill(null).map(() =>
    Array(gameConfig.gridWidth).fill(null).map(() => ({ type: 'empty' as CellType }))
  );

  // Create initial snake
  const initialSnake = createSnake(playerId, 0, gameConfig);
  
  // Place snake on grid
  updateGridWithSnake(grid, initialSnake);

  // Spawn initial food
  const food = [spawnFood(grid, gameConfig)];
  updateGridWithFood(grid, food);

  return {
    grid,
    snakes: [initialSnake],
    food,
    config: gameConfig,
    stats: {
      totalFood: 1,
      gameStartTime: Date.now(),
      elapsedTime: 0
    },
    gameOver: false,
    isPaused: false,
    gameMode,
    currentTick: 0
  };
}

/**
 * Creates a new snake at starting position
 */
export function createSnake(playerId: string, playerIndex: number, config: GameConfig): Snake {
  const color = SNAKE_COLORS[playerIndex % SNAKE_COLORS.length];
  
  // Calculate starting position based on player index to avoid overlap
  const centerX = Math.floor(config.gridWidth / 2);
  const centerY = Math.floor(config.gridHeight / 2);
  
  // Position snakes in different quadrants for multiplayer
  const positions = [
    { x: centerX - 2, y: centerY }, // Player 0 - left center
    { x: centerX + 2, y: centerY }, // Player 1 - right center
    { x: centerX, y: centerY - 2 }, // Player 2 - top center
    { x: centerX, y: centerY + 2 }  // Player 3 - bottom center
  ];
  
  const startPos = positions[playerIndex % positions.length];
  
  // Create initial segments
  const segments: SnakeSegment[] = [];
  for (let i = 0; i < config.initialSnakeLength; i++) {
    segments.push({
      x: Math.max(0, Math.min(config.gridWidth - 1, startPos.x - i)),
      y: startPos.y
    });
  }

  return {
    id: playerId,
    segments,
    direction: 'right',
    alive: true,
    color,
    score: 0
  };
}

/**
 * Moves a snake one step in its current direction
 */
export function moveSnake(snake: Snake): Snake {
  if (!snake.alive) return snake;

  // Use buffered direction if available
  let direction = snake.direction;
  if (snake.nextDirection && isValidDirectionChange(snake.direction, snake.nextDirection)) {
    direction = snake.nextDirection;
  }

  const directionVector = DIRECTION_VECTORS[direction];
  const head = snake.segments[0];
  const newHead: SnakeSegment = {
    x: head.x + directionVector.x,
    y: head.y + directionVector.y
  };

  const newSegments = [newHead, ...snake.segments.slice(0, -1)]; // Remove tail

  return {
    ...snake,
    segments: newSegments,
    direction,
    nextDirection: undefined // Clear buffered direction
  };
}

/**
 * Grows a snake by adding a segment at the tail
 */
export function growSnake(snake: Snake): Snake {
  if (!snake.alive) return snake;

  const tail = snake.segments[snake.segments.length - 1];
  return {
    ...snake,
    segments: [...snake.segments, { ...tail }], // Duplicate tail
    score: snake.score + 10
  };
}

/**
 * Checks if a direction change is valid (not 180-degree turn)
 */
export function isValidDirectionChange(current: Direction, next: Direction): boolean {
  return OPPOSITE_DIRECTIONS[current] !== next;
}

/**
 * Detects collision type for a snake's head position
 */
export function detectCollision(
  position: Position, 
  snake: Snake, 
  allSnakes: Snake[], 
  config: GameConfig
): CollisionType | null {
  // Wall collision
  if (position.x < 0 || position.x >= config.gridWidth || 
      position.y < 0 || position.y >= config.gridHeight) {
    console.log(`Wall collision: position (${position.x}, ${position.y}), bounds (0-${config.gridWidth-1}, 0-${config.gridHeight-1})`);
    return 'wall';
  }

  // Self collision (skip head, which is at index 0)
  for (let i = 1; i < snake.segments.length; i++) {
    if (position.x === snake.segments[i].x && position.y === snake.segments[i].y) {
      console.log(`Self collision: head (${position.x}, ${position.y}) hit body segment ${i} (${snake.segments[i].x}, ${snake.segments[i].y})`);
      console.log('All segments:', snake.segments);
      return 'self';
    }
  }

  // Other snake collision
  for (const otherSnake of allSnakes) {
    if (otherSnake.id !== snake.id && otherSnake.alive) {
      for (const segment of otherSnake.segments) {
        if (position.x === segment.x && position.y === segment.y) {
          console.log(`Other snake collision: head (${position.x}, ${position.y}) hit snake ${otherSnake.id} segment (${segment.x}, ${segment.y})`);
          return 'other_snake';
        }
      }
    }
  }

  return null;
}

/**
 * Checks if a position contains food
 */
export function checkFoodCollision(position: Position, food: Food[]): Food | null {
  return food.find(f => f.x === position.x && f.y === position.y) || null;
}

/**
 * Spawns food at a random empty position
 */
export function spawnFood(grid: GridCell[][], config: GameConfig): Food {
  const emptyPositions: Position[] = [];
  
  // Find all empty cells
  for (let y = 0; y < config.gridHeight; y++) {
    for (let x = 0; x < config.gridWidth; x++) {
      if (grid[y][x].type === 'empty') {
        emptyPositions.push({ x, y });
      }
    }
  }

  // Random position from empty cells
  if (emptyPositions.length === 0) {
    // Fallback to center if no empty positions
    return {
      x: Math.floor(config.gridWidth / 2),
      y: Math.floor(config.gridHeight / 2),
      value: 10
    };
  }

  const randomIndex = Math.floor(Math.random() * emptyPositions.length);
  const position = emptyPositions[randomIndex];

  return {
    ...position,
    value: 10
  };
}

/**
 * Updates grid with snake positions
 */
export function updateGridWithSnake(grid: GridCell[][], snake: Snake): void {
  if (!snake.alive) return;

  for (const segment of snake.segments) {
    if (segment.y >= 0 && segment.y < grid.length && 
        segment.x >= 0 && segment.x < grid[0].length) {
      grid[segment.y][segment.x] = {
        type: 'snake',
        snakeId: snake.id
      };
    }
  }
}

/**
 * Updates grid with food positions
 */
export function updateGridWithFood(grid: GridCell[][], food: Food[]): void {
  for (const item of food) {
    if (item.y >= 0 && item.y < grid.length && 
        item.x >= 0 && item.x < grid[0].length) {
      grid[item.y][item.x] = {
        type: 'food',
        food: item
      };
    }
  }
}

/**
 * Clears and rebuilds the entire grid
 */
export function rebuildGrid(config: GameConfig, snakes: Snake[], food: Food[]): GridCell[][] {
  // Create empty grid
  const grid: GridCell[][] = Array(config.gridHeight).fill(null).map(() =>
    Array(config.gridWidth).fill(null).map(() => ({ type: 'empty' as CellType }))
  );

  // Add snakes
  for (const snake of snakes) {
    updateGridWithSnake(grid, snake);
  }

  // Add food
  updateGridWithFood(grid, food);

  return grid;
}

/**
 * Checks if the game is over (all snakes dead or only one alive in multiplayer)
 */
export function checkGameOver(snakes: Snake[], gameMode: 'single' | 'multiplayer'): boolean {
  const aliveSnakes = snakes.filter(s => s.alive);
  
  if (gameMode === 'single') {
    return aliveSnakes.length === 0;
  } else {
    // Multiplayer: game over when 0 or 1 snake remains
    return aliveSnakes.length <= 1;
  }
}

/**
 * Gets the winner (highest scoring alive snake, or undefined if no clear winner)
 */
export function getWinner(snakes: Snake[]): string | undefined {
  const aliveSnakes = snakes.filter(s => s.alive);
  
  if (aliveSnakes.length === 1) {
    return aliveSnakes[0].id;
  }
  
  // If multiple or zero alive, return highest scorer
  if (snakes.length > 0) {
    const highest = snakes.reduce((prev, current) => 
      (current.score > prev.score) ? current : prev
    );
    return highest.id;
  }
  
  return undefined;
}