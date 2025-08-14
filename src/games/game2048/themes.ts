/**
 * 2048 Game Theme Definitions
 */
import type { Game2048ThemeData, TileValue } from './types';

// Helper function to create tile colors for a theme
const createTileColors = (colors: string[]): Record<TileValue, { background: string; color: string }> => {
  return {
    0: { background: '', color: '' }, // Empty cell
    2: { background: colors[0], color: '#776e65' },
    4: { background: colors[1], color: '#776e65' },
    8: { background: colors[2], color: '#f9f6f2' },
    16: { background: colors[3], color: '#f9f6f2' },
    32: { background: colors[4], color: '#f9f6f2' },
    64: { background: colors[5], color: '#f9f6f2' },
    128: { background: colors[6], color: '#f9f6f2' },
    256: { background: colors[7], color: '#f9f6f2' },
    512: { background: colors[8], color: '#f9f6f2' },
    1024: { background: colors[9], color: '#f9f6f2' },
    2048: { background: colors[10], color: '#f9f6f2' },
  };
};

export const THEME_DATA: Record<string, Game2048ThemeData> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Original 2048 colors',
    cost: 0, // Free default theme
    colors: {
      background: 'linear-gradient(135deg, #faf8ef 0%, #f2ebe5 100%)',
      container: 'linear-gradient(135deg, #faf8ef 0%, #f2ebe5 100%)',
      gridBackground: 'rgba(187, 173, 160, 0.35)',
      emptyCell: 'rgba(238, 228, 218, 0.35)',
      text: '#776e65',
      title: 'linear-gradient(135deg, #776e65, #8f7a66)',
      tiles: createTileColors([
        'linear-gradient(135deg, #eee4da, #e6dcd2)', // 2
        'linear-gradient(135deg, #ede0c8, #e5d4b8)', // 4
        'linear-gradient(135deg, #f2b179, #f0a865)', // 8
        'linear-gradient(135deg, #f59563, #f3884f)', // 16
        'linear-gradient(135deg, #f67c5f, #f46d4b)', // 32
        'linear-gradient(135deg, #f65e3b, #f44d27)', // 64
        'linear-gradient(135deg, #edcf72, #e6c862)', // 128
        'linear-gradient(135deg, #edcc61, #e6c551)', // 256
        'linear-gradient(135deg, #edc850, #e6c140)', // 512
        'linear-gradient(135deg, #edc53f, #e6be2f)', // 1024
        'linear-gradient(135deg, #edc22e, #e6bb1d)', // 2048
      ])
    }
  },
  
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    description: 'Sleek dark theme for night gaming',
    cost: 25,
    colors: {
      background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      container: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
      gridBackground: 'rgba(60, 60, 60, 0.4)',
      emptyCell: 'rgba(80, 80, 80, 0.3)',
      text: '#e0e0e0',
      title: 'linear-gradient(135deg, #e0e0e0, #c0c0c0)',
      tiles: createTileColors([
        'linear-gradient(135deg, #3d3d3d, #454545)', // 2
        'linear-gradient(135deg, #4a4a4a, #525252)', // 4
        'linear-gradient(135deg, #5a4a3d, #6b5b4e)', // 8
        'linear-gradient(135deg, #6b5b4e, #7c6c5f)', // 16
        'linear-gradient(135deg, #7c6c5f, #8d7d70)', // 32
        'linear-gradient(135deg, #8d7d70, #9e8e81)', // 64
        'linear-gradient(135deg, #b8860b, #cd950c)', // 128
        'linear-gradient(135deg, #cd950c, #e2aa0d)', // 256
        'linear-gradient(135deg, #e2aa0d, #f7bf0e)', // 512
        'linear-gradient(135deg, #f7bf0e, #ffd700)', // 1024
        'linear-gradient(135deg, #ffd700, #ffed4a)', // 2048
      ])
    }
  },

  ocean: {
    id: 'ocean',
    name: 'Ocean Blue',
    description: 'Cool ocean-inspired blues and teals',
    cost: 25,
    colors: {
      background: 'linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%)',
      container: 'linear-gradient(135deg, #e6f3ff 0%, #cce7ff 100%)',
      gridBackground: 'rgba(100, 149, 237, 0.2)',
      emptyCell: 'rgba(173, 216, 230, 0.3)',
      text: '#2c3e50',
      title: 'linear-gradient(135deg, #2980b9, #3498db)',
      tiles: createTileColors([
        'linear-gradient(135deg, #ecf0f1, #d5dbdb)', // 2
        'linear-gradient(135deg, #bdc3c7, #95a5a6)', // 4
        'linear-gradient(135deg, #85c1e9, #7fb3d3)', // 8
        'linear-gradient(135deg, #5dade2, #48c9b0)', // 16
        'linear-gradient(135deg, #3498db, #2980b9)', // 32
        'linear-gradient(135deg, #2471a3, #1b4f72)', // 64
        'linear-gradient(135deg, #17a2b8, #138496)', // 128
        'linear-gradient(135deg, #20c997, #17a673)', // 256
        'linear-gradient(135deg, #28a745, #1e7e34)', // 512
        'linear-gradient(135deg, #007bff, #0056b3)', // 1024
        'linear-gradient(135deg, #6f42c1, #5a2d91)', // 2048
      ])
    }
  },

  forest: {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural earthy greens and browns',
    cost: 25,
    colors: {
      background: 'linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)',
      container: 'linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)',
      gridBackground: 'rgba(76, 175, 80, 0.2)',
      emptyCell: 'rgba(165, 214, 167, 0.3)',
      text: '#2e7d32',
      title: 'linear-gradient(135deg, #388e3c, #2e7d32)',
      tiles: createTileColors([
        'linear-gradient(135deg, #f3e5f5, #e1bee7)', // 2
        'linear-gradient(135deg, #e8f5e8, #c8e6c9)', // 4
        'linear-gradient(135deg, #c8e6c9, #a5d6a7)', // 8
        'linear-gradient(135deg, #81c784, #66bb6a)', // 16
        'linear-gradient(135deg, #4caf50, #43a047)', // 32
        'linear-gradient(135deg, #388e3c, #2e7d32)', // 64
        'linear-gradient(135deg, #2e7d32, #1b5e20)', // 128
        'linear-gradient(135deg, #795548, #6d4c41)', // 256
        'linear-gradient(135deg, #5d4037, #4e342e)', // 512
        'linear-gradient(135deg, #8bc34a, #689f38)', // 1024
        'linear-gradient(135deg, #cddc39, #afb42b)', // 2048
      ])
    }
  },

  sunset: {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm sunset colors with orange and pink',
    cost: 25,
    colors: {
      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      container: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
      gridBackground: 'rgba(255, 152, 0, 0.2)',
      emptyCell: 'rgba(255, 204, 128, 0.3)',
      text: '#e65100',
      title: 'linear-gradient(135deg, #ff6f00, #e65100)',
      tiles: createTileColors([
        'linear-gradient(135deg, #fce4ec, #f8bbd9)', // 2
        'linear-gradient(135deg, #ffecb3, #ffd54f)', // 4
        'linear-gradient(135deg, #ffcc02, #ffc107)', // 8
        'linear-gradient(135deg, #ff9800, #f57c00)', // 16
        'linear-gradient(135deg, #ff5722, #d84315)', // 32
        'linear-gradient(135deg, #e91e63, #c2185b)', // 64
        'linear-gradient(135deg, #9c27b0, #7b1fa2)', // 128
        'linear-gradient(135deg, #673ab7, #512da8)', // 256
        'linear-gradient(135deg, #3f51b5, #303f9f)', // 512
        'linear-gradient(135deg, #ff4081, #f50057)', // 1024
        'linear-gradient(135deg, #ff6ec7, #ff1744)', // 2048
      ])
    }
  }
};

export const UNDO_COST = 5; // Cost in coins for each undo action