/**
 * Tetris Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { TetrisGameData, TetrisAction, PieceType } from './types';
import { TetrisBoard } from './components/TetrisBoard';
import {
  createEmptyGrid,
  createActivePiece,
  createInitialStats,
  getRandomPieceType,
  isValidPosition,
  movePiece,
  rotatePiece,
  placePiece,
  clearCompletedLines,
  isGameOver,
  updateStats,
  calculateDropSpeed,
  INITIAL_DROP_SPEED
} from './logic';

// Tetris game configuration (shared)
const TETRIS_CONFIG: GameConfig = {
  id: 'tetris',
  name: 'Tetris',
  description: 'Classic falling blocks puzzle game',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 30000
};

// Tetris game controller (shared)
class TetrisGameController implements GameController<TetrisGameData> {
  config = TETRIS_CONFIG;

  getInitialState(): GameState<TetrisGameData> {
    const now = new Date().toISOString();
    const firstPieceType = getRandomPieceType();
    
    return {
      gameId: 'tetris',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        grid: createEmptyGrid(),
        activePiece: createActivePiece(firstPieceType),
        nextPiece: getRandomPieceType(),
        stats: createInitialStats(),
        gameOver: false,
        paused: false,
        lastMoveTime: Date.now(),
        dropSpeed: INITIAL_DROP_SPEED
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<TetrisGameData>): boolean {
    return !!(
      state &&
      state.data &&
      Array.isArray(state.data.grid) &&
      typeof state.data.gameOver === 'boolean' &&
      state.data.stats &&
      typeof state.data.stats.score === 'number'
    );
  }

  onSaveLoad(state: GameState<TetrisGameData>): void {
    console.log('Tetris game loaded:', {
      score: state.data.stats.score,
      level: state.data.stats.level,
      lines: state.data.stats.lines
    });
  }

  onSaveDropped(): void {
    console.log('Tetris game save dropped');
  }
}

// Shared hook for Tetris game state and logic
export const useTetrisState = (playerId: string) => {
  const controller = useMemo(() => new TetrisGameController(), []);
  const gameLoopRef = useRef<number | null>(null);
  
  const {
    gameState,
    setGameState,
    hasSave,
    isLoading,
    autoSaveEnabled,
    toggleAutoSave
  } = useGameSave<TetrisGameData>({
    gameId: 'tetris',
    playerId,
    gameConfig: TETRIS_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Game action dispatcher
  const dispatch = useCallback((action: TetrisAction) => {
    const prevState = gameState;
    if (prevState.data.gameOver && action.type !== 'RESET') {
      return;
    }
    
    if (prevState.data.paused && !['PAUSE', 'UNPAUSE', 'RESET'].includes(action.type)) {
      return;
    }

    const newState = { ...prevState };
    const data = { ...newState.data };

    switch (action.type) {
      case 'MOVE': {
        if (!data.activePiece) break;
        
        const movedPiece = movePiece(data.activePiece, action.direction);
        if (isValidPosition(data.grid, movedPiece)) {
          data.activePiece = movedPiece;
          if (action.direction === 'down') {
            data.lastMoveTime = Date.now();
          }
        } else if (action.direction === 'down') {
          // Place piece logic
          data.grid = placePiece(data.grid, data.activePiece);
          const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
          data.grid = clearedGrid;
          data.stats = updateStats(data.stats, linesCleared);
          
          data.activePiece = createActivePiece(data.nextPiece);
          data.nextPiece = getRandomPieceType();
          
          if (isGameOver(data.grid, data.activePiece)) {
            data.gameOver = true;
            newState.isComplete = true;
          }
          
          data.dropSpeed = calculateDropSpeed(data.stats.level);
          data.stats.pieces++;
        }
        break;
      }

      case 'ROTATE': {
        if (!data.activePiece) break;
        
        const rotatedPiece = rotatePiece(data.activePiece, action.direction);
        if (isValidPosition(data.grid, rotatedPiece)) {
          data.activePiece = rotatedPiece;
        }
        break;
      }

      case 'DROP': {
        if (!data.activePiece) break;
        
        let dropPiece = data.activePiece;
        let dropDistance = 0;
        
        while (true) {
          const nextPiece = movePiece(dropPiece, 'down');
          if (isValidPosition(data.grid, nextPiece)) {
            dropPiece = nextPiece;
            dropDistance++;
          } else {
            break;
          }
        }
        
        if (dropDistance > 0) {
          data.activePiece = dropPiece;
          data.stats.score += dropDistance * 2;
          data.lastMoveTime = 0;
        }
        break;
      }

      case 'PAUSE':
        data.paused = !data.paused;
        break;

      case 'UNPAUSE':
        data.paused = false;
        break;

      case 'RESET': {
        const resetState = controller.getInitialState();
        setGameState({
          ...newState,
          data: { ...resetState.data },
          isComplete: false,
          score: 0,
          lastModified: new Date().toISOString()
        });
        return;
      }

      case 'TICK': {
        const now = Date.now();
        if (now - data.lastMoveTime >= data.dropSpeed) {
          if (!data.activePiece) break;
          
          const movedPiece = movePiece(data.activePiece, 'down');
          if (isValidPosition(data.grid, movedPiece)) {
            data.activePiece = movedPiece;
            data.lastMoveTime = Date.now();
          } else {
            // Place piece logic
            data.grid = placePiece(data.grid, data.activePiece);
            const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
            data.grid = clearedGrid;
            data.stats = updateStats(data.stats, linesCleared);
            
            data.activePiece = createActivePiece(data.nextPiece);
            data.nextPiece = getRandomPieceType();
            
            if (isGameOver(data.grid, data.activePiece)) {
              data.gameOver = true;
              newState.isComplete = true;
            }
            
            data.dropSpeed = calculateDropSpeed(data.stats.level);
            data.stats.pieces++;
            data.lastMoveTime = Date.now();
          }
        }
        break;
      }
    }

    newState.data = data;
    newState.score = data.stats.score;
    newState.lastModified = new Date().toISOString();
    setGameState(newState);
  }, [gameState, setGameState, controller]);

  // Control handlers
  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'down') => {
    if (isLoading) return;
    dispatch({ type: 'MOVE', direction });
  }, [dispatch, isLoading]);

  const handleMobileRotate = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'ROTATE', direction: 'clockwise' });
  }, [dispatch, isLoading]);

  const handleMobileHardDrop = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'DROP' });
  }, [dispatch, isLoading]);

  // Game loop for automatic piece falling
  useEffect(() => {
    if (gameState.data.gameOver || gameState.data.paused || isLoading) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 50) as unknown as number;

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.data.gameOver, gameState.data.paused, isLoading, dispatch]);

  return {
    gameState,
    isLoading,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave,
    handlePause,
    handleReset,
    handleMobileMove,
    handleMobileRotate,
    handleMobileHardDrop,
    dispatch
  };
};

// Game Field Component (only the board)
export const TetrisGameField: React.FC<{ playerId: string }> = ({ playerId }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { gameState, isLoading, dispatch } = useTetrisState(playerId);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isLoading) return;
    
    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'left' });
        break;
      case 'ArrowRight':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'right' });
        break;
      case 'ArrowDown':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'down' });
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch({ type: 'ROTATE', direction: 'clockwise' });
        break;
      case 'Space':
        event.preventDefault();
        dispatch({ type: 'DROP' });
        break;
      case 'KeyP':
        event.preventDefault();
        dispatch({ type: 'PAUSE' });
        break;
    }
  }, [dispatch, isLoading]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Swipe gesture support
  useSwipeGestures(gameContainerRef, {
    onSwipeLeft: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'left' });
      }
    },
    onSwipeRight: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'right' });
      }
    },
    onSwipeDown: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'down' });
      }
    },
    onSwipeUp: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'ROTATE', direction: 'clockwise' });
      }
    },
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });

  if (isLoading) {
    return <div>Loading Tetris board...</div>;
  }

  return (
    <div className="tetris-game-field" ref={gameContainerRef}>
      <TetrisBoard
        grid={gameState.data.grid}
        activePiece={gameState.data.activePiece}
        gameOver={gameState.data.gameOver}
      />
      
      {/* Game Status Messages */}
      {gameState.data.paused && !gameState.data.gameOver && (
        <div className="tetris-status paused">
          <h3>⏸️ Game Paused</h3>
          <p>Press Resume or 'P' to continue</p>
        </div>
      )}

      {gameState.data.gameOver && (
        <div className="tetris-status game-over">
          <h3>💀 Game Over</h3>
          <p>Final Score: {gameState.data.stats.score.toLocaleString()}</p>
          <p>Lines Cleared: {gameState.data.stats.lines}</p>
        </div>
      )}
    </div>
  );
};

// Stats Component (game statistics and next piece)
export const TetrisStats: React.FC<{ playerId: string }> = ({ playerId }) => {
  const { gameState, isLoading, hasSave, autoSaveEnabled } = useTetrisState(playerId);

  const nextPieceEmojis: Record<PieceType, string> = {
    I: '🟦', // Cyan bar
    O: '🟨', // Yellow square
    T: '🟪', // Purple T
    S: '🟩', // Green S
    Z: '🟥', // Red Z  
    J: '🔵', // Blue J
    L: '🟠'  // Orange L
  };

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="tetris-stats">
      {/* Game Statistics */}
      <div className="game-stats">
        <div className="stat-row">
          <span className="stat-label">Score:</span>
          <span className="stat-value">{gameState.data.stats.score.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Level:</span>
          <span className="stat-value">{gameState.data.stats.level}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Lines:</span>
          <span className="stat-value">{gameState.data.stats.lines}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Pieces:</span>
          <span className="stat-value">{gameState.data.stats.pieces}</span>
        </div>
      </div>

      {/* Next Piece Preview */}
      <div className="next-piece">
        <h4>Next Piece</h4>
        <div className="next-piece-display">
          <span className="next-piece-emoji">{nextPieceEmojis[gameState.data.nextPiece]}</span>
          <span className="next-piece-type">{gameState.data.nextPiece}</span>
        </div>
      </div>

      {/* Save Info */}
      <div className="tetris-save-info">
        <small>
          💾 Auto-save: {autoSaveEnabled ? 'Enabled' : 'Disabled'} | 
          {hasSave ? ' Save available' : ' No save data'}
        </small>
      </div>
    </div>
  );
};

// Controls Component (action buttons and control instructions)
export const TetrisControls: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    autoSaveEnabled,
    toggleAutoSave,
    handlePause,
    handleReset,
    handleMobileMove,
    handleMobileRotate,
    handleMobileHardDrop
  } = useTetrisState(playerId);

  if (isLoading) {
    return <div>Loading controls...</div>;
  }

  return (
    <div className="tetris-controls">
      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={handlePause}
          disabled={gameState.data.gameOver}
          className={`action-btn ${gameState.data.paused ? 'resume' : 'pause'}`}
        >
          {gameState.data.paused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={handleReset}
          className="action-btn reset"
        >
          🔄 Reset
        </button>

        <button
          onClick={toggleAutoSave} 
          className="action-btn toggle-save"
        >
          {autoSaveEnabled ? 'Disable' : 'Enable'} Auto-save
        </button>
      </div>

      {/* Game Controls Info */}
      <div className="game-controls">
        <div className="controls-info">
          <div className="control-row">
            <span className="control-key">←→</span>
            <span className="control-action">Move</span>
          </div>
          <div className="control-row">
            <span className="control-key">↓</span>
            <span className="control-action">Soft Drop</span>
          </div>
          <div className="control-row">
            <span className="control-key">↑</span>
            <span className="control-action">Rotate</span>
          </div>
          <div className="control-row">
            <span className="control-key">Space</span>
            <span className="control-action">Hard Drop</span>
          </div>
          <div className="control-row">
            <span className="control-key">P</span>
            <span className="control-action">Pause</span>
          </div>
        </div>
        <div className="swipe-info">
          <p>📱 <strong>Mobile:</strong> Swipe to move, up to rotate</p>
        </div>
      </div>

      {/* Mobile Touch Controls */}
      <div className="mobile-controls">
        <h4>Touch Controls</h4>
        <div className="mobile-control-grid">
          <button
            onClick={() => handleMobileMove('left')}
            disabled={gameState.data.gameOver || gameState.data.paused}
            className="mobile-control-btn move-left"
            type="button"
          >
            ⬅️
          </button>
          
          <button
            onClick={handleMobileRotate}
            disabled={gameState.data.gameOver || gameState.data.paused}
            className="mobile-control-btn rotate"
            type="button"
          >
            🔄
          </button>
          
          <button
            onClick={() => handleMobileMove('right')}
            disabled={gameState.data.gameOver || gameState.data.paused}
            className="mobile-control-btn move-right"
            type="button"
          >
            ➡️
          </button>
          
          <button
            onClick={() => handleMobileMove('down')}
            disabled={gameState.data.gameOver || gameState.data.paused}
            className="mobile-control-btn move-down"
            type="button"
          >
            ⬇️
          </button>
          
          <button
            onClick={handleMobileHardDrop}
            disabled={gameState.data.gameOver || gameState.data.paused}
            className="mobile-control-btn hard-drop"
            type="button"
          >
            ⏬
          </button>
        </div>
      </div>

      {/* Tips */}
      <div className="tips">
        <h4>Tips</h4>
        <ul className="tips-list">
          <li>Clear lines by filling complete rows</li>
          <li>Clearing multiple lines gives bonus points</li>
          <li>Game speeds up every 10 lines</li>
          <li>Use soft drop for better control</li>
        </ul>
      </div>
    </div>
  );
};