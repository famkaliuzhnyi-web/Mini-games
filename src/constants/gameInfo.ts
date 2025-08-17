/**
 * Game multiplayer support configuration
 */

export interface GameInfo {
  id: string;
  name: string;
  hasMultiplayerSupport: boolean;
  multiplayerStatus: 'full' | 'partial' | 'wip';
}

export const GAME_INFO: Record<string, GameInfo> = {
  'tic-tac-toe': {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    hasMultiplayerSupport: true,
    multiplayerStatus: 'full'
  },
  'ping-pong': {
    id: 'ping-pong', 
    name: 'Ping Pong',
    hasMultiplayerSupport: false, // Documentation claims full support but implementation is missing
    multiplayerStatus: 'wip'
  },
  'snake': {
    id: 'snake',
    name: 'Snake',
    hasMultiplayerSupport: false, // Partial implementation not complete
    multiplayerStatus: 'partial'
  },
  'drawing': {
    id: 'drawing',
    name: 'Drawing',
    hasMultiplayerSupport: false, // Partial implementation not complete
    multiplayerStatus: 'partial'
  },
  'game2048': {
    id: 'game2048',
    name: '2048',
    hasMultiplayerSupport: false,
    multiplayerStatus: 'wip'
  },
  'tetris': {
    id: 'tetris',
    name: 'Tetris',
    hasMultiplayerSupport: false,
    multiplayerStatus: 'wip'
  },
  'sudoku': {
    id: 'sudoku',
    name: 'Sudoku',
    hasMultiplayerSupport: false,
    multiplayerStatus: 'wip'
  }
};