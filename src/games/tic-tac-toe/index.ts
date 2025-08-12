/**
 * Tic-Tac-Toe Game Entry Point
 */

export { TicTacToeGame, default } from './TicTacToeGame';
export { TicTacToeGameController } from './controller';
export type { 
  TicTacToeGameData, 
  Player, 
  CellValue, 
  Board, 
  GameStatus, 
  Move 
} from './types';
export * from './gameLogic';