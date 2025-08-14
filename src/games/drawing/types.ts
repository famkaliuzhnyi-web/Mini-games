/**
 * Drawing Game Types
 */

// Color value (hex string)
export type Color = string;

// Pixel position in the 32x32 grid
export interface PixelPosition {
  x: number;
  y: number;
}

// Drawing action for multiplayer sync
export interface DrawAction {
  x: number;
  y: number;
  color: Color;
  playerId: string;
  timestamp: string;
}

// 32x32 grid of colors (null = transparent/empty)
export type DrawingGrid = (Color | null)[][];

// Game status
export type DrawingGameStatus = 'drawing' | 'completed';

// Multiplayer mode type  
export type GameMode = 'single-player' | 'multiplayer';

// Multiplayer game state
export interface MultiplayerState {
  isMultiplayer: boolean;
  sessionId?: string;
  isHost?: boolean;
  playerId?: string;
  connectedPlayers?: string[];
  waitingForPlayers?: boolean;
}

// Drawing Game specific game data
export interface DrawingGameData extends Record<string, unknown> {
  grid: DrawingGrid;
  selectedColor: Color;
  gameStatus: DrawingGameStatus;
  actionHistory: DrawAction[];
  // Multiplayer support
  gameMode: GameMode;
  multiplayer: MultiplayerState;
}

// Default colors palette
export const DEFAULT_COLORS: Color[] = [
  '#000000', // Black
  '#FFFFFF', // White
  '#FF0000', // Red
  '#00FF00', // Green
  '#0000FF', // Blue
  '#FFFF00', // Yellow
  '#FF00FF', // Magenta
  '#00FFFF', // Cyan
  '#FF8000', // Orange
  '#8000FF', // Purple
  '#80FF00', // Lime
  '#FF0080', // Pink
  '#808080', // Gray
  '#404040', // Dark Gray
  '#C0C0C0', // Light Gray
  '#800000', // Maroon
];

// Grid size constant
export const GRID_SIZE = 32;