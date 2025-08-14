/**
 * Ping Pong Game React Component
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { PingPongGameController } from './controller';
import type { PingPongGameData, KeyState, TouchState, Paddle, Size } from './types';
import type { GameState } from '../../types/game';
import {
  updatePlayerPaddle,
  updateAIPaddle,
  updateBall,
  resetBall,
  isGameOver,
  getWinner,
  LEGACY_GAME_CONFIG,
  calculateGameDimensions,
  createInitialGameData
} from './gameLogic';
import './PingPongGame.css';

interface PingPongGameProps {
  playerId: string;
}

export const PingPongGame: React.FC<PingPongGameProps> = ({ playerId }) => {
  const controller = useMemo(() => new PingPongGameController(), []);
  const gameLoopRef = useRef<number | null>(null);
  const lastFrameTime = useRef<number>(0);
  const gameStateRef = useRef<GameState<PingPongGameData> | null>(null);
  const keyStateRef = useRef<KeyState>({
    up: false,
    down: false,
    w: false,
    s: false,
    space: false
  });
  const touchStateRef = useRef<TouchState>({
    isActive: false,
    startY: 0,
    currentY: 0,
    paddleStartY: 0
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameDimensions, setGameDimensions] = useState(() => 
    calculateGameDimensions(LEGACY_GAME_CONFIG.GAME_WIDTH, LEGACY_GAME_CONFIG.GAME_HEIGHT)
  );
  
  // Mobile detection state and rotation logic
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [shouldRotate, setShouldRotate] = useState(false);

  // Update mobile state and rotation decision on resize
  useEffect(() => {
    const updateMobileState = () => {
      const newIsMobile = window.innerWidth <= 768;
      setIsMobile(newIsMobile);
      
      // Auto-rotate for portrait mode on smaller screens for better UX
      const isPortrait = window.innerHeight > window.innerWidth;
      const aspectRatio = window.innerWidth / window.innerHeight;
      setShouldRotate(isPortrait && aspectRatio < 0.75 && window.innerWidth < 768);
    };

    updateMobileState();
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('orientationchange', updateMobileState);
    
    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('orientationchange', updateMobileState);
    };
  }, []);

  // Key state for paddle control
  const [keyState, setKeyState] = useState<KeyState>(keyStateRef.current);
  const [touchState, setTouchState] = useState<TouchState>(touchStateRef.current);

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
    toggleAutoSave
  } = useGameSave<PingPongGameData>({
    gameId: 'ping-pong',
    playerId,
    gameConfig: controller.config,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Handle responsive dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth - 40; // Account for padding
        const maxHeight = window.innerHeight * 0.4; // Max 40% of viewport height
        const newDimensions = calculateGameDimensions(containerWidth, maxHeight);
        setGameDimensions(newDimensions);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update game state when dimensions change (for new games only)
  useEffect(() => {
    if (gameState && gameState.data.gameStatus === 'playing') {
      // Only update dimensions if game area doesn't match new dimensions
      if (gameState.data.gameArea.width !== gameDimensions.width || 
          gameState.data.gameArea.height !== gameDimensions.height) {
        // Only auto-update for new games or when dimensions are significantly different
        const widthDiff = Math.abs(gameState.data.gameArea.width - gameDimensions.width);
        const heightDiff = Math.abs(gameState.data.gameArea.height - gameDimensions.height);
        
        if (widthDiff > 50 || heightDiff > 25) {
          startNewGame(); // This will use the new dimensions
        }
      }
    }
  }, [gameDimensions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    keyStateRef.current = keyState;
  }, [keyState]);

  useEffect(() => {
    touchStateRef.current = touchState;
  }, [touchState]);

  /**
   * Handle touch start for paddle control
   */
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    const currentGameState = gameStateRef.current;
    
    if (!currentGameState) return;
    
    setTouchState({
      isActive: true,
      startY: touch.clientY,
      currentY: touch.clientY,
      paddleStartY: currentGameState.data.playerPaddle.y
    });
  }, []);

  /**
   * Handle touch move for paddle control
   */
  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!touchStateRef.current.isActive) return;
    
    const touch = event.touches[0];
    setTouchState(prev => ({
      ...prev,
      currentY: touch.clientY
    }));
  }, []);

  /**
   * Handle touch end
   */
  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    setTouchState({
      isActive: false,
      startY: 0,
      currentY: 0,
      paddleStartY: 0
    });
  }, []);

  /**
   * Handle touch tap for pause/resume
   */
  const handleTouchTap = useCallback((event: React.TouchEvent) => {
    // Only handle tap if it was a short touch (not a drag)
    const touch = event.changedTouches[0];
    const touchDuration = Date.now() - (event.timeStamp || 0);
    const touchDistance = Math.abs(touch.clientY - touchStateRef.current.startY);
    
    if (touchDuration < 200 && touchDistance < 10) {
      if (gameState.data.gameStatus === 'paused') {
        resumeGame();
      } else if (gameState.data.gameStatus === 'playing') {
        pauseGame();
      }
    }
  }, [gameState.data.gameStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  // Swipe gesture support - Add swipe gestures for game actions  
  useSwipeGestures(containerRef, {
    onSwipeRight: () => {
      // Swipe right to start new game when game is over
      if (gameState.data.gameStatus === 'game-over') {
        startNewGame();
      }
    },
    onSwipeUp: () => {
      // Swipe up to resume game when paused
      if (gameState.data.gameStatus === 'paused') {
        resumeGame();
      }
    },
    onSwipeDown: () => {
      // Swipe down to pause game when playing
      if (gameState.data.gameStatus === 'playing') {
        pauseGame();
      }
    },
    minSwipeDistance: 40,
    maxSwipeTime: 400,
    preventDefault: false // Don't interfere with existing paddle touch controls
  });

  /**
   * Update player paddle position based on touch input
   */
  const updatePlayerPaddleWithTouch = useCallback((paddle: Paddle, gameArea: Size) => {
    const currentTouchState = touchStateRef.current;
    
    if (!currentTouchState.isActive) return paddle;
    
    const touchDelta = currentTouchState.currentY - currentTouchState.startY;
    const newY = Math.max(0, Math.min(
      gameArea.height - paddle.height,
      currentTouchState.paddleStartY + touchDelta
    ));
    
    return {
      ...paddle,
      y: newY
    };
  }, []);

  /**
   * Pause game
   */
  const pauseGame = useCallback(() => {
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        gameStatus: 'paused'
      },
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  /**
   * Resume game
   */
  const resumeGame = useCallback(() => {
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        gameStatus: 'playing'
      },
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  /**
   * Handle keyboard input
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
        setKeyState(prev => ({ ...prev, up: true }));
        event.preventDefault();
        break;
      case 'ArrowDown':
        setKeyState(prev => ({ ...prev, down: true }));
        event.preventDefault();
        break;
      case 'KeyW':
        setKeyState(prev => ({ ...prev, w: true }));
        break;
      case 'KeyS':
        setKeyState(prev => ({ ...prev, s: true }));
        break;
      case 'Space':
        setKeyState(prev => ({ ...prev, space: true }));
        if (gameState.data.gameStatus === 'paused') {
          resumeGame();
        } else if (gameState.data.gameStatus === 'playing') {
          pauseGame();
        }
        event.preventDefault();
        break;
    }
  }, [gameState.data.gameStatus, pauseGame, resumeGame]);

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.code) {
      case 'ArrowUp':
        setKeyState(prev => ({ ...prev, up: false }));
        break;
      case 'ArrowDown':
        setKeyState(prev => ({ ...prev, down: false }));
        break;
      case 'KeyW':
        setKeyState(prev => ({ ...prev, w: false }));
        break;
      case 'KeyS':
        setKeyState(prev => ({ ...prev, s: false }));
        break;
      case 'Space':
        setKeyState(prev => ({ ...prev, space: false }));
        break;
    }
  }, []);

  /**
   * Game loop function
   */
  const gameLoop = useCallback((timestamp: number) => {
    const currentGameState = gameStateRef.current;
    const currentKeyState = keyStateRef.current;
    
    if (!currentGameState || currentGameState.data.gameStatus !== 'playing') {
      return;
    }

    const deltaTime = timestamp - lastFrameTime.current;
    if (deltaTime < 16) { // ~60fps
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    lastFrameTime.current = timestamp;

    const currentData = currentGameState.data;
      
    // Update player paddle (with both keyboard and touch input)
    let newPlayerPaddle = updatePlayerPaddle(currentData.playerPaddle, currentKeyState, currentData.gameArea);
    newPlayerPaddle = updatePlayerPaddleWithTouch(newPlayerPaddle, currentData.gameArea);
    
    // Update AI paddle with dynamic reaction speed
    const aiReactionSpeed = currentData.gameArea.width * 0.004375; // AI_REACTION_SPEED_RATIO
    const newAIPaddle = updateAIPaddle(currentData.aiPaddle, currentData.ball, currentData.gameArea, aiReactionSpeed);
    
    // Update ball and check for scoring
    const { ball: newBall, scored } = updateBall(
      currentData.ball,
      newPlayerPaddle,
      newAIPaddle,
      currentData.gameArea
    );
    
    let newScore = currentData.score;
    let newGameStatus = currentData.gameStatus;
    let ballToUse = newBall;
    let newGameStats = {
      gamesPlayed: currentData.gamesPlayed,
      gamesWon: currentData.gamesWon,
      gamesLost: currentData.gamesLost
    };
    
    // Handle scoring
    if (scored) {
      if (scored === 'player') {
        newScore = { ...newScore, player: newScore.player + 1 };
      } else {
        newScore = { ...newScore, ai: newScore.ai + 1 };
      }
      
      // Reset ball after scoring
      ballToUse = resetBall(
        currentData.gameArea, 
        currentData.ball.width,
        Math.max(1, currentData.gameArea.width * 0.005) // BALL_INITIAL_SPEED_RATIO
      );
      
      // Check for game over
      if (isGameOver(newScore)) {
        newGameStatus = 'game-over';
        const winner = getWinner(newScore);
        newGameStats = {
          gamesPlayed: currentData.gamesPlayed + 1,
          gamesWon: currentData.gamesWon + (winner === 'player' ? 1 : 0),
          gamesLost: currentData.gamesLost + (winner === 'ai' ? 1 : 0)
        };
      }
    }

    const newState: GameState<PingPongGameData> = {
      ...currentGameState,
      data: {
        ...currentData,
        playerPaddle: newPlayerPaddle,
        aiPaddle: newAIPaddle,
        ball: ballToUse,
        score: newScore,
        gameStatus: newGameStatus,
        ...newGameStats,
        lastUpdateTime: new Date().toISOString()
      },
      score: newScore.player, // Use player score as the main score
      isComplete: newGameStatus === 'game-over',
      lastModified: new Date().toISOString()
    };

    setGameState(newState);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [setGameState, updatePlayerPaddleWithTouch]);

  /**
   * Start new game
   */
  const startNewGame = useCallback(() => {
    const currentStats = gameState.data;
    
    // Create new game data with current dimensions
    const newGameData = createInitialGameData({
      width: gameDimensions.width,
      height: gameDimensions.height,
      paddleWidth: gameDimensions.paddleWidth,
      paddleHeight: gameDimensions.paddleHeight,
      paddleSpeed: gameDimensions.paddleSpeed,
      ballSize: gameDimensions.ballSize,
      ballInitialSpeed: gameDimensions.ballInitialSpeed,
      paddleMargin: gameDimensions.paddleMargin
    });
    
    setGameState({
      ...gameState,
      data: {
        ...newGameData,
        gamesPlayed: currentStats.gamesPlayed,
        gamesWon: currentStats.gamesWon,
        gamesLost: currentStats.gamesLost,
        totalPlayTime: currentStats.totalPlayTime
      },
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState, gameDimensions]);

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  /**
   * Manage game loop based on game status
   */
  useEffect(() => {
    if (gameState.data.gameStatus === 'playing') {
      // Cancel any existing animation frame
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      // Start the game loop
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      // Stop the game loop when not playing
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    }

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    };
  }, [gameState.data.gameStatus, gameLoop]);

  /**
   * Handle manual save with user feedback
   */
  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
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
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

  /**
   * Handle save deletion with confirmation
   */
  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game? This cannot be undone.')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
  };

  /**
   * Get status message
   */
  const getStatusMessage = (): string => {
    switch (gameState.data.gameStatus) {
      case 'playing':
        return 'Playing - Use W/S or Arrow Keys';
      case 'paused':
        return 'Paused - Press Space to Resume';
      case 'game-over': {
        const winner = getWinner(gameState.data.score);
        return winner === 'player' ? '🎉 You Won!' : '😞 Game Over - AI Won';
      }
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="ping-pong-game">
        <div className="ping-pong-loading">
          <div className="ping-pong-loading-spinner"></div>
          <h2>Loading Ping Pong...</h2>
          <p>Preparing the ping-pong experience...</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`ping-pong-game ${shouldRotate ? 'ping-pong-game--auto-rotate' : ''}`}
    >
      <h2>{controller.config.name}</h2>
      <p>{controller.config.description}</p>
      
      {/* Game Status and Score */}
      <div className="ping-pong-score">
        <div className="ping-pong-score-player">
          <div className="score-label">Player</div>
          <div>{gameState.data.score.player}</div>
        </div>
        <div className="ping-pong-score-ai">
          <div className="score-label">AI</div>
          <div>{gameState.data.score.ai}</div>
        </div>
      </div>
      
      {/* Game Status */}
      <div className="ping-pong-status">
        {getStatusMessage()}
      </div>
        
      {/* Game Statistics */}
      <div className="ping-pong-game-stats">
        <div className="ping-pong-stat">
          <div className="ping-pong-stat-label">Games</div>
          <div className="ping-pong-stat-value">{gameState.data.gamesPlayed}</div>
        </div>
        <div className="ping-pong-stat">
          <div className="ping-pong-stat-label">Won</div>
          <div className="ping-pong-stat-value">{gameState.data.gamesWon}</div>
        </div>
        <div className="ping-pong-stat">
          <div className="ping-pong-stat-label">Lost</div>
          <div className="ping-pong-stat-value">{gameState.data.gamesLost}</div>
        </div>
      </div>

      {/* Game Canvas */}
      <div className="ping-pong-canvas-container">
        <svg
          width={gameDimensions.width}
          height={gameDimensions.height}
          className="ping-pong-canvas"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => {
            handleTouchEnd(e);
            handleTouchTap(e);
          }}
          onTouchCancel={handleTouchEnd}
        >
          {/* Game field background */}
          <rect
            x={0}
            y={0}
            width={gameDimensions.width}
            height={gameDimensions.height}
            fill="#000"
          />
          
          {/* Center line */}
          <line
            x1={gameDimensions.width / 2}
            y1={0}
            x2={gameDimensions.width / 2}
            y2={gameDimensions.height}
            stroke="#fff"
            strokeWidth="2"
            strokeDasharray="10,10"
          />
          
          {/* Touch area indicator for mobile */}
          {touchState.isActive && (
            <rect
              x={0}
              y={0}
              width={gameDimensions.width / 2}
              height={gameDimensions.height}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="var(--color-accent, #3b82f6)"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
          
          {/* Player paddle */}
          <rect
            x={gameState.data.playerPaddle.x}
            y={gameState.data.playerPaddle.y}
            width={gameState.data.playerPaddle.width}
            height={gameState.data.playerPaddle.height}
            fill="var(--color-accent, #3b82f6)"
            rx={2}
          />
          
          {/* AI paddle */}
          <rect
            x={gameState.data.aiPaddle.x}
            y={gameState.data.aiPaddle.y}
            width={gameState.data.aiPaddle.width}
            height={gameState.data.aiPaddle.height}
            fill="var(--color-error, #dc2626)"
            rx={2}
          />
          
          {/* Ball */}
          <circle
            cx={gameState.data.ball.x + gameState.data.ball.width / 2}
            cy={gameState.data.ball.y + gameState.data.ball.height / 2}
            r={gameState.data.ball.width / 2}
            fill="#fff"
          />
        </svg>
        
        {/* Mobile instructions overlay */}
        {isMobile && (
          <div style={{
            position: 'absolute',
            bottom: '8px',
            left: '8px',
            right: '8px',
            fontSize: '0.8rem',
            color: '#fff',
            textAlign: 'center',
            opacity: 0.7,
            pointerEvents: 'none'
          }}>
            Touch & drag to move paddle • Swipe for quick actions
          </div>
        )}
      </div>

      {/* Rotation hint for portrait mode */}
      {shouldRotate && (
        <div style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '0.5rem 1rem',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          borderRadius: '0.5rem',
          fontSize: '0.8rem',
          textAlign: 'center',
          zIndex: 100
        }}>
          🔄 Game rotated for better portrait experience
        </div>
      )}

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button 
          onClick={startNewGame}
          className="ping-pong-btn ping-pong-btn--primary"
        >
          🎮 New Game
        </button>
        
        {gameState.data.gameStatus === 'playing' && (
          <button 
            onClick={pauseGame}
            className="ping-pong-btn ping-pong-btn--warning"
          >
            ⏸️ Pause
          </button>
        )}
        
        {gameState.data.gameStatus === 'paused' && (
          <button 
            onClick={resumeGame}
            className="ping-pong-btn ping-pong-btn--success"
          >
            ▶️ Resume
          </button>
        )}
      </div>

      {/* Controls Instructions */}
      <div className="ping-pong-controls-info">
        <h3>🎯 Game Controls</h3>
        <div>
          {/* Desktop controls */}
          {!isMobile && (
            <div className="ping-pong-control-item">
              <span className="ping-pong-control-icon">⌨️</span>
              <span><strong>Desktop:</strong> W/S or ↑/↓ Arrow Keys to move paddle • Space to pause/resume</span>
            </div>
          )}
          
          {/* Mobile controls */}
          {isMobile && (
            <>
              <div className="ping-pong-control-item">
                <span className="ping-pong-control-icon">📱</span>
                <span><strong>Mobile:</strong> Touch & drag on your paddle area to move • Tap anywhere to pause/resume</span>
              </div>
              
              {/* Swipe gestures */}
              <div className="ping-pong-control-item">
                <span className="ping-pong-control-icon">👆</span>
                <span><strong>Swipe Gestures:</strong> Swipe ↓ to pause • Swipe ↑ to resume • Swipe → to start new game</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Save/Load Controls */}
      <div className="ping-pong-controls-info">
        <h3>💾 Save Management</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
              style={{ accentColor: 'var(--color-accent, #3b82f6)' }}
            />
            Auto-save enabled (saves every {controller.config.autoSaveIntervalMs / 1000}s)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSave}
            className="ping-pong-btn ping-pong-btn--primary"
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            💾 Save
          </button>
          
          <button 
            onClick={handleManualLoad}
            disabled={!hasSave}
            className={`ping-pong-btn ${hasSave ? 'ping-pong-btn--success' : 'ping-pong-btn--secondary'}`}
            style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}
          >
            📂 Load Game
          </button>
          
          <button 
            onClick={handleDropSave}
            disabled={!hasSave}
            className="ping-pong-btn"
            style={{ 
              fontSize: '0.9rem', 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? 'var(--color-error, #dc2626)' : 'var(--color-surface)',
              color: hasSave ? 'white' : 'var(--color-textMuted)'
            }}
          >
            🗑️ Delete Save
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: 'var(--color-textSecondary)', textAlign: 'center' }}>
          {hasSave ? '✅ Save available' : '❌ No save data'}
        </div>
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '0.5rem',
          backgroundColor: lastSaveEvent.success ? 'var(--color-success, #059669)' : 'var(--color-error, #dc2626)',
          color: 'white',
          borderRadius: 'var(--pp-radius)',
          fontSize: '0.9rem',
          textAlign: 'center',
          marginTop: '1rem'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small>{new Date(lastSaveEvent.timestamp).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
};

export default PingPongGame;