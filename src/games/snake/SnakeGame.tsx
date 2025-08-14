/**
 * Snake Game Component - Main game component
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { SnakeGameBoard } from './components/SnakeGameBoard';
import { useSnakeState } from './useSnakeState';
import './SnakeGame.css';

interface SnakeGameProps {
  playerId: string;
}

export const SnakeGame: React.FC<SnakeGameProps> = ({ playerId }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    gameState,
    isLoading,
    autoSaveEnabled,
    actions: {
      changeDirection,
      pauseGame,
      resumeGame,
      resetGame
    }
  } = useSnakeState(playerId);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isLoading || !gameState.data) return;
    
    const gameData = gameState.data;
    
    switch (event.code) {
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        changeDirection('up');
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        changeDirection('down');
        break;
      case 'ArrowLeft':
      case 'KeyA':
        event.preventDefault();
        changeDirection('left');
        break;
      case 'ArrowRight':
      case 'KeyD':
        event.preventDefault();
        changeDirection('right');
        break;
      case 'Space':
      case 'KeyP':
        event.preventDefault();
        if (gameData.isPaused) {
          resumeGame();
        } else {
          pauseGame();
        }
        break;
      case 'KeyR':
        event.preventDefault();
        if (gameData.gameOver || gameData.isPaused) {
          resetGame();
        }
        break;
    }
  }, [isLoading, gameState.data, changeDirection, pauseGame, resumeGame, resetGame]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Touch/swipe controls
  useSwipeGestures(gameContainerRef, {
    onSwipeUp: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        changeDirection('up');
      }
    },
    onSwipeDown: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        changeDirection('down');
      }
    },
    onSwipeLeft: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        changeDirection('left');
      }
    },
    onSwipeRight: () => {
      if (!isLoading && gameState.data && !gameState.data.gameOver && !gameState.data.isPaused) {
        changeDirection('right');
      }
    },
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true  // Prevent default to stop page scrolling during swipes
  });

  if (isLoading) {
    return (
      <div className="snake-game-loading">
        <div>Loading Snake Game...</div>
      </div>
    );
  }

  if (!gameState.data) {
    return (
      <div className="snake-game-error">
        <div>Failed to load game state</div>
        <button onClick={resetGame}>Try Again</button>
      </div>
    );
  }

  const gameData = gameState.data;
  const playerSnake = gameData.snakes.find(s => s.id === playerId);

  return (
    <div className="snake-game" ref={gameContainerRef}>
      {/* Game Header */}
      <div className="snake-game-header">
        <div className="snake-game-info">
          <h2>🐍 Snake Game</h2>
          <div className="game-mode-indicator">
            {gameData.gameMode === 'multiplayer' ? '👥 Multiplayer' : '👤 Single Player'}
          </div>
        </div>
        
        <div className="snake-game-stats">
          <div className="stat-item">
            <span className="stat-label">Score:</span>
            <span className="stat-value">{playerSnake?.score || 0}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Time:</span>
            <span className="stat-value">{Math.floor(gameData.stats.elapsedTime / 60)}:{(gameData.stats.elapsedTime % 60).toString().padStart(2, '0')}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Food:</span>
            <span className="stat-value">{gameData.stats.totalFood}</span>
          </div>
        </div>
      </div>

      {/* Game Board */}
      <SnakeGameBoard gameData={gameData} />

      {/* Game Controls */}
      <div className="snake-game-controls">
        <div className="action-buttons">
          <button
            onClick={gameData.isPaused ? resumeGame : pauseGame}
            disabled={gameData.gameOver}
            className={`action-btn ${gameData.isPaused ? 'resume' : 'pause'}`}
          >
            {gameData.isPaused ? '▶️ Resume' : '⏸️ Pause'}
          </button>
          
          <button
            onClick={resetGame}
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
                onClick={() => changeDirection('up')}
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
                onClick={() => changeDirection('left')}
                disabled={gameData.gameOver || gameData.isPaused}
                className="mobile-control-btn"
                type="button"
                aria-label="Move Left"
              >
                ⬅️
              </button>
              <div className="mobile-spacer"></div>
              <button
                onClick={() => changeDirection('right')}
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
                onClick={() => changeDirection('down')}
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

        {/* Instructions */}
        <div className="snake-instructions">
          <p>
            <strong>Desktop:</strong> Use WASD or arrow keys to move, P to pause, R to restart
          </p>
          <p>
            <strong>Mobile:</strong> Swipe or use the buttons to control your snake
          </p>
          {gameData.gameMode === 'multiplayer' && (
            <p>
              <strong>Multiplayer:</strong> Each player controls their own colored snake. Avoid collision with other snakes!
            </p>
          )}
        </div>
      </div>

      {/* Multiplayer Player List */}
      {gameData.gameMode === 'multiplayer' && gameData.snakes.length > 1 && (
        <div className="snake-players-list">
          <h4>Players:</h4>
          <div className="players">
            {gameData.snakes.map(snake => (
              <div key={snake.id} className={`player-item ${!snake.alive ? 'dead' : ''}`}>
                <span 
                  className="player-color" 
                  style={{ backgroundColor: snake.color }}
                />
                <span className="player-name">{snake.id}</span>
                <span className="player-score">{snake.score}</span>
                {!snake.alive && <span className="player-status">💀</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSaveEnabled && (
        <div className="snake-save-info">
          <small>💾 Auto-save: On</small>
        </div>
      )}
    </div>
  );
};

export default SnakeGame;