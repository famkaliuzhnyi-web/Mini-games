/**
 * Ping Pong Game Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { useTheme } from '../../hooks/useTheme';
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

  const [gameDimensions] = useState(() => 
    calculateGameDimensions(LEGACY_GAME_CONFIG.GAME_WIDTH, LEGACY_GAME_CONFIG.GAME_HEIGHT)
  );
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768);
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

  // Update mobile state on resize
  useEffect(() => {
    const updateMobileState = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', updateMobileState);
    return () => window.removeEventListener('resize', updateMobileState);
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
  }, [setGameState, updatePlayerPaddleWithTouch]);

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
  }, [gameState.data.gameStatus]);

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

  const startNewGame = useCallback(() => {
    const currentStats = gameState.data;
    
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

  return {
    gameState,
    isLoading,
    isMobile,
    currentTheme,
    touchState,
    gameDimensions,
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
  const {
    gameState,
    isLoading,
    isMobile,
    touchState,
    gameDimensions,
    startNewGame,
    pauseGame,
    resumeGame,
    setTouchState
  } = usePingPongState(playerId);

  // Touch handlers
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    const touch = event.touches[0];
    
    setTouchState({
      isActive: true,
      startY: touch.clientY,
      currentY: touch.clientY,
      paddleStartY: gameState.data.playerPaddle.y
    });
  }, [gameState.data.playerPaddle.y, setTouchState]);

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    if (!touchState.isActive) return;
    
    const touch = event.touches[0];
    setTouchState(prev => ({
      ...prev,
      currentY: touch.clientY
    }));
  }, [touchState.isActive, setTouchState]);

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
    event.preventDefault();
    setTouchState({
      isActive: false,
      startY: 0,
      currentY: 0,
      paddleStartY: 0
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
    return <div style={{ color: `var(--color-text)` }}>Loading game...</div>;
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
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '1rem',
        backgroundColor: `var(--color-gameBackground)`,
        color: `var(--color-text)`
      }}
    >
      {/* Game Status */}
      <div style={{
        fontSize: '1.2rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textAlign: 'center',
        color: gameState.data.gameStatus === 'playing' ? `var(--color-text)` : 
               gameState.data.gameStatus === 'paused' ? `var(--color-warning)` : `var(--color-success)`
      }}>
        {getStatusMessage()}
      </div>

      {/* Score Display */}
      <div style={{
        fontSize: '1.8rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        fontFamily: `var(--font-mono)`,
        textAlign: 'center'
      }}>
        Player {gameState.data.score.player} - {gameState.data.score.ai} AI
      </div>

      {/* Game Canvas */}
      <div style={{
        display: 'inline-block',
        border: `2px solid var(--color-border)`,
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
            touchAction: 'none'
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
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
            stroke="var(--color-textMuted)"
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
              fill="rgba(100, 108, 255, 0.1)"
              stroke="var(--color-accent)"
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
            fill="var(--color-accent)"
            rx={2}
          />
          
          {/* AI paddle */}
          <rect
            x={gameState.data.aiPaddle.x}
            y={gameState.data.aiPaddle.y}
            width={gameState.data.aiPaddle.width}
            height={gameState.data.aiPaddle.height}
            fill="var(--color-error)"
            rx={2}
          />
          
          {/* Ball */}
          <circle
            cx={gameState.data.ball.x + gameState.data.ball.width / 2}
            cy={gameState.data.ball.y + gameState.data.ball.height / 2}
            r={gameState.data.ball.width / 2}
            fill="var(--color-text)"
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
            color: `var(--color-textMuted)`,
            textAlign: 'center',
            opacity: 0.7,
            pointerEvents: 'none'
          }}>
            Touch & drag to move paddle • Swipe for actions
          </div>
        )}
      </div>
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
    return <div style={{ color: `var(--color-text)` }}>Loading stats...</div>;
  }

  return (
    <div style={{
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px',
      color: `var(--color-text)`,
      fontSize: '0.9rem'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Stats</div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)`, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        <div>Score: {gameState.data.score.player}-{gameState.data.score.ai}</div>
        <div>Games: {gameState.data.gamesPlayed}</div>
        <div>Won: {gameState.data.gamesWon} | Lost: {gameState.data.gamesLost}</div>
        <div>Win Rate: {gameState.data.gamesPlayed > 0 ? Math.round((gameState.data.gamesWon / gameState.data.gamesPlayed) * 100) : 0}%</div>
      </div>
      {lastSaveEvent && lastSaveEvent.success && (
        <div style={{ 
          marginTop: '0.25rem',
          fontSize: '0.7rem',
          color: `var(--color-success)`,
          textAlign: 'center'
        }}>
          ✅ Saved
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
    return <div style={{ color: `var(--color-text)` }}>Loading controls...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px'
    }}>
      {/* Game Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={startNewGame}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: `var(--color-accent)`,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            minHeight: '40px',
            touchAction: 'manipulation'
          }}
        >
          New Game
        </button>

        {gameState.data.gameStatus === 'playing' && (
          <button 
            onClick={pauseGame}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: `var(--color-warning)`,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minHeight: '40px',
              touchAction: 'manipulation'
            }}
          >
            Pause
          </button>
        )}
        
        {gameState.data.gameStatus === 'paused' && (
          <button 
            onClick={resumeGame}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: `var(--color-success)`,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minHeight: '40px',
              touchAction: 'manipulation'
            }}
          >
            Resume
          </button>
        )}

        <button 
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: `var(--color-secondary)`,
            color: `var(--color-text)`,
            border: `1px solid var(--color-border)`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            minHeight: '40px',
            touchAction: 'manipulation'
          }}
        >
          Save/Load
        </button>
      </div>

      {/* Controls Instructions */}
      <div style={{
        fontSize: '0.8rem',
        color: `var(--color-textSecondary)`,
        textAlign: 'center'
      }}>
        {isMobile ? (
          <div>
            <div>📱 Touch & drag to move paddle</div>
            <div>Swipe ↓ pause • ↑ resume • → new game</div>
          </div>
        ) : (
          <div>🎮 W/S or ↑/↓ to move • Space to pause/resume</div>
        )}
      </div>

      {/* Save Menu */}
      {showSaveMenu && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: `var(--color-gameBackground)`,
          borderRadius: '6px',
          border: `1px solid var(--color-border)`
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: `var(--color-textSecondary)`
            }}>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
                style={{ accentColor: `var(--color-accent)` }}
              />
              Auto-save
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleManualSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: `var(--color-accent)`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Save
            </button>
            
            <button 
              onClick={handleManualLoad}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-success)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Load
            </button>
            
            <button 
              onClick={handleDropSave}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-error)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};