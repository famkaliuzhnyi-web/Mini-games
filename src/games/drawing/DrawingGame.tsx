/**
 * Drawing Game React Component - Main game component
 */
import React, { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import type { DrawingGameData, Color } from './types';
import { DEFAULT_COLORS, GRID_SIZE } from './types';
import { applyDrawAction, createDrawAction, clearGrid, createEmptyGrid } from './logic';
import { useGameSave } from '../../hooks/useGameSave';
import { useCoinService } from '../../hooks/useCoinService';
import './DrawingGame.css';

interface DrawingGameProps {
  playerId: string;
}

// Game controller for drawing game
class DrawingGameController {
  config = {
    id: 'drawing',
    name: 'Drawing Canvas',
    description: 'Create pixel art on a 32x32 canvas',
    version: '1.0.0',
    autoSaveEnabled: true,
    autoSaveIntervalMs: 10000, // Save every 10 seconds
    minPlayers: 1,
    maxPlayers: 1,
    category: 'Creative'
  };

  getInitialState(): DrawingGameData {
    return {
      grid: createEmptyGrid(),
      selectedColor: DEFAULT_COLORS[0], // Black
      gameStatus: 'drawing',
      actionHistory: [],
      gameMode: 'single-player',
      multiplayer: {
        isMultiplayer: false
      }
    };
  }

  onSaveLoad = (gameState: import('../../types/game').GameState<DrawingGameData>): void => {
    // Ensure grid is properly initialized
    if (!gameState.data.grid || gameState.data.grid.length !== GRID_SIZE) {
      gameState.data.grid = createEmptyGrid();
    }
    
    // Ensure selected color is valid
    if (!gameState.data.selectedColor || !DEFAULT_COLORS.includes(gameState.data.selectedColor)) {
      gameState.data.selectedColor = DEFAULT_COLORS[0];
    }

    // Ensure action history is initialized
    if (!gameState.data.actionHistory) {
      gameState.data.actionHistory = [];
    }
  };

  onSaveDropped = (): void => {
    // Called when save is dropped - nothing special needed
  };
}

export const DrawingGame: React.FC<DrawingGameProps> = ({ playerId }) => {
  const controller = useMemo(() => new DrawingGameController(), []);
  const { awardGamePlay } = useCoinService();
  
  // State for collapsible save section
  const [saveExpanded, setSaveExpanded] = useState(false);
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave,
    triggerAutoSave
  } = useGameSave<DrawingGameData>({
    gameId: 'drawing',
    playerId,
    gameConfig: controller.config,
    initialState: {
      gameId: 'drawing',
      playerId,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      data: controller.getInitialState(),
      score: 0,
      isComplete: false
    },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Canvas and drawing state
  // Canvas and drawing state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastDrawnPosition, setLastDrawnPosition] = useState<{x: number, y: number} | null>(null);

  // Canvas size in pixels (will be scaled up for visibility)
  const canvasDisplaySize = 320; // 10x scale of 32x32 grid

  // Trigger auto-save when action history changes
  useEffect(() => {
    if (autoSaveEnabled && gameState.data.actionHistory.length > 0) {
      triggerAutoSave();
    }
  }, [gameState.data.actionHistory, autoSaveEnabled, triggerAutoSave]);

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
        const color = gameState.data.grid[y][x];
        if (color) {
          ctx.fillStyle = color;
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }
  }, [gameState.data.grid, canvasDisplaySize]);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false; // Pixel-perfect rendering

    // Draw grid
    drawGrid(ctx);
  }, [gameState.data.grid, drawGrid]);

  const getCanvasPosition = useCallback((clientX: number, clientY: number): {x: number, y: number} => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scale = canvasDisplaySize / GRID_SIZE;
    
    const x = Math.floor((clientX - rect.left) / scale);
    const y = Math.floor((clientY - rect.top) / scale);
    
    return { x: Math.max(0, Math.min(x, GRID_SIZE - 1)), y: Math.max(0, Math.min(y, GRID_SIZE - 1)) };
  }, [canvasDisplaySize]);

  const drawPixel = useCallback((x: number, y: number, color: Color) => {
    // Avoid drawing same pixel repeatedly
    if (lastDrawnPosition && lastDrawnPosition.x === x && lastDrawnPosition.y === y) {
      return;
    }

    const action = createDrawAction(x, y, color, playerId);
    const newGrid = applyDrawAction(gameState.data.grid, action);
    
    const newGameData: DrawingGameData = {
      ...gameState.data,
      grid: newGrid,
      actionHistory: [...gameState.data.actionHistory, action]
    };
    
    setGameState({
      ...gameState,
      data: newGameData,
      score: newGameData.actionHistory.length,
      lastModified: new Date().toISOString()
    });

    setLastDrawnPosition({ x, y });
  }, [gameState, setGameState, playerId, lastDrawnPosition]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const { x, y } = getCanvasPosition(event.clientX, event.clientY);
    setIsDrawing(true);
    setLastDrawnPosition(null);
    drawPixel(x, y, gameState.data.selectedColor);
  }, [getCanvasPosition, drawPixel, gameState.data.selectedColor]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    
    const { x, y } = getCanvasPosition(event.clientX, event.clientY);
    drawPixel(x, y, gameState.data.selectedColor);
  }, [isDrawing, getCanvasPosition, drawPixel, gameState.data.selectedColor]);

  const handleMouseUp = useCallback(() => {
    setIsDrawing(false);
    setLastDrawnPosition(null);
  }, []);

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const touch = event.touches[0];
    if (!touch) return;
    
    const { x, y } = getCanvasPosition(touch.clientX, touch.clientY);
    setIsDrawing(true);
    setLastDrawnPosition(null);
    drawPixel(x, y, gameState.data.selectedColor);
  }, [getCanvasPosition, drawPixel, gameState.data.selectedColor]);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    event.preventDefault();
    
    const touch = event.touches[0];
    if (!touch) return;
    
    const { x, y } = getCanvasPosition(touch.clientX, touch.clientY);
    drawPixel(x, y, gameState.data.selectedColor);
  }, [isDrawing, getCanvasPosition, drawPixel, gameState.data.selectedColor]);

  const handleTouchEnd = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsDrawing(false);
    setLastDrawnPosition(null);
  }, []);

  const handleColorSelect = useCallback((color: Color) => {
    const newGameData: DrawingGameData = {
      ...gameState.data,
      selectedColor: color
    };
    
    setGameState({
      ...gameState,
      data: newGameData,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  const handleClearCanvas = useCallback(() => {
    const newGameData: DrawingGameData = {
      ...gameState.data,
      grid: clearGrid(),
      actionHistory: []
    };
    
    setGameState({
      ...gameState,
      data: newGameData,
      score: 0,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  const handleNewDrawing = useCallback(() => {
    const newGameData = controller.getInitialState();
    
    setGameState({
      ...gameState,
      data: newGameData,
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString()
    });

    // Award small play reward for starting a new drawing
    awardGamePlay('drawing', 1);
  }, [gameState, setGameState, controller, awardGamePlay]);

  const handleDownloadImage = useCallback(() => {
    // Import downloadGridAsImage dynamically to avoid unused import
    import('./logic').then(({ downloadGridAsImage }) => {
      downloadGridAsImage(gameState.data.grid, 'my-drawing.png');
    });
  }, [gameState.data.grid]);

  /**
   * Handle manual save with user feedback
   */
  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Drawing saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  /**
   * Handle manual load with user feedback
   */
  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Drawing loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

  /**
   * Handle save deletion with confirmation
   */
  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved drawing? This cannot be undone.')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="drawing-game-loading">
        <h2>Loading Drawing Canvas...</h2>
      </div>
    );
  }

  return (
    <div className="drawing-game">
      <div className="drawing-game-header">
        <h2>{controller.config.name}</h2>
        <p>{controller.config.description}</p>
      </div>
      
      {/* Game Status */}
      <div className="drawing-game-status">
        <div className="drawing-game-stats">
          <span>Actions: {gameState.data.actionHistory.length}</span>
          <span>Selected: </span>
          <div 
            className="current-color-indicator" 
            style={{ 
              backgroundColor: gameState.data.selectedColor,
              width: '16px',
              height: '16px',
              borderRadius: '4px',
              border: '2px solid #333',
              display: 'inline-block'
            }}
          />
        </div>
      </div>

      {/* Canvas Container */}
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
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
          />
        </div>

        {/* Color Palette */}
        <div className="color-palette">
          <div className="color-palette-header">Color Palette</div>
          <div className="color-palette-grid">
            {DEFAULT_COLORS.map((color) => (
              <button
                key={color}
                className={`color-button ${gameState.data.selectedColor === color ? 'selected' : ''}`}
                style={{ backgroundColor: color }}
                onClick={() => handleColorSelect(color)}
                title={`Select ${color}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Game Controls */}
      <div className="drawing-game-controls">
        <button 
          onClick={handleNewDrawing}
          className="drawing-control-button primary"
        >
          🎨 New Drawing
        </button>

        <button
          className="drawing-control-button"
          onClick={handleDownloadImage}
          title="Download your drawing as PNG image"
        >
          📥 Download
        </button>
        
        <button
          className="drawing-control-button danger"
          onClick={handleClearCanvas}
          title="Clear the entire canvas"
        >
          🗑️ Clear Canvas
        </button>
      </div>

      {/* Collapsible Save Management */}
      <div className={`drawing-save-section ${saveExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="drawing-save-header" onClick={() => setSaveExpanded(!saveExpanded)}>
          <h3>Save Management</h3>
          <span className={`drawing-save-toggle ${saveExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        
        {saveExpanded && (
          <div className="drawing-save-content">
            <div className="drawing-autosave-toggle">
              <input
                type="checkbox"
                id="auto-save-toggle"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
              />
              <label htmlFor="auto-save-toggle">
                Auto-save enabled (saves every {controller.config.autoSaveIntervalMs / 1000}s)
              </label>
            </div>

            <div className="drawing-save-status">
              {hasSave ? 
                (lastSaveEvent?.action === 'auto-save' && 
                 (Date.now() - new Date(lastSaveEvent.timestamp).getTime()) < 5000) ? 
                  '💾 Save available (recently saved)' : 
                  '💾 Save available' 
                : '❌ No save data'
              }
              {autoSaveEnabled && gameState.score && gameState.score > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-success, #4CAF50)', marginTop: '0.5rem' }}>
                  ⚡ Auto-save active - actions saved automatically
                </div>
              )}
            </div>

            <div className="drawing-save-buttons">
              <button 
                onClick={handleManualSave}
                className="drawing-save-btn save"
              >
                Manual Save
              </button>
              
              <button 
                onClick={handleManualLoad}
                disabled={!hasSave}
                className="drawing-save-btn load"
              >
                Load Drawing
              </button>
              
              <button 
                onClick={handleDropSave}
                disabled={!hasSave}
                className="drawing-save-btn delete"
              >
                Delete Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '1rem',
          background: lastSaveEvent.success ? 
            'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${lastSaveEvent.success ? 'var(--color-success, #4CAF50)' : 'var(--color-error, #f44336)'}`,
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: '500',
          color: lastSaveEvent.success ? 'var(--color-success, #4CAF50)' : 'var(--color-error, #f44336)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small style={{ opacity: 0.8 }}>
            {new Date(lastSaveEvent.timestamp).toLocaleString()}
          </small>
        </div>
      )}
    </div>
  );
};

export default DrawingGame;