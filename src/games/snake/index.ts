/**
 * Snake Game Entry Point
 */

export { SnakeGame, default } from './SnakeGame';
export { SnakeGameController } from './controller';
export { 
  SnakeGameField, 
  SnakeStats, 
  SnakeControls 
} from './SlotComponents';
export type { 
  SnakeGameData, 
  Snake,
  Position,
  Direction,
  Food,
  GameConfig,
  SnakeAction
} from './types';
export * from './logic';