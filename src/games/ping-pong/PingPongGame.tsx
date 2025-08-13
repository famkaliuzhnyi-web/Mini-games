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
  
  // Mobile detection state
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);

  // Update mobile state on resize
  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', updateMobileState);
    return () => window.removeEventListener('resize', updateMobileState);
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
      <div style={{ 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '300px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <h2>Loading Ping Pong...</h2>
        <div style={{ 
          marginTop: '1rem', 
          fontSize: '0.9rem', 
          color: '#666' 
        }}>
          Checking for saved games...
        </div>
        <div style={{ 
          marginTop: '2rem', 
          fontSize: '0.8rem', 
          color: '#999' 
        }}>
          If this takes too long, try refreshing the page
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      style={{ 
        padding: '1rem', 
        textAlign: 'center', 
        maxWidth: '1000px', 
        margin: '0 auto',
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: '#f9f9f9'
      }}
    >
      <h2>{controller.config.name}</h2>
      <p>{controller.config.description}</p>
      
      {/* Game Status and Score */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        backgroundColor: '#fff', 
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: gameState.data.gameStatus === 'playing' ? '#333' : 
                 gameState.data.gameStatus === 'paused' ? '#ff9800' : '#4CAF50',
          marginBottom: '0.5rem'
        }}>
          {getStatusMessage()}
        </div>
        
        {/* Score Display */}
        <div style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold', 
          marginBottom: '0.5rem',
          fontFamily: 'monospace'
        }}>
          Player {gameState.data.score.player} - {gameState.data.score.ai} AI
        </div>
        
        {/* Game Statistics */}
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Games: {gameState.data.gamesPlayed} | 
          Won: {gameState.data.gamesWon} | 
          Lost: {gameState.data.gamesLost}
        </div>
      </div>

      {/* Game Canvas */}
      <div style={{ 
        marginBottom: '1.5rem',
        display: 'inline-block',
        border: '2px solid #333',
        borderRadius: '8px',
        backgroundColor: '#000',
        position: 'relative',
        maxWidth: '100%'
      }}>
        <svg
          width={gameDimensions.width}
          height={gameDimensions.height}
          style={{ 
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
            touchAction: 'none' // Prevent default touch behaviors
          }}
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
              fill="rgba(76, 175, 80, 0.1)"
              stroke="rgba(76, 175, 80, 0.3)"
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
            fill="#4CAF50"
            rx={2}
          />
          
          {/* AI paddle */}
          <rect
            x={gameState.data.aiPaddle.x}
            y={gameState.data.aiPaddle.y}
            width={gameState.data.aiPaddle.width}
            height={gameState.data.aiPaddle.height}
            fill="#f44336"
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
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          right: '8px',
          fontSize: '0.8rem',
          color: '#fff',
          textAlign: 'center',
          opacity: 0.7,
          pointerEvents: 'none',
          display: isMobile ? 'block' : 'none'
        }}>
          Touch & drag to move paddle • Swipe for quick actions
        </div>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={startNewGame}
          style={{ 
            fontSize: '1rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            marginRight: '0.5rem',
            marginBottom: '0.5rem',
            minHeight: '44px', // Touch-friendly
            minWidth: '120px'
          }}
        >
          New Game
        </button>
        
        {gameState.data.gameStatus === 'playing' && (
          <button 
            onClick={pauseGame}
            style={{ 
              fontSize: '1rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              minHeight: '44px', // Touch-friendly
              minWidth: '120px'
            }}
          >
            Pause
          </button>
        )}
        
        {gameState.data.gameStatus === 'paused' && (
          <button 
            onClick={resumeGame}
            style={{ 
              fontSize: '1rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              marginBottom: '0.5rem',
              minHeight: '44px', // Touch-friendly
              minWidth: '120px'
            }}
          >
            Resume
          </button>
        )}
      </div>

      {/* Controls Instructions */}
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #eee'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Controls</h3>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '0.5rem',
          fontSize: '0.9rem'
        }}>
          {/* Desktop controls */}
          <div style={{ 
            display: !isMobile ? 'block' : 'none'
          }}>
            <strong>Desktop:</strong> W/S or ↑/↓ Arrow Keys to move paddle • Space to pause/resume
          </div>
          
          {/* Mobile controls */}
          <div style={{ 
            display: isMobile ? 'block' : 'none'
          }}>
            <strong>Mobile:</strong> Touch & drag on your paddle area to move • Tap anywhere to pause/resume
          </div>
          
          {/* Swipe gestures */}
          <div style={{ 
            display: isMobile ? 'block' : 'none',
            color: '#4CAF50',
            fontSize: '0.85rem',
            fontWeight: 'bold'
          }}>
            📱 <strong>Swipe Gestures:</strong> Swipe ↓ to pause • Swipe ↑ to resume • Swipe → to start new game
          </div>
          
          {/* Always visible controls */}
          <div style={{ 
            display: isMobile ? 'block' : 'none',
            color: '#666',
            fontSize: '0.8rem'
          }}>
            Desktop keyboard controls also work if you have a keyboard
          </div>
        </div>
      </div>

      {/* Save/Load Controls */}
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Save Management</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
            />
            Auto-save enabled (saves every {controller.config.autoSaveIntervalMs / 1000}s)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              minHeight: '44px', // Touch-friendly
              fontSize: '0.9rem'
            }}
          >
            Manual Save
          </button>
          
          <button 
            onClick={handleManualLoad}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: hasSave ? 'pointer' : 'not-allowed',
              minHeight: '44px', // Touch-friendly
              fontSize: '0.9rem'
            }}
          >
            Load Game
          </button>
          
          <button 
            onClick={handleDropSave}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#f44336' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: hasSave ? 'pointer' : 'not-allowed',
              minHeight: '44px', // Touch-friendly
              fontSize: '0.9rem'
            }}
          >
            Delete Save
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          {hasSave ? '💾 Save available' : '❌ No save data'}
        </div>
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '0.5rem',
          backgroundColor: lastSaveEvent.success ? '#e8f5e8' : '#fde8e8',
          border: `1px solid ${lastSaveEvent.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '0.9rem'
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