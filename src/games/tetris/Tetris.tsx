/**
 * Tetris Game - Classic block puzzle game
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { TetrisAction, PieceType } from './types';
import { useTetrisState } from './useTetrisState';
import {
  PIECE_DEFINITIONS,
  BOARD_HEIGHT,
  BOARD_WIDTH,
  BOARD_BUFFER
} from './logic';
import './Tetris.css';

interface TetrisProps {
  playerId: string;
}

export const Tetris: React.FC<TetrisProps> = ({ playerId }) => {
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const dropTimerRef = useRef<number | undefined>(undefined);
  
  const { gameState, isLoading, actions } = useTetrisState(playerId);

  // Game actions with proper tick handling
  const performAction = useCallback((action: TetrisAction) => {
    if (isLoading || !gameState.data) return;
    
    // Handle TICK action directly for automatic piece drop
    if (action.type === 'TICK') {
      if (!gameState.data.isPaused && gameState.data.activePiece) {
        actions.performAction({ type: 'MOVE_DOWN' });
      }
      return;
    }
    
    actions.performAction(action);
  }, [gameState.data, isLoading, actions]);

  // Set up game tick timer
  useEffect(() => {
    if (!gameState.data || gameState.data.gameOver || gameState.data.isPaused) {
      if (dropTimerRef.current) {
        clearInterval(dropTimerRef.current);
        dropTimerRef.current = undefined;
      }
      return;
    }

    dropTimerRef.current = window.setInterval(() => {
      performAction({ type: 'TICK' });
    }, gameState.data.dropTime);

    return () => {
      if (dropTimerRef.current) {
        clearInterval(dropTimerRef.current);
      }
    };
  }, [gameState.data?.dropTime, gameState.data?.gameOver, gameState.data?.isPaused, performAction]);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isLoading || !gameState.data) return;

    switch (event.code) {
      case 'ArrowLeft':
      case 'KeyA':
        event.preventDefault();
        performAction({ type: 'MOVE_LEFT' });
        break;
      case 'ArrowRight':
      case 'KeyD':
        event.preventDefault();
        performAction({ type: 'MOVE_RIGHT' });
        break;
      case 'ArrowDown':
      case 'KeyS':
        event.preventDefault();
        performAction({ type: 'MOVE_DOWN' });
        break;
      case 'ArrowUp':
      case 'KeyW':
        event.preventDefault();
        performAction({ type: 'ROTATE' });
        break;
      case 'Space':
        event.preventDefault();
        performAction({ type: 'HARD_DROP' });
        break;
      case 'KeyP':
        event.preventDefault();
        performAction({ type: 'PAUSE' });
        break;
    }
  }, [isLoading, gameState.data, performAction]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  // Touch/swipe controls
  useSwipeGestures(gameContainerRef, {
    onSwipeLeft: () => performAction({ type: 'MOVE_LEFT' }),
    onSwipeRight: () => performAction({ type: 'MOVE_RIGHT' }),
    onSwipeDown: () => performAction({ type: 'HARD_DROP' }),
    onSwipeUp: () => performAction({ type: 'ROTATE' })
  });

  if (isLoading) {
    return (
      <div className="tetris-loading">
        <div className="loading-spinner"></div>
        <p>Loading Tetris...</p>
      </div>
    );
  }

  if (!gameState.data) {
    return (
      <div className="tetris-error">
        <p>Failed to load game state</p>
        <button onClick={() => performAction({ type: 'NEW_GAME' })}>
          Start New Game
        </button>
      </div>
    );
  }

  const gameData = gameState.data;

  // Render the game board with active piece
  const renderBoard = () => {
    // Defensive check: ensure board exists and is properly structured
    if (!gameData.board || !Array.isArray(gameData.board)) {
      return (
        <div className="tetris-board tetris-board--error">
          <div className="tetris-error-message">Board not available</div>
        </div>
      );
    }

    const displayBoard = gameData.board.map(row => Array.isArray(row) ? [...row] : []);
    
    // Add active piece to display board
    if (gameData.activePiece && gameData.activePiece.shape && Array.isArray(gameData.activePiece.shape)) {
      const piece = gameData.activePiece;
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (piece.shape[row] && piece.shape[row][col]) {
            const boardRow = piece.position.row + row;
            const boardCol = piece.position.col + col;
            if (boardRow >= 0 && boardRow < BOARD_HEIGHT + BOARD_BUFFER && 
                boardCol >= 0 && boardCol < BOARD_WIDTH &&
                displayBoard[boardRow]) {
              displayBoard[boardRow][boardCol] = piece.type;
            }
          }
        }
      }
    }

    // Only show visible part of the board (hide buffer area)
    const visibleBoard = displayBoard.slice(BOARD_BUFFER);

    return (
      <div className="tetris-board">
        {visibleBoard.map((row, rowIndex) => (
          <div key={rowIndex} className="tetris-row">
            {(Array.isArray(row) ? row : []).map((cell, colIndex) => (
              <div
                key={colIndex}
                className={`tetris-cell ${cell !== 0 ? `tetris-cell--${cell}` : ''}`}
                style={{
                  backgroundColor: cell !== 0 && PIECE_DEFINITIONS[cell as PieceType] 
                    ? PIECE_DEFINITIONS[cell as PieceType].color 
                    : undefined
                }}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Render next piece preview
  const renderNextPiece = () => {
    // Defensive check: ensure nextPiece exists and is valid
    if (!gameData.nextPiece || !PIECE_DEFINITIONS[gameData.nextPiece]) {
      return (
        <div className="tetris-next-piece">
          <h3>Next</h3>
          <div className="tetris-next-grid tetris-next-grid--error">
            <div className="tetris-error-message">Next piece not available</div>
          </div>
        </div>
      );
    }

    const pieceDefinition = PIECE_DEFINITIONS[gameData.nextPiece];
    if (!pieceDefinition.shapes || !Array.isArray(pieceDefinition.shapes) || !pieceDefinition.shapes[0]) {
      return (
        <div className="tetris-next-piece">
          <h3>Next</h3>
          <div className="tetris-next-grid tetris-next-grid--error">
            <div className="tetris-error-message">Shape not available</div>
          </div>
        </div>
      );
    }

    const nextShape = pieceDefinition.shapes[0];
    return (
      <div className="tetris-next-piece">
        <h3>Next</h3>
        <div className="tetris-next-grid">
          {nextShape.map((row, rowIndex) => (
            <div key={rowIndex} className="tetris-next-row">
              {(Array.isArray(row) ? row : []).map((cell, colIndex) => (
                <div
                  key={colIndex}
                  className={`tetris-next-cell ${cell ? `tetris-next-cell--${gameData.nextPiece}` : ''}`}
                  style={{
                    backgroundColor: cell ? pieceDefinition.color : undefined
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="tetris-game" ref={gameContainerRef}>
      <div className="tetris-container">
        {/* Game board */}
        <div className="tetris-board-container">
          {renderBoard()}
          
          {/* Game over overlay */}
          {gameData.gameOver && (
            <div className="tetris-game-over">
              <h2>Game Over!</h2>
              <p>Final Score: {gameData.score.toLocaleString()}</p>
              <button onClick={() => performAction({ type: 'NEW_GAME' })}>
                Play Again
              </button>
            </div>
          )}
          
          {/* Pause overlay */}
          {gameData.isPaused && !gameData.gameOver && (
            <div className="tetris-paused">
              <h2>Paused</h2>
              <p>Press P to continue</p>
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="tetris-side-panel">
          {/* Score and stats */}
          <div className="tetris-stats">
            <div className="tetris-stat">
              <label>Score</label>
              <span>{gameData.score.toLocaleString()}</span>
            </div>
            <div className="tetris-stat">
              <label>Level</label>
              <span>{gameData.level}</span>
            </div>
            <div className="tetris-stat">
              <label>Lines</label>
              <span>{gameData.lines}</span>
            </div>
          </div>

          {/* Next piece */}
          {renderNextPiece()}

          {/* Controls */}
          <div className="tetris-controls">
            <h3>Controls</h3>
            <div className="tetris-control-info">
              <p>Arrow Keys / WASD: Move & Rotate</p>
              <p>Space: Hard Drop</p>
              <p>P: Pause</p>
            </div>
            
            <div className="tetris-buttons">
              <button 
                onClick={() => performAction({ type: 'PAUSE' })}
                disabled={gameData.gameOver}
              >
                {gameData.isPaused ? 'Resume' : 'Pause'}
              </button>
              <button onClick={() => performAction({ type: 'NEW_GAME' })}>
                New Game
              </button>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="tetris-mobile-controls">
            <div className="tetris-mobile-row">
              <button onClick={() => performAction({ type: 'ROTATE' })}>
                ↻ Rotate
              </button>
            </div>
            <div className="tetris-mobile-row">
              <button onClick={() => performAction({ type: 'MOVE_LEFT' })}>
                ←
              </button>
              <button onClick={() => performAction({ type: 'MOVE_DOWN' })}>
                ↓
              </button>
              <button onClick={() => performAction({ type: 'MOVE_RIGHT' })}>
                →
              </button>
            </div>
            <div className="tetris-mobile-row">
              <button onClick={() => performAction({ type: 'HARD_DROP' })}>
                ⬇ Drop
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tetris;