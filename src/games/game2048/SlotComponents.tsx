/**
 * Game2048 Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { Direction } from './types';
import { useGame2048State } from './useGame2048State';

// Game Field Component (only the grid and status messages)
export const Game2048GameField: React.FC<{ playerId: string }> = ({ playerId }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const {
    gameState,
    isLoading,
    handleMove,
    getTileClass
  } = useGame2048State(playerId);

  // Keyboard event handler
  const handleKeyPress = useCallback(async (event: KeyboardEvent) => {
    if (gameState.data.gameOver) return;

    let direction: Direction | null = null;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'up';
        break;
      case 'ArrowDown':  
      case 's':
      case 'S':
        direction = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'right';
        break;
      default:
        return;
    }

    event.preventDefault();
    if (direction) {
      await handleMove(direction);
    }
  }, [gameState.data.gameOver, handleMove]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Swipe gesture support
  useSwipeGestures(gameContainerRef, {
    onSwipeLeft: () => handleMove('left'),
    onSwipeRight: () => handleMove('right'),
    onSwipeUp: () => handleMove('up'),
    onSwipeDown: () => handleMove('down'),
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });

  if (isLoading) {
    return <div>Loading game...</div>;
  }

  return (
    <div className="game2048-game-field" ref={gameContainerRef}>
      {/* Game Status Messages */}
      {gameState.data.gameWon && (
        <div className="game2048-status game2048-status-won">
          🎉 You Win! You reached 2048! 🎉
        </div>
      )}
      
      {gameState.data.gameOver && (
        <div className="game2048-status game2048-status-over">
          💀 Game Over! No more moves available.
        </div>
      )}

      <div className="game2048-grid-container">
        <div className="game2048-grid">
          {gameState.data.grid.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className={getTileClass(tile, rowIndex, colIndex)}
              >
                {tile > 0 ? tile : ''}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Stats Component 
export const Game2048Stats: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    scoreAnimated,
    autoSaveEnabled,
    lastSaveEvent
  } = useGame2048State(playerId);

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  return (
    <div className="game2048-stats">
      <div className="game2048-score-container">
        <div className="game2048-score-box">
          <div className="game2048-score-label">Score</div>
          <div className={`game2048-score-value ${scoreAnimated ? 'game2048-score-animated' : ''}`}>
            {gameState.data.score}
          </div>
        </div>
        <div className="game2048-score-box">
          <div className="game2048-score-label">Best</div>
          <div className="game2048-score-value">{gameState.data.bestScore}</div>
        </div>
      </div>
      <div className="game2048-stats-info">
        <small>Moves: {gameState.data.moves} | Auto-save: {autoSaveEnabled ? 'On' : 'Off'}</small>
      </div>
      {lastSaveEvent && (
        <div className="game2048-save-status" style={{ 
          marginTop: '0.5rem',
          padding: '0.25rem',
          backgroundColor: lastSaveEvent.success ? '#e8f5e8' : '#fde8e8',
          border: `1px solid ${lastSaveEvent.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '0.7rem',
          textAlign: 'center'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
        </div>
      )}
    </div>
  );
};

// Controls Component
export const Game2048Controls: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    hasSave,
    handleNewGame,
    handleUndo,
    handleManualSave,
    handleManualLoad
  } = useGame2048State(playerId);

  if (isLoading) {
    return <div>Loading controls...</div>;
  }

  return (
    <div className="game2048-controls">
      <div className="game2048-control-buttons">
        <button 
          className="game2048-btn game2048-btn-primary"
          onClick={handleNewGame}
        >
          New Game
        </button>
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleUndo}
          disabled={!gameState.data.canUndo}
        >
          Undo
        </button>
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleManualSave}
        >
          Save
        </button>
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleManualLoad}
          disabled={!hasSave}
        >
          Load
        </button>
      </div>
      <div className="game2048-instructions">
        <p>
          <strong>Controls:</strong> Arrow keys, WASD, or swipe to move tiles.
        </p>
        <p>
          📱 <strong>Mobile:</strong> Swipe in any direction on the game board.
        </p>
      </div>
    </div>
  );
};