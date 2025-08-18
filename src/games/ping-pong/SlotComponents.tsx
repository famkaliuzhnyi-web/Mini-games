/**
 * Ping Pong Game Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { useTheme } from '../../hooks/useTheme';
import { useCoinService } from '../../hooks/useCoinService';
import { Playfield } from '../../components/common/Playfield';
import type { PlayfieldDimensions } from '../../components/common/Playfield.types';
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

interface SlotComponentProps {
  playerId: string;
}

// Shared state hook for ping-pong game
const usePingPongState = (playerId: string) => {
  const controller = useMemo(() => new PingPongGameController(), []);
  const { currentTheme } = useTheme();
  const { earnCoins, awardGameCompletion } = useCoinService();
  
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
    paddleStartY: 0,
    startX: 0,
    currentX: 0,
    startTime: 0
  });

  const [gameDimensions, setGameDimensions] = useState(() => 
    calculateGameDimensions(LEGACY_GAME_CONFIG.GAME_WIDTH, LEGACY_GAME_CONFIG.GAME_HEIGHT)
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
  const [keyState, setKeyState] = useState<KeyState>(keyStateRef.current);
  const [touchState, setTouchState] = useState<TouchState>(touchStateRef.current);
  const [shouldRotate, setShouldRotate] = useState(false);
  
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

  // Update mobile state on resize
  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', updateMobileState);
    return () => window.removeEventListener('resize', updateMobileState);
  }, []);

  // Check orientation and decide on rotation
  useEffect(() => {
    const checkOrientation = () => {
      const isPortrait = window.innerHeight > window.innerWidth;
      const aspectRatio = window.innerWidth / window.innerHeight;
      // Auto-rotate for portrait mode on smaller screens for better UX
      setShouldRotate(isPortrait && aspectRatio < 0.75 && window.innerWidth < 768);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);
    
    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

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

  // Update player paddle position based on touch input
  const updatePlayerPaddleWithTouch = useCallback((paddle: Paddle, gameArea: Size) => {
    const currentTouchState = touchStateRef.current;
    
    if (!currentTouchState.isActive) return paddle;
    
    const touchDelta = currentTouchState.currentY - currentTouchState.startY;
    
    // Note: When rotated -90deg, we use clientX instead of clientY in touch handlers,
    // so horizontal screen movement (clientX) directly maps to vertical paddle movement (Y)
    // Moving finger right (increasing clientX) -> increasing Y (paddle moves down)
    // Moving finger left (decreasing clientX) -> decreasing Y (paddle moves up)
    // No inversion needed since the mapping is natural
    
    const newY = Math.max(0, Math.min(
      gameArea.height - paddle.height,
      currentTouchState.paddleStartY + touchDelta
    ));
    
    return {
      ...paddle,
      y: newY
    };
  }, []);

  // Game loop function
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
    const aiReactionSpeed = currentData.gameArea.width * 0.004375;
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
        // Award coins for player scoring a point
        earnCoins(3, 'game_play', 'ping-pong', 'Ping Pong: scored a point');
      } else {
        newScore = { ...newScore, ai: newScore.ai + 1 };
      }
      
      // Reset ball after scoring
      ballToUse = resetBall(
        currentData.gameArea, 
        currentData.ball.width,
        Math.max(1, currentData.gameArea.width * 0.005)
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
        
        // Award coins for game completion
        if (winner === 'player') {
          awardGameCompletion('ping-pong', 40, newScore.player); // Base reward + points scored
        }
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
      score: newScore.player,
      isComplete: newGameStatus === 'game-over',
      lastModified: new Date().toISOString()
    };

    setGameState(newState);
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [setGameState, updatePlayerPaddleWithTouch, earnCoins, awardGameCompletion]);

  // Handle keyboard input
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
  }, [gameState.data.gameStatus]); // eslint-disable-line react-hooks/exhaustive-deps -- pauseGame and resumeGame are stable functions

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

  const startNewGame = useCallback((dimensions?: { width: number; height: number; paddleWidth: number; paddleHeight: number; paddleSpeed: number; ballSize: number; ballInitialSpeed: number; paddleMargin: number; }) => {
    const currentStats = gameState.data;
    
    const dimsToUse = dimensions || gameDimensions;
    
    const newGameData = createInitialGameData({
      width: dimsToUse.width,
      height: dimsToUse.height,
      paddleWidth: dimsToUse.paddleWidth,
      paddleHeight: dimsToUse.paddleHeight,
      paddleSpeed: dimsToUse.paddleSpeed,
      ballSize: dimsToUse.ballSize,
      ballInitialSpeed: dimsToUse.ballInitialSpeed,
      paddleMargin: dimsToUse.paddleMargin
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

  // Set up keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // Manage game loop based on game status
  useEffect(() => {
    if (gameState.data.gameStatus === 'playing') {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
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

  // Function to update game dimensions (used by Playfield)
  const updateGameDimensions = useCallback((playfieldDims: PlayfieldDimensions) => {
    const newDimensions = calculateGameDimensions(playfieldDims.width, playfieldDims.height);
    setGameDimensions(newDimensions);
    
    // If this is a new game or the dimensions are significantly different, restart
    if (gameState.data.gameStatus === 'playing') {
      const widthDiff = Math.abs(gameState.data.gameArea.width - newDimensions.width);
      const heightDiff = Math.abs(gameState.data.gameArea.height - newDimensions.height);
      
      if (widthDiff > 50 || heightDiff > 25) {
        startNewGame(newDimensions);
      }
    }
  }, [gameState.data.gameStatus, gameState.data.gameArea.width, gameState.data.gameArea.height, startNewGame]);

  return {
    gameState,
    isLoading,
    isMobile,
    shouldRotate,
    currentTheme,
    touchState,
    gameDimensions,
    updateGameDimensions,
    startNewGame,
    pauseGame,
    resumeGame,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave,
    setTouchState
  };
};

// Game Field Component (the ping-pong game area)
export const PingPongGameField: React.FC<SlotComponentProps> = ({ playerId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [playfieldDimensions, setPlayfieldDimensions] = useState<PlayfieldDimensions | null>(null);
  
  const {
    gameState,
    isLoading,
    isMobile,
    shouldRotate,
    touchState,
    updateGameDimensions,
    startNewGame,
    pauseGame,
    resumeGame,
    setTouchState
  } = usePingPongState(playerId);

  // Update game dimensions when Playfield dimensions change
  useEffect(() => {
    if (playfieldDimensions) {
      updateGameDimensions(playfieldDimensions);
    }
  }, [playfieldDimensions, updateGameDimensions]);

  // Touch handlers
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    
    // In rotated mode, use clientX instead of clientY for paddle movement
    // The rotation is -90deg, so horizontal screen movement controls vertical paddle movement
    const touchCoordinate = shouldRotate ? touch.clientX : touch.clientY;
    
    setTouchState({
      isActive: true,
      startY: touchCoordinate,
      currentY: touchCoordinate,
      paddleStartY: gameState.data.playerPaddle.y,
      startX: shouldRotate ? touch.clientY : touch.clientX,
      currentX: shouldRotate ? touch.clientY : touch.clientX,
      startTime: Date.now()
    });
  }, [gameState.data.playerPaddle.y, setTouchState, shouldRotate]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!touchState.isActive) return;
    
    const touch = event.touches[0];
    // In rotated mode, use clientX instead of clientY for paddle movement
    // The rotation is -90deg, so horizontal screen movement controls vertical paddle movement
    const touchCoordinate = shouldRotate ? touch.clientX : touch.clientY;
    
    setTouchState(prev => ({
      ...prev,
      currentY: touchCoordinate
    }));
  }, [touchState.isActive, setTouchState, shouldRotate]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    setTouchState({
      isActive: false,
      startY: 0,
      currentY: 0,
      paddleStartY: 0,
      startX: 0,
      currentX: 0,
      startTime: 0
    });
  }, [setTouchState]);

  // Swipe gesture support
  useSwipeGestures(containerRef, {
    onSwipeRight: () => {
      if (gameState.data.gameStatus === 'game-over') {
        startNewGame();
      }
    },
    onSwipeUp: () => {
      if (gameState.data.gameStatus === 'paused') {
        resumeGame();
      }
    },
    onSwipeDown: () => {
      if (gameState.data.gameStatus === 'playing') {
        pauseGame();
      }
    },
    minSwipeDistance: 40,
    maxSwipeTime: 400,
    preventDefault: false
  });

  if (isLoading) {
    return (
      <div className="ping-pong-loading">
        <div className="ping-pong-loading-spinner"></div>
        <h2>Loading Game...</h2>
        <p>Preparing the ping-pong experience...</p>
      </div>
    );
  }

  const getStatusMessage = (): string => {
    switch (gameState.data.gameStatus) {
      case 'playing':
        return 'Playing';
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

  return (
    <div 
      ref={containerRef}
      className={`ping-pong-game-field ${shouldRotate ? 'ping-pong-game-field--auto-rotate' : ''}`}
    >
      {/* Game Status */}
      <div className="ping-pong-status">
        {getStatusMessage()}
      </div>

      {/* Score Display */}
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

      {/* Game Canvas - Now wrapped with Playfield for proper responsive scaling */}
      <Playfield
        aspectRatio={2} // 2:1 aspect ratio perfect for Ping Pong as documented
        baseWidth={800}
        baseHeight={400}
        minConstraints={{
          minWidth: 400,
          minHeight: 200,
          minScale: 0.5
        }}
        maxConstraints={{
          maxScale: 2.0
        }}
        padding={20}
        className="ping-pong-playfield"
      >
        {(dimensions: PlayfieldDimensions) => {
          // Update dimensions state when Playfield dimensions change
          if (playfieldDimensions?.width !== dimensions.width || playfieldDimensions?.height !== dimensions.height) {
            setPlayfieldDimensions(dimensions);
          }

          return (
            <div className="ping-pong-canvas-container">
              <svg
                width={dimensions.width}
                height={dimensions.height}
                className="ping-pong-canvas"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                  width: '100%',
                  height: '100%'
                }}
              >
                {/* Game field background */}
                <rect
                  x={0}
                  y={0}
                  width={dimensions.width}
                  height={dimensions.height}
                  fill="#000"
                />
                
                {/* Center line */}
                <line
                  x1={dimensions.width / 2}
                  y1={0}
                  x2={dimensions.width / 2}
                  y2={dimensions.height}
                  stroke="var(--color-textMuted, #9ca3af)"
                  strokeWidth={Math.max(1, dimensions.scale * 2)}
                  strokeDasharray={`${dimensions.scale * 10},${dimensions.scale * 10}`}
                />
                
                {/* Touch area indicator for mobile */}
                {touchState.isActive && (
                  <rect
                    x={0}
                    y={0}
                    width={dimensions.width / 2}
                    height={dimensions.height}
                    fill="rgba(59, 130, 246, 0.1)"
                    stroke="var(--color-accent, #3b82f6)"
                    strokeWidth={Math.max(1, dimensions.scale * 2)}
                    strokeDasharray={`${dimensions.scale * 5},${dimensions.scale * 5}`}
                  />
                )}
                
                {/* Player paddle */}
                <rect
                  x={gameState.data.playerPaddle.x}
                  y={gameState.data.playerPaddle.y}
                  width={gameState.data.playerPaddle.width}
                  height={gameState.data.playerPaddle.height}
                  fill="var(--color-accent, #3b82f6)"
                  rx={Math.max(1, dimensions.scale * 2)}
                />
                
                {/* AI paddle */}
                <rect
                  x={gameState.data.aiPaddle.x}
                  y={gameState.data.aiPaddle.y}
                  width={gameState.data.aiPaddle.width}
                  height={gameState.data.aiPaddle.height}
                  fill="var(--color-error, #dc2626)"
                  rx={Math.max(1, dimensions.scale * 2)}
                />
                
                {/* Ball */}
                <circle
                  cx={gameState.data.ball.x + gameState.data.ball.width / 2}
                  cy={gameState.data.ball.y + gameState.data.ball.height / 2}
                  r={gameState.data.ball.width / 2}
                  fill="var(--color-text, #ffffff)"
                />
              </svg>
              
              {/* Mobile instructions overlay */}
              {isMobile && (
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  right: '8px',
                  fontSize: `${Math.max(0.7, dimensions.scale * 0.8)}rem`,
                  color: 'var(--color-textMuted, #9ca3af)',
                  textAlign: 'center',
                  opacity: 0.7,
                  pointerEvents: 'none'
                }}>
                  Touch & drag to move paddle • Swipe for actions
                </div>
              )}
            </div>
          );
        }}
      </Playfield>

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
    </div>
  );
};

// Stats Component
export const PingPongStats: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    lastSaveEvent
  } = usePingPongState(playerId);

  if (isLoading) {
    return (
      <div className="ping-pong-loading">
        <div className="ping-pong-loading-spinner"></div>
        <div>Loading stats...</div>
      </div>
    );
  }

  const winRate = gameState.data.gamesPlayed > 0 
    ? Math.round((gameState.data.gamesWon / gameState.data.gamesPlayed) * 100) 
    : 0;

  return (
    <div className="ping-pong-game-stats">
      <div className="ping-pong-stat">
        <div className="ping-pong-stat-label">Current</div>
        <div className="ping-pong-stat-value">
          {gameState.data.score.player}-{gameState.data.score.ai}
        </div>
      </div>
      
      <div className="ping-pong-stat">
        <div className="ping-pong-stat-label">Games</div>
        <div className="ping-pong-stat-value">{gameState.data.gamesPlayed}</div>
      </div>
      
      <div className="ping-pong-stat">
        <div className="ping-pong-stat-label">Won</div>
        <div className="ping-pong-stat-value">{gameState.data.gamesWon}</div>
      </div>
      
      <div className="ping-pong-stat">
        <div className="ping-pong-stat-label">Win Rate</div>
        <div className="ping-pong-stat-value">{winRate}%</div>
      </div>
      
      {lastSaveEvent && lastSaveEvent.success && (
        <div className="ping-pong-stat">
          <div className="ping-pong-stat-label">Status</div>
          <div className="ping-pong-stat-value" style={{ 
            color: 'var(--color-success, #059669)',
            fontSize: '1rem' 
          }}>
            ✅ Saved
          </div>
        </div>
      )}
    </div>
  );
};

// Controls Component
export const PingPongControls: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    isMobile,
    startNewGame,
    pauseGame,
    resumeGame,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave
  } = usePingPongState(playerId);

  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game?')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
    setShowSaveMenu(false);
  };

  if (isLoading) {
    return (
      <div className="ping-pong-loading">
        <div className="ping-pong-loading-spinner"></div>
        <div>Loading controls...</div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: '1rem',
      backgroundColor: 'var(--color-surface, var(--pp-surface))',
      borderRadius: '0.5rem',
      border: '1px solid var(--color-border, var(--pp-border))',
      boxShadow: 'var(--pp-shadow, 0 1px 3px rgba(0, 0, 0, 0.1))'
    }}>
      {/* Game Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={() => startNewGame()}
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

        <button 
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          className="ping-pong-btn ping-pong-btn--secondary"
        >
          💾 Save/Load
        </button>
      </div>

      {/* Controls Instructions */}
      <div className="ping-pong-controls-info">
        <h3>🎯 Game Controls</h3>
        {isMobile ? (
          <div>
            <div className="ping-pong-control-item">
              <span className="ping-pong-control-icon">📱</span>
              <span>Touch & drag to move paddle</span>
            </div>
            <div className="ping-pong-control-item">
              <span className="ping-pong-control-icon">👆</span>
              <span>Swipe ↓ pause • ↑ resume • → new game</span>
            </div>
          </div>
        ) : (
          <div>
            <div className="ping-pong-control-item">
              <span className="ping-pong-control-icon">⌨️</span>
              <span>W/S or ↑/↓ arrows to move paddle</span>
            </div>
            <div className="ping-pong-control-item">
              <span className="ping-pong-control-icon">⎵</span>
              <span>Space bar to pause/resume</span>
            </div>
          </div>
        )}
      </div>

      {/* Save Menu */}
      {showSaveMenu && (
        <div style={{
          padding: '0.75rem',
          backgroundColor: 'var(--color-gameBackground, var(--pp-surface-dark))',
          borderRadius: '0.5rem',
          border: '1px solid var(--color-border, var(--pp-border-dark))',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.9rem',
              color: 'var(--color-textSecondary, var(--pp-text-secondary))',
              cursor: 'pointer'
            }}>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
                style={{ 
                  accentColor: 'var(--color-accent, var(--pp-primary))',
                  width: '1rem',
                  height: '1rem'
                }}
              />
              <span>🔄 Auto-save enabled</span>
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleManualSave}
              className="ping-pong-btn ping-pong-btn--primary"
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
            >
              💾 Save
            </button>
            
            <button 
              onClick={handleManualLoad}
              disabled={!hasSave}
              className={`ping-pong-btn ${hasSave ? 'ping-pong-btn--success' : 'ping-pong-btn--secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
            >
              📂 Load
            </button>
            
            <button 
              onClick={handleDropSave}
              disabled={!hasSave}
              className="ping-pong-btn"
              style={{ 
                fontSize: '0.8rem', 
                padding: '0.5rem 0.75rem',
                backgroundColor: hasSave ? 'var(--color-error, #dc2626)' : 'var(--color-surface)',
                color: hasSave ? 'white' : 'var(--color-textMuted)'
              }}
            >
              🗑️ Delete
            </button>
          </div>

          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.8rem', 
            color: 'var(--color-textSecondary, var(--pp-text-secondary))',
            textAlign: 'center'
          }}>
            {hasSave ? '✅ Save data available' : '❌ No saved game'}
          </div>
        </div>
      )}
    </div>
  );
};