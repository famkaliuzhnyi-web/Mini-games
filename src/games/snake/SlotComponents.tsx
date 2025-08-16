/**
 * Snake Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { Playfield } from '../../components/common';
import type { PlayfieldDimensions } from '../../components/common';
import { SnakeGameBoard } from './components/SnakeGameBoard';
import { useSnakeState } from './useSnakeState';

// Game Field Component (only the board)
export const SnakeGameField: React.FC<{ playerId: string }> = ({ playerId }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const { gameState, isLoading, actions } = useSnakeState(playerId);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isLoading || !gameState.data) return;
    
    const gameData = gameState.data;
    if (gameData.gameOver || gameData.isPaused) return;
    
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        actions.changeDirection('up');
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        actions.changeDirection('down');
        break;
      case 'ArrowLeft':
      case 'KeyA':
        event.preventDefault();
        actions.changeDirection('left');
        break;
      case 'ArrowRight':
      case 'KeyD':
        event.preventDefault();
        actions.changeDirection('right');
        break;
    }
  }, [isLoading, gameState.data, actions]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Touch/swipe controls
  useSwipeGestures(gameContainerRef, {
    onSwipeUp: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        actions.changeDirection('up');
      }
    },
    onSwipeDown: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        actions.changeDirection('down');
      }
    },
    onSwipeLeft: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        actions.changeDirection('left');
      }
    },
    onSwipeRight: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        actions.changeDirection('right');
      }
    },
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });

  if (isLoading) {
    return <div>Loading Snake board...</div>;
  }

  if (!gameState.data) {
    return <div>Failed to load Snake game</div>;
  }

  return (
    <div className="snake-game-field" ref={gameContainerRef}>
      {/* Game Board with Playfield scaling */}
      <Playfield
        aspectRatio={gameState.data.config.gridWidth / gameState.data.config.gridHeight} // Dynamic aspect ratio based on grid
        baseWidth={400}
        baseHeight={400}
        minConstraints={{
          minWidth: 280,
          minHeight: 280,
          minScale: 0.6
        }}
        maxConstraints={{
          maxWidth: 600,
          maxHeight: 600,
          maxScale: 1.4
        }}
        padding={10}
        responsive={true}
      >
        {(dimensions: PlayfieldDimensions) => (
          <SnakeGameBoard 
            gameData={gameState.data}
            playfieldDimensions={dimensions}
          />
        )}
      </Playfield>
    </div>
  );
};

// Stats Component (game statistics and player info)
export const SnakeStats: React.FC<{ playerId: string }> = ({ playerId }) => {
  const { gameState, isLoading, autoSaveEnabled } = useSnakeState(playerId);

  if (isLoading) {
    return <div>Loading stats...</div>;
  }

  if (!gameState.data) {
    return <div>No game data</div>;
  }

  const gameData = gameState.data;
  const playerSnake = gameData.snakes.find(s => s.id === playerId);

  return (
    <div className="snake-stats">
      {/* Player Statistics */}
      <div className="game-stats">
        <div className="stat-row">
          <span className="stat-label">Score:</span>
          <span className="stat-value">{playerSnake?.score || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Length:</span>
          <span className="stat-value">{playerSnake?.segments.length || 0}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Time:</span>
          <span className="stat-value">
            {Math.floor(gameData.stats.elapsedTime / 60)}:
            {(gameData.stats.elapsedTime % 60).toString().padStart(2, '0')}
          </span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Food:</span>
          <span className="stat-value">{gameData.stats.totalFood}</span>
        </div>
      </div>

      {/* Game Mode Info */}
      <div className="game-mode-info">
        <div className="mode-indicator">
          {gameData.gameMode === 'multiplayer' ? '👥 Multiplayer' : '👤 Single Player'}
        </div>
        {playerSnake && (
          <div className="player-info">
            <span 
              className="player-color" 
              style={{ backgroundColor: playerSnake.color }}
            />
            <span>Your Snake</span>
            {!playerSnake.alive && <span className="dead-indicator">💀</span>}
          </div>
        )}
      </div>

      {/* Multiplayer Player List */}
      {gameData.gameMode === 'multiplayer' && gameData.snakes.length > 1 && (
        <div className="multiplayer-stats">
          <h4>All Players:</h4>
          <div className="players-list">
            {gameData.snakes.map(snake => (
              <div key={snake.id} className={`player-item ${!snake.alive ? 'dead' : ''} ${snake.id === playerId ? 'current' : ''}`}>
                <span 
                  className="player-color" 
                  style={{ backgroundColor: snake.color }}
                />
                <span className="player-name">
                  {snake.id === playerId ? 'You' : snake.id}
                </span>
                <span className="player-score">{snake.score}</span>
                {!snake.alive && <span className="player-status">💀</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Save Info */}
      <div className="snake-save-info">
        <small>💾 Auto-save: {autoSaveEnabled ? 'On' : 'Off'}</small>
      </div>
    </div>
  );
};

// Controls Component (action buttons and mobile controls)
export const SnakeControls: React.FC<{ playerId: string }> = ({ playerId }) => {
  const { gameState, isLoading, actions } = useSnakeState(playerId);

  if (isLoading) {
    return <div>Loading controls...</div>;
  }

  if (!gameState.data) {
    return <div>No game controls available</div>;
  }

  const gameData = gameState.data;

  return (
    <div className="snake-controls">
      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={gameData.isPaused ? actions.resumeGame : actions.pauseGame}
          disabled={gameData.gameOver}
          className={`action-btn ${gameData.isPaused ? 'resume' : 'pause'}`}
        >
          {gameData.isPaused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={actions.resetGame}
          className="action-btn reset"
        >
          🔄 New Game
        </button>
      </div>

      {/* Mobile Touch Controls */}
      <div className="mobile-controls">
        <div className="mobile-control-grid">
          <div className="mobile-row">
            <button
              onClick={() => actions.changeDirection('up')}
              disabled={gameData.gameOver || gameData.isPaused}
              className="mobile-control-btn"
              type="button"
              aria-label="Move Up"
            >
              ⬆️
            </button>
          </div>
          <div className="mobile-row">
            <button
              onClick={() => actions.changeDirection('left')}
              disabled={gameData.gameOver || gameData.isPaused}
              className="mobile-control-btn"
              type="button"
              aria-label="Move Left"
            >
              ⬅️
            </button>
            <div className="mobile-spacer"></div>
            <button
              onClick={() => actions.changeDirection('right')}
              disabled={gameData.gameOver || gameData.isPaused}
              className="mobile-control-btn"
              type="button"
              aria-label="Move Right"
            >
              ➡️
            </button>
          </div>
          <div className="mobile-row">
            <button
              onClick={() => actions.changeDirection('down')}
              disabled={gameData.gameOver || gameData.isPaused}
              className="mobile-control-btn"
              type="button"
              aria-label="Move Down"
            >
              ⬇️
            </button>
          </div>
        </div>
      </div>

      {/* Control Instructions */}
      <div className="control-instructions">
        <div className="instruction-group">
          <strong>Keyboard:</strong>
          <p>WASD or Arrow keys to move</p>
          <p>P to pause, R to restart</p>
        </div>
        <div className="instruction-group">
          <strong>Mobile:</strong>
          <p>Swipe or tap buttons to control</p>
        </div>
        {gameData.gameMode === 'multiplayer' && (
          <div className="instruction-group">
            <strong>Multiplayer:</strong>
            <p>Avoid other snakes!</p>
          </div>
        )}
      </div>
    </div>
  );
};