/**
 * 2048 Game exports
 */
export { Game2048, default } from './Game2048';
export { 
  Game2048GameField,
  Game2048Stats,
  Game2048Controls
} from './SlotComponents';
export type { 
  Game2048Data, 
  TileValue, 
  GameGrid, 
  Direction,
  MoveResult,
  Position 
} from './types';
export * from './logic';