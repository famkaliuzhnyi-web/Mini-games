/**
 * 2048 Game Logic
 */
import type { GameGrid, TileValue, Direction, MoveResult, Position } from './types';

// Create an empty 4x4 grid
export const createEmptyGrid = (): GameGrid => {
  return Array.from({ length: 4 }, () => Array.from({ length: 4 }, () => 0 as TileValue));
};

// Create initial grid with 2 random tiles
export const createInitialGrid = (): GameGrid => {
  const grid = createEmptyGrid();
  addRandomTile(grid);
  addRandomTile(grid);
  return grid;
};

// Get all empty positions in the grid
export const getEmptyPositions = (grid: GameGrid): Position[] => {
  const empty: Position[] = [];
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
};

// Add a random tile (90% chance of 2, 10% chance of 4) to an empty position
export const addRandomTile = (grid: GameGrid): boolean => {
  const emptyPositions = getEmptyPositions(grid);
  if (emptyPositions.length === 0) {
    return false;
  }

  const randomPosition = emptyPositions[Math.floor(Math.random() * emptyPositions.length)];
  const value = Math.random() < 0.9 ? 2 : 4;
  grid[randomPosition.row][randomPosition.col] = value as TileValue;
  return true;
};

// Deep copy a grid
export const copyGrid = (grid: GameGrid): GameGrid => {
  return grid.map(row => [...row]);
};

// Check if two grids are equal
export const gridsEqual = (grid1: GameGrid, grid2: GameGrid): boolean => {
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid1[row][col] !== grid2[row][col]) {
        return false;
      }
    }
  }
  return true;
};

// Move and merge tiles in a single row/column
const moveAndMergeRow = (row: TileValue[]): { newRow: TileValue[], score: number } => {
  // Remove zeros and move all numbers to the left
  const filtered = row.filter(val => val !== 0);
  
  let score = 0;
  const merged: TileValue[] = [];
  let i = 0;
  
  while (i < filtered.length) {
    if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
      // Merge tiles
      const mergedValue = (filtered[i] * 2) as TileValue;
      merged.push(mergedValue);
      score += mergedValue;
      i += 2; // Skip the next tile as it was merged
    } else {
      // No merge, just move the tile
      merged.push(filtered[i]);
      i++;
    }
  }
  
  // Fill the rest with zeros
  while (merged.length < 4) {
    merged.push(0);
  }
  
  return { newRow: merged, score };
};

// Check if two arrays are equal
const arraysEqual = (arr1: TileValue[], arr2: TileValue[]): boolean => {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
};

// Move tiles in the specified direction
export const moveGrid = (grid: GameGrid, direction: Direction): MoveResult => {
  const newGrid = copyGrid(grid);
  let totalScore = 0;
  let moved = false;
  
  if (direction === 'left') {
    for (let row = 0; row < 4; row++) {
      const originalRow = [...newGrid[row]];
      const { newRow, score } = moveAndMergeRow(newGrid[row]);
      if (!arraysEqual(originalRow, newRow)) {
        moved = true;
      }
      newGrid[row] = newRow;
      totalScore += score;
    }
  } else if (direction === 'right') {
    for (let row = 0; row < 4; row++) {
      const originalRow = [...newGrid[row]];
      const reversed = [...newGrid[row]].reverse();
      const { newRow, score } = moveAndMergeRow(reversed);
      const finalRow = newRow.reverse();
      if (!arraysEqual(originalRow, finalRow)) {
        moved = true;
      }
      newGrid[row] = finalRow;
      totalScore += score;
    }
  } else if (direction === 'up') {
    for (let col = 0; col < 4; col++) {
      const column: TileValue[] = [newGrid[0][col], newGrid[1][col], newGrid[2][col], newGrid[3][col]];
      const { newRow, score } = moveAndMergeRow(column);
      if (!arraysEqual(column, newRow)) {
        moved = true;
      }
      for (let row = 0; row < 4; row++) {
        newGrid[row][col] = newRow[row];
      }
      totalScore += score;
    }
  } else if (direction === 'down') {
    for (let col = 0; col < 4; col++) {
      const column: TileValue[] = [newGrid[3][col], newGrid[2][col], newGrid[1][col], newGrid[0][col]];
      const { newRow, score } = moveAndMergeRow(column);
      if (!arraysEqual(column, newRow)) {
        moved = true;
      }
      for (let row = 0; row < 4; row++) {
        newGrid[row][col] = newRow[3 - row];
      }
      totalScore += score;
    }
  }
  
  // Check for game won (2048 tile achieved)
  const gameWon = newGrid.some(row => row.some(tile => tile === 2048));
  
  // Check for game over (no empty spaces and no possible moves)
  let gameOver = false;
  if (getEmptyPositions(newGrid).length === 0) {
    gameOver = !canMove(newGrid);
  }
  
  return {
    moved,
    scoreIncrease: totalScore,
    newGrid,
    gameOver,
    gameWon
  };
};

// Check if any moves are possible
export const canMove = (grid: GameGrid): boolean => {
  // Check for empty spaces
  if (getEmptyPositions(grid).length > 0) {
    return true;
  }
  
  // Check for possible merges
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const current = grid[row][col];
      
      // Check right neighbor
      if (col < 3 && grid[row][col + 1] === current) {
        return true;
      }
      
      // Check down neighbor
      if (row < 3 && grid[row + 1][col] === current) {
        return true;
      }
    }
  }
  
  return false;
};

// Get the highest tile value in the grid
export const getHighestTile = (grid: GameGrid): TileValue => {
  let highest: TileValue = 0;
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      if (grid[row][col] > highest) {
        highest = grid[row][col];
      }
    }
  }
  return highest;
};