/**
 * Shared Game Utilities - Common game mechanics and patterns
 * 
 * This module provides utility functions and patterns commonly used across games,
 * including grid operations, scoring systems, timers, and state management helpers.
 */

export type GameStatus = 'playing' | 'paused' | 'game-over' | 'completed' | 'waiting';

/**
 * Creates an empty grid of specified dimensions
 */
export function createEmptyGrid<T>(
  rows: number, 
  cols: number, 
  defaultValue: T
): T[][] {
  return Array(rows).fill(null).map(() => Array(cols).fill(defaultValue));
}

/**
 * Creates a deep copy of a grid
 */
export function copyGrid<T>(grid: T[][]): T[][] {
  return grid.map(row => [...row]);
}

/**
 * Validates grid dimensions
 */
export function isValidGrid<T>(
  grid: unknown, 
  expectedRows: number, 
  expectedCols: number
): grid is T[][] {
  if (!Array.isArray(grid) || grid.length !== expectedRows) {
    return false;
  }
  
  return grid.every(row => Array.isArray(row) && row.length === expectedCols);
}

/**
 * Finds all empty positions in a grid
 */
export function findEmptyPositions<T>(
  grid: T[][], 
  emptyValue: T
): Array<{ row: number; col: number }> {
  const positions: Array<{ row: number; col: number }> = [];
  
  for (let row = 0; row < grid.length; row++) {
    for (let col = 0; col < grid[row].length; col++) {
      if (grid[row][col] === emptyValue) {
        positions.push({ row, col });
      }
    }
  }
  
  return positions;
}

/**
 * Gets neighboring positions (4-directional)
 */
export function getNeighbors(
  row: number, 
  col: number, 
  maxRows: number, 
  maxCols: number
): Array<{ row: number; col: number }> {
  const neighbors: Array<{ row: number; col: number }> = [];
  const directions = [
    { row: -1, col: 0 }, // up
    { row: 1, col: 0 },  // down
    { row: 0, col: -1 }, // left
    { row: 0, col: 1 }   // right
  ];

  for (const dir of directions) {
    const newRow = row + dir.row;
    const newCol = col + dir.col;
    
    if (newRow >= 0 && newRow < maxRows && newCol >= 0 && newCol < maxCols) {
      neighbors.push({ row: newRow, col: newCol });
    }
  }

  return neighbors;
}

/**
 * Common scoring patterns for different types of games
 */
export interface ScoreSystem {
  current: number;
  best: number;
  multiplier: number;
}

/**
 * Creates a new score system
 */
export function createScoreSystem(initialBest: number = 0): ScoreSystem {
  return {
    current: 0,
    best: initialBest,
    multiplier: 1
  };
}

/**
 * Updates score and tracks best score
 */
export function updateScore(
  scoreSystem: ScoreSystem, 
  points: number
): ScoreSystem {
  const newCurrent = scoreSystem.current + (points * scoreSystem.multiplier);
  
  return {
    ...scoreSystem,
    current: newCurrent,
    best: Math.max(scoreSystem.best, newCurrent)
  };
}

/**
 * Resets current score while preserving best score
 */
export function resetScore(scoreSystem: ScoreSystem): ScoreSystem {
  return {
    ...scoreSystem,
    current: 0,
    multiplier: 1
  };
}

/**
 * Common game statistics structure
 */
export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  totalPlayTime: number; // in milliseconds
  bestScore: number;
  averageScore: number;
}

/**
 * Creates initial stats
 */
export function createInitialStats(): GameStats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    gamesLost: 0,
    totalPlayTime: 0,
    bestScore: 0,
    averageScore: 0
  };
}

/**
 * Updates stats after a game
 */
export function updateStats(
  stats: GameStats,
  result: {
    won: boolean;
    score: number;
    playTime: number;
  }
): GameStats {
  const newGamesPlayed = stats.gamesPlayed + 1;
  const newGamesWon = stats.gamesWon + (result.won ? 1 : 0);
  const newGamesLost = stats.gamesLost + (result.won ? 0 : 1);
  const newTotalPlayTime = stats.totalPlayTime + result.playTime;
  const newBestScore = Math.max(stats.bestScore, result.score);
  
  // Calculate new average score
  const totalScore = (stats.averageScore * stats.gamesPlayed) + result.score;
  const newAverageScore = totalScore / newGamesPlayed;

  return {
    gamesPlayed: newGamesPlayed,
    gamesWon: newGamesWon,
    gamesLost: newGamesLost,
    totalPlayTime: newTotalPlayTime,
    bestScore: newBestScore,
    averageScore: Math.round(newAverageScore * 100) / 100 // Round to 2 decimal places
  };
}

/**
 * Gets win rate as percentage
 */
export function getWinRate(stats: GameStats): number {
  if (stats.gamesPlayed === 0) return 0;
  return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
}

/**
 * Game timer state
 */
export interface GameTimer {
  startTime: number;
  pausedTime: number;
  totalPausedDuration: number;
  isRunning: boolean;
}

/**
 * Creates a new timer
 */
export function createTimer(): GameTimer {
  return {
    startTime: Date.now(),
    pausedTime: 0,
    totalPausedDuration: 0,
    isRunning: true
  };
}

/**
 * Pauses the timer
 */
export function pauseTimer(timer: GameTimer): GameTimer {
  if (!timer.isRunning) return timer;

  return {
    ...timer,
    pausedTime: Date.now(),
    isRunning: false
  };
}

/**
 * Resumes the timer
 */
export function resumeTimer(timer: GameTimer): GameTimer {
  if (timer.isRunning) return timer;

  const pauseDuration = Date.now() - timer.pausedTime;

  return {
    ...timer,
    totalPausedDuration: timer.totalPausedDuration + pauseDuration,
    pausedTime: 0,
    isRunning: true
  };
}

/**
 * Gets elapsed time in milliseconds
 */
export function getElapsedTime(timer: GameTimer): number {
  const now = Date.now();
  const totalTime = now - timer.startTime;
  const activePausedTime = timer.isRunning ? 0 : (now - timer.pausedTime);
  
  return totalTime - timer.totalPausedDuration - activePausedTime;
}

/**
 * Formats time in MM:SS format
 */
export function formatTime(milliseconds: number): string {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Move history structure
 */
export interface MoveHistory<T> {
  moves: T[];
  currentIndex: number;
  maxHistory: number;
}

/**
 * Creates a new move history
 */
export function createMoveHistory<T>(maxHistory: number = 50): MoveHistory<T> {
  return {
    moves: [],
    currentIndex: -1,
    maxHistory
  };
}

/**
 * Adds a move to history
 */
export function addMove<T>(history: MoveHistory<T>, move: T): MoveHistory<T> {
  const newMoves = [...history.moves.slice(0, history.currentIndex + 1), move];
  
  // Trim history if it exceeds max length
  if (newMoves.length > history.maxHistory) {
    newMoves.shift();
  }

  return {
    ...history,
    moves: newMoves,
    currentIndex: Math.min(newMoves.length - 1, history.maxHistory - 1)
  };
}

/**
 * Checks if undo is possible
 */
export function canUndo<T>(history: MoveHistory<T>): boolean {
  return history.currentIndex > 0;
}

/**
 * Checks if redo is possible
 */
export function canRedo<T>(history: MoveHistory<T>): boolean {
  return history.currentIndex < history.moves.length - 1;
}

/**
 * Gets the previous move for undo
 */
export function getPreviousMove<T>(history: MoveHistory<T>): T | null {
  if (!canUndo(history)) return null;
  return history.moves[history.currentIndex - 1];
}

/**
 * Gets the next move for redo
 */
export function getNextMove<T>(history: MoveHistory<T>): T | null {
  if (!canRedo(history)) return null;
  return history.moves[history.currentIndex + 1];
}

/**
 * Gets a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Gets a random element from an array
 */
export function randomChoice<T>(array: T[]): T | null {
  if (array.length === 0) return null;
  return array[randomInt(0, array.length - 1)];
}

/**
 * Shuffles an array (Fisher-Yates algorithm)
 */
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  
  return result;
}