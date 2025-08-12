/**
 * Sudoku game type definitions
 */

// Cell value in the Sudoku grid (0 means empty, 1-9 are valid numbers)
export type CellValue = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// 9x9 Sudoku grid
export type SudokuGrid = CellValue[][];

// Difficulty levels
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Cell state for UI
export interface CellState {
  value: CellValue;
  isInitial: boolean;  // True if this was part of the initial puzzle
  isInvalid: boolean;  // True if this cell violates Sudoku rules
  notes: number[];     // Notes/pencil marks for this cell
}

// UI Grid state (9x9 of CellState)
export type SudokuUIGrid = CellState[][];

// Sudoku game specific data
export interface SudokuGameData extends Record<string, unknown> {
  initialGrid: SudokuGrid;      // The original puzzle
  currentGrid: SudokuGrid;      // Current state of the puzzle
  uiGrid: SudokuUIGrid;         // UI state with notes and validation
  difficulty: Difficulty;       // Current difficulty level
  hintsUsed: number;           // Number of hints used
  mistakes: number;            // Number of mistakes made
  timeSpent: number;           // Time spent in seconds
  isComplete: boolean;         // True when puzzle is solved
  maxHints: number;            // Maximum hints allowed for this difficulty
  maxMistakes: number;         // Maximum mistakes allowed before game over
}

// Move history for undo functionality
export interface SudokuMove {
  row: number;
  col: number;
  previousValue: CellValue;
  newValue: CellValue;
  timestamp: number;
}