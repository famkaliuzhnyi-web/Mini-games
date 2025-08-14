/**
 * Drawing Game Component
 */
import React, { useCallback, useRef, useEffect, useState } from 'react';
import type { DrawingGameData, Color } from './types';
import { DEFAULT_COLORS, GRID_SIZE } from './types';
import { applyDrawAction, createDrawAction, clearGrid, downloadGridAsImage } from './logic';
import './DrawingGame.css';

interface DrawingGameProps {
  gameData: DrawingGameData;
  onGameUpdate: (newGameData: DrawingGameData) => void;
  playerId: string;
  onMultiplayerAction?: (action: {type: string; payload: unknown}) => void;
}

export const DrawingGame: React.FC<DrawingGameProps> = ({
  gameData,
  onGameUpdate,
  playerId,
  onMultiplayerAction
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawnPosition, setLastDrawnPosition] = useState<{x: number, y: number} | null>(null);

  // Canvas size in pixels (will be scaled up for visibility)
  const canvasDisplaySize = 320; // 10x scale of 32x32 grid

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    const scale = canvasDisplaySize / GRID_SIZE;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasDisplaySize, canvasDisplaySize);
    
    // Fill background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasDisplaySize, canvasDisplaySize);
    
    // Draw grid lines
    ctx.strokeStyle = '#E5E5E5';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= GRID_SIZE; i++) {
      // Vertical lines
      ctx.beginPath();
      ctx.moveTo(i * scale, 0);
      ctx.lineTo(i * scale, canvasDisplaySize);
      ctx.stroke();
      
      // Horizontal lines
      ctx.beginPath();
      ctx.moveTo(0, i * scale);
      ctx.lineTo(canvasDisplaySize, i * scale);
      ctx.stroke();
    }
    
    // Draw pixels
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = gameData.grid[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [gameData.grid, canvasDisplaySize]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering

    // Draw grid
    drawGrid(ctx);
  }, [gameData.grid, drawGrid]);

  const getCanvasPosition = useCallback((event: React.MouseEvent<HTMLCanvasElement>): {x: number, y: number} => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvasDisplaySize / GRID_SIZE;
    
    const x = Math.floor((event.clientX - rect.left) / scale);
    const y = Math.floor((event.clientY - rect.top) / scale);
    
    return { x: Math.max(0, Math.min(x, GRID_SIZE - 1)), y: Math.max(0, Math.min(y, GRID_SIZE - 1)) };
  }, [canvasDisplaySize]);

  const drawPixel = useCallback((x: number, y: number, color: Color) => {
    // Avoid drawing same pixel repeatedly
    if (lastDrawnPosition && lastDrawnPosition.x === x && lastDrawnPosition.y === y) {
      return;
    }

    const action = createDrawAction(x, y, color, playerId);
    const newGrid = applyDrawAction(gameData.grid, action);
    
    const newGameData: DrawingGameData = {
      ...gameData,
      grid: newGrid,
      actionHistory: [...gameData.actionHistory, action]
    };
    
    onGameUpdate(newGameData);
    
    // Send multiplayer action if in multiplayer mode
    if (gameData.multiplayer.isMultiplayer && onMultiplayerAction) {
      onMultiplayerAction({
        type: 'DRAW_PIXEL',
        payload: action
      });
    }

    setLastDrawnPosition({ x, y });
  }, [gameData, playerId, onGameUpdate, onMultiplayerAction, lastDrawnPosition]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const { x, y } = getCanvasPosition(event);
    setIsDrawing(true);
    setLastDrawnPosition(null);
    drawPixel(x, y, gameData.selectedColor);
  }, [getCanvasPosition, drawPixel, gameData.selectedColor]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    
    const { x, y } = getCanvasPosition(event);
    drawPixel(x, y, gameData.selectedColor);
  }, [isDrawing, getCanvasPosition, drawPixel, gameData.selectedColor]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setLastDrawnPosition(null);
  }, []);

  const handleColorSelect = useCallback((color: Color) => {
    const newGameData: DrawingGameData = {
      ...gameData,
      selectedColor: color
    };
    onGameUpdate(newGameData);
  }, [gameData, onGameUpdate]);

  const handleClearCanvas = useCallback(() => {
    const newGameData: DrawingGameData = {
      ...gameData,
      grid: clearGrid(),
      actionHistory: []
    };
    onGameUpdate(newGameData);
    
    // Send multiplayer action if in multiplayer mode
    if (gameData.multiplayer.isMultiplayer && onMultiplayerAction) {
      onMultiplayerAction({
        type: 'CLEAR_CANVAS',
        payload: { playerId }
      });
    }
  }, [gameData, onGameUpdate, onMultiplayerAction, playerId]);

  const handleDownloadImage = useCallback(() => {
    downloadGridAsImage(gameData.grid, 'my-drawing.png');
  }, [gameData.grid]);

  return (
    <div className="drawing-game">
      <div className="drawing-game-header">
        <h2>🎨 Drawing Canvas</h2>
        <div className="drawing-game-status">
          {gameData.multiplayer.isMultiplayer ? (
            <div className="drawing-multiplayer-status">
              <span>🌐 Multiplayer Session</span>
              {gameData.multiplayer.connectedPlayers && (
                <div className="drawing-player-list">
                  {gameData.multiplayer.connectedPlayers.map(player => (
                    <div key={player} className="drawing-player-indicator">
                      {player === playerId ? 'You' : player.substring(0, 8)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            'Draw anything you want on the 32x32 canvas!'
          )}
        </div>
      </div>

      <div className="drawing-game-content">
        <div className="drawing-canvas-container">
          <canvas
            ref={canvasRef}
            width={canvasDisplaySize}
            height={canvasDisplaySize}
            className="drawing-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        <div className="color-palette">
          <div className="color-palette-header">Color Palette</div>
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              className={`color-button ${gameData.selectedColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handleColorSelect(color)}
              title={`Select ${color}`}
            />
          ))}
        </div>

        <div className="drawing-game-controls">
          <button
            className="drawing-control-button"
            onClick={handleDownloadImage}
            title="Download your drawing as PNG image"
          >
            📥 Download Image
          </button>
          
          <button
            className="drawing-control-button danger"
            onClick={handleClearCanvas}
            title="Clear the entire canvas"
          >
            🗑️ Clear Canvas
          </button>
        </div>
      </div>
    </div>
  );
};

export default DrawingGame;