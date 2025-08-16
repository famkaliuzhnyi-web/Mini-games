/**
 * Game2048 Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { Playfield } from '../../components/common';
import type { PlayfieldDimensions } from '../../components/common';
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

      {/* Game Board with Playfield scaling */}
      <Playfield
        aspectRatio={1} // Square aspect ratio for 2048
        baseWidth={360}
        baseHeight={360}
        minConstraints={{
          minWidth: 280,
          minHeight: 280,
          minScale: 0.6
        }}
        maxConstraints={{
          maxWidth: 500,
          maxHeight: 500,
          maxScale: 1.4
        }}
        padding={10}
        responsive={true}
      >
        {(dimensions: PlayfieldDimensions) => (
          <div className="game2048-grid-container">
            <div 
              className="game2048-grid"
              style={{
                width: `${dimensions.width}px`,
                height: `${dimensions.height}px`,
                fontSize: `${Math.max(1, dimensions.scale * 2.2)}rem`
              }}
            >
              {gameState.data.grid.map((row, rowIndex) =>
                row.map((tile, colIndex) => (
                  <div 
                    key={`${rowIndex}-${colIndex}`}
                    className={getTileClass(tile, rowIndex, colIndex)}
                    style={{
                      fontSize: `${Math.max(1, dimensions.scale * 2.2)}rem`
                    }}
                  >
                    {tile > 0 ? tile : ''}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Playfield>
    </div>
  );
};

// Stats Component 
export const Game2048Stats: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    scoreAnimated,
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
        <small>Moves: {gameState.data.moves}</small>
      </div>
      {lastSaveEvent && lastSaveEvent.success && (
        <div className="game2048-save-status" style={{ 
          marginTop: '0.25rem',
          padding: '0.2rem',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4CAF50',
          borderRadius: '4px',
          fontSize: '0.65rem',
          textAlign: 'center'
        }}>
          ✅ Saved
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
    handleNewGame,
    handleUndo
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
      </div>
    </div>
  );
};