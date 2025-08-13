/**
 * Tetris Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { TetrisBoard } from './components/TetrisBoard';
import { useTetrisState, nextPieceEmojis } from './useTetrisState';

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