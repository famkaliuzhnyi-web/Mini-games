/**
 * Drawing Game Logic
 */

import type { DrawingGrid, DrawAction, Color } from './types';
import { GRID_SIZE } from './types';

/**
 * Create empty 32x32 drawing grid
 */
export function createEmptyGrid(): DrawingGrid {
  return Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
}

/**
 * Check if position is valid within grid bounds
 */
export function isValidPosition(x: number, y: number): boolean {
  return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE;
}

/**
 * Apply a drawing action to the grid
 */
export function applyDrawAction(grid: DrawingGrid, action: DrawAction): DrawingGrid {
  if (!isValidPosition(action.x, action.y)) {
    return grid;
  }

  const newGrid = grid.map(row => [...row]);
  newGrid[action.y][action.x] = action.color;
  return newGrid;
}

/**
 * Clear the entire grid
 */
export function clearGrid(): DrawingGrid {
  return createEmptyGrid();
}

/**
 * Create a draw action
 */
export function createDrawAction(
  x: number,
  y: number,
  color: Color,
  playerId: string
): DrawAction {
  return {
    x,
    y,
    color,
    playerId,
    timestamp: new Date().toISOString()
  };
}

/**
 * Convert grid to ImageData for download
 */
export function gridToImageData(grid: DrawingGrid): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = GRID_SIZE;
  canvas.height = GRID_SIZE;
  const ctx = canvas.getContext('2d')!;
  
  const imageData = ctx.createImageData(GRID_SIZE, GRID_SIZE);
  const data = imageData.data;
  
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const pixelIndex = (y * GRID_SIZE + x) * 4;
      const color = grid[y][x];
      
      if (color) {
        // Convert hex color to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        
        data[pixelIndex] = r;     // Red
        data[pixelIndex + 1] = g; // Green
        data[pixelIndex + 2] = b; // Blue
        data[pixelIndex + 3] = 255; // Alpha (fully opaque)
      } else {
        // Transparent pixel
        data[pixelIndex] = 255;     // Red (white background)
        data[pixelIndex + 1] = 255; // Green
        data[pixelIndex + 2] = 255; // Blue
        data[pixelIndex + 3] = 255; // Alpha
      }
    }
  }
  
  return imageData;
}

/**
 * Download the current grid as a PNG image
 */
export function downloadGridAsImage(grid: DrawingGrid, filename = 'drawing.png'): void {
  const canvas = document.createElement('canvas');
  
  // Scale up the image for better visibility (16x scale = 512x512 final image)
  const scale = 16;
  canvas.width = GRID_SIZE * scale;
  canvas.height = GRID_SIZE * scale;
  
  const ctx = canvas.getContext('2d')!;
  
  // Disable image smoothing for pixel-perfect scaling
  ctx.imageSmoothingEnabled = false;
  
  // Fill background with white
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw each pixel as a scaled rectangle
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const color = grid[y][x];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }
  }
  
  // Convert to blob and download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, 'image/png');
}