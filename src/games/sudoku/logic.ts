/**
 * Core Sudoku game logic and utilities
 */

import type { CellValue, SudokuGrid, SudokuUIGrid, Difficulty } from './types';

// Create an empty 9x9 grid
export const createEmptyGrid = (): SudokuGrid => {
  return Array(9).fill(0).map(() => Array(9).fill(0)) as SudokuGrid;
};

// Create an empty UI grid
export const createEmptyUIGrid = (): SudokuUIGrid => {
  return Array(9).fill(0).map(() => 
    Array(9).fill(0).map(() => ({
      value: 0,
      isInitial: false,
      isInvalid: false,
      notes: []
    }))
  ) as SudokuUIGrid;
};

// Check if placing a number at position is valid
export const isValidMove = (grid: SudokuGrid, row: number, col: number, num: CellValue): boolean => {
  if (num === 0) return true; // Empty cell is always valid

  // Check row
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) {
      return false;
    }
  }

  // Check column
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) {
      return false;
    }
  }

  // Check 3x3 box
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if ((r !== row || c !== col) && grid[r][c] === num) {
        return false;
      }
    }
  }

  return true;
};

// Check if the entire grid is valid
export const isValidGrid = (grid: SudokuGrid): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] !== 0 && !isValidMove(grid, row, col, grid[row][col])) {
        return false;
      }
    }
  }
  return true;
};

// Check if the grid is completely filled and valid (solved)
export const isSolved = (grid: SudokuGrid): boolean => {
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0 || !isValidMove(grid, row, col, grid[row][col])) {
        return false;
      }
    }
  }
  return true;
};

// Get possible values for a cell
export const getPossibleValues = (grid: SudokuGrid, row: number, col: number): number[] => {
  if (grid[row][col] !== 0) return []; // Cell is already filled

  const possible: number[] = [];
  for (let num = 1; num <= 9; num++) {
    if (isValidMove(grid, row, col, num as CellValue)) {
      possible.push(num);
    }
  }
  return possible;
};

// Find empty cell with fewest possibilities (for solving algorithm)
export const findBestCell = (grid: SudokuGrid): { row: number; col: number; possibilities: number } | null => {
  let bestCell = null;
  let minPossibilities = 10;

  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (grid[row][col] === 0) {
        const possibilities = getPossibleValues(grid, row, col).length;
        if (possibilities < minPossibilities) {
          minPossibilities = possibilities;
          bestCell = { row, col, possibilities };
          
          // If we find a cell with 0 possibilities, the puzzle is unsolvable
          if (possibilities === 0) return bestCell;
        }
      }
    }
  }
  return bestCell;
};

// Solve a Sudoku grid using backtracking
export const solveSudoku = (grid: SudokuGrid): boolean => {
  const cell = findBestCell(grid);
  if (!cell) return true; // No empty cells, puzzle is solved

  if (cell.possibilities === 0) return false; // Unsolvable

  const { row, col } = cell;
  const possibleValues = getPossibleValues(grid, row, col);
  
  // Shuffle the possible values for randomness in solving
  for (let i = possibleValues.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [possibleValues[i], possibleValues[j]] = [possibleValues[j], possibleValues[i]];
  }

  for (const num of possibleValues) {
    grid[row][col] = num as CellValue;
    if (solveSudoku(grid)) {
      return true;
    }
    grid[row][col] = 0; // Backtrack
  }

  return false;
};

// Generate a complete, valid Sudoku grid
export const generateCompleteGrid = (): SudokuGrid => {
  const grid = createEmptyGrid();
  
  // Fill the diagonal 3x3 boxes first (they don't conflict with each other)
  fillDiagonalBoxes(grid);
  
  // Solve the rest
  solveSudoku(grid);
  
  return grid;
};

// Fill the 3 diagonal 3x3 boxes
const fillDiagonalBoxes = (grid: SudokuGrid): void => {
  for (let box = 0; box < 9; box += 3) {
    fillBox(grid, box, box);
  }
};

// Fill a single 3x3 box
const fillBox = (grid: SudokuGrid, startRow: number, startCol: number): void => {
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  // Shuffle numbers
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  let index = 0;
  for (let row = startRow; row < startRow + 3; row++) {
    for (let col = startCol; col < startCol + 3; col++) {
      grid[row][col] = numbers[index++] as CellValue;
    }
  }
};

// Remove cells from a complete grid to create a puzzle
export const createPuzzle = (grid: SudokuGrid, difficulty: Difficulty): SudokuGrid => {
  const puzzle = grid.map(row => [...row]) as SudokuGrid;
  
  // Determine how many cells to remove based on difficulty
  const cellsToRemove = getDifficultySettings(difficulty).cellsToRemove;
  
  const cells: Array<{row: number, col: number}> = [];
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      cells.push({row, col});
    }
  }
  
  // Shuffle cell positions
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  
  // Remove cells while ensuring the puzzle remains solvable
  let removed = 0;
  for (const cell of cells) {
    if (removed >= cellsToRemove) break;
    
    const backup = puzzle[cell.row][cell.col];
    puzzle[cell.row][cell.col] = 0;
    
    // Check if puzzle is still uniquely solvable
    if (hasUniqueSolution(puzzle)) {
      removed++;
    } else {
      // Restore the cell
      puzzle[cell.row][cell.col] = backup;
    }
  }
  
  return puzzle;
};

// Check if a puzzle has a unique solution
const hasUniqueSolution = (grid: SudokuGrid): boolean => {
  const testGrid = grid.map(row => [...row]) as SudokuGrid;
  let solutions = 0;
  
  const solve = (grid: SudokuGrid): void => {
    if (solutions > 1) return; // Stop if we find more than one solution
    
    const cell = findBestCell(grid);
    if (!cell) {
      solutions++;
      return;
    }
    
    if (cell.possibilities === 0) return;
    
    const { row, col } = cell;
    const possibleValues = getPossibleValues(grid, row, col);
    
    for (const num of possibleValues) {
      grid[row][col] = num as CellValue;
      solve(grid);
      grid[row][col] = 0;
      
      if (solutions > 1) return;
    }
  };
  
  solve(testGrid);
  return solutions === 1;
};

// Get difficulty settings
export const getDifficultySettings = (difficulty: Difficulty) => {
  const settings = {
    easy: { cellsToRemove: 36, maxHints: 10, maxMistakes: 5 },
    medium: { cellsToRemove: 46, maxHints: 7, maxMistakes: 3 },
    hard: { cellsToRemove: 52, maxHints: 5, maxMistakes: 2 },
    expert: { cellsToRemove: 58, maxHints: 3, maxMistakes: 1 }
  };
  return settings[difficulty];
};

// Convert SudokuGrid to SudokuUIGrid
export const gridToUIGrid = (grid: SudokuGrid, initialGrid?: SudokuGrid): SudokuUIGrid => {
  return grid.map((row, r) =>
    row.map((cell, c) => ({
      value: cell,
      isInitial: initialGrid ? initialGrid[r][c] !== 0 : false,
      isInvalid: cell !== 0 ? !isValidMove(grid, r, c, cell) : false,
      notes: []
    }))
  ) as SudokuUIGrid;
};

// Update validation status for UI grid
export const updateValidation = (uiGrid: SudokuUIGrid, currentGrid: SudokuGrid): SudokuUIGrid => {
  return uiGrid.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      value: currentGrid[r][c],
      isInvalid: currentGrid[r][c] !== 0 ? !isValidMove(currentGrid, r, c, currentGrid[r][c]) : false
    }))
  ) as SudokuUIGrid;
};

// Get a hint for the current puzzle state
export const getHint = (currentGrid: SudokuGrid, solutionGrid: SudokuGrid): { row: number; col: number; value: CellValue } | null => {
  const emptyCells: Array<{row: number, col: number}> = [];
  
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 9; col++) {
      if (currentGrid[row][col] === 0) {
        emptyCells.push({row, col});
      }
    }
  }
  
  if (emptyCells.length === 0) return null;
  
  // Random hint from empty cells
  const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  return {
    row: randomCell.row,
    col: randomCell.col,
    value: solutionGrid[randomCell.row][randomCell.col]
  };
};