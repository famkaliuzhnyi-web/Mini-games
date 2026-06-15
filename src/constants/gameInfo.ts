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
  'game2048': {
    id: 'game2048',
    name: '2048',
    hasMultiplayerSupport: true,
    multiplayerStatus: 'full'
  },
};