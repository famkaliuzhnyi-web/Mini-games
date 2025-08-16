/**
 * Tetris Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { Playfield } from '../../components/common';
import type { PlayfieldDimensions } from '../../components/common';
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
      case 'KeyC':
      case 'KeyH':
        event.preventDefault();
        dispatch({ type: 'HOLD' });
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
      {/* Game Board with Playfield scaling */}
      <Playfield
        aspectRatio={0.5} // Tetris board aspect ratio (10 columns : 20 rows = 0.5)
        baseWidth={280}
        baseHeight={560}
        minConstraints={{
          minWidth: 200,
          minHeight: 400,
          minScale: 0.6
        }}
        maxConstraints={{
          maxWidth: 400,
          maxHeight: 800,
          maxScale: 1.4
        }}
        padding={10}
        responsive={true}
      >
        {(dimensions: PlayfieldDimensions) => (
          <TetrisBoard
            grid={gameState.data.grid}
            activePiece={gameState.data.activePiece}
            ghostPiece={gameState.data.ghostPiece}
            gameOver={gameState.data.gameOver}
            dangerZoneActive={gameState.data.dangerZoneActive}
            playfieldDimensions={dimensions}
          />
        )}
      </Playfield>
      
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
  const { gameState, isLoading, autoSaveEnabled } = useTetrisState(playerId);

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
      </div>

      {/* Next Pieces Preview */}
      <div className="next-pieces">
        <h4>Next Pieces</h4>
        <div className="next-pieces-display">
          {gameState.data.nextPieces.slice(0, 3).map((piece, index) => (
            <div key={index} className="next-piece-item">
              <span className="next-piece-emoji">{nextPieceEmojis[piece]}</span>
              <span className="next-piece-type">{piece}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Save Info */}
      <div className="tetris-save-info">
        <small>💾 Auto-save: {autoSaveEnabled ? 'On' : 'Off'}</small>
      </div>
    </div>
  );
};

// Controls Component (action buttons and control instructions)
export const TetrisControls: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
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
      </div>

      {/* Mobile Touch Controls */}
      <div className="mobile-controls">
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
    </div>
  );
};