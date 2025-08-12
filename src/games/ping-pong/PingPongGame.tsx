/**
 * Ping Pong Game React Component
 */
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { PingPongGameController } from './controller';
import type { PingPongGameData, KeyState } from './types';
import type { GameState } from '../../types/game';
import {
  updatePlayerPaddle,
  updateAIPaddle,
  updateBall,
  resetBall,
  isGameOver,
  getWinner,
  GAME_CONFIG
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
  
  // Key state for paddle control
  const [keyState, setKeyState] = useState<KeyState>(keyStateRef.current);

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

  // Update refs when state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    keyStateRef.current = keyState;
  }, [keyState]);

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
      
    // Update player paddle
    const newPlayerPaddle = updatePlayerPaddle(currentData.playerPaddle, currentKeyState, currentData.gameArea);
    
    // Update AI paddle
    const newAIPaddle = updateAIPaddle(currentData.aiPaddle, currentData.ball, currentData.gameArea);
    
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
      ballToUse = resetBall(currentData.gameArea);
      
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
  }, [setGameState]);

  /**
   * Start new game
   */
  const startNewGame = useCallback(() => {
    const currentStats = gameState.data;
    
    setGameState({
      ...gameState,
      data: {
        ...controller.getInitialState().data,
        gamesPlayed: currentStats.gamesPlayed,
        gamesWon: currentStats.gamesWon,
        gamesLost: currentStats.gamesLost,
        totalPlayTime: currentStats.totalPlayTime
      },
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString()
    });
  }, [controller, gameState, setGameState]);

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
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center', 
      maxWidth: '1000px', 
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
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
        backgroundColor: '#000'
      }}>
        <svg
          width={GAME_CONFIG.GAME_WIDTH}
          height={GAME_CONFIG.GAME_HEIGHT}
          style={{ display: 'block' }}
        >
          {/* Game field background */}
          <rect
            x={0}
            y={0}
            width={GAME_CONFIG.GAME_WIDTH}
            height={GAME_CONFIG.GAME_HEIGHT}
            fill="#000"
          />
          
          {/* Center line */}
          <line
            x1={GAME_CONFIG.GAME_WIDTH / 2}
            y1={0}
            x2={GAME_CONFIG.GAME_WIDTH / 2}
            y2={GAME_CONFIG.GAME_HEIGHT}
            stroke="#fff"
            strokeWidth="2"
            strokeDasharray="10,10"
          />
          
          {/* Player paddle */}
          <rect
            x={gameState.data.playerPaddle.x}
            y={gameState.data.playerPaddle.y}
            width={gameState.data.playerPaddle.width}
            height={gameState.data.playerPaddle.height}
            fill="#4CAF50"
            rx={4}
          />
          
          {/* AI paddle */}
          <rect
            x={gameState.data.aiPaddle.x}
            y={gameState.data.aiPaddle.y}
            width={gameState.data.aiPaddle.width}
            height={gameState.data.aiPaddle.height}
            fill="#f44336"
            rx={4}
          />
          
          {/* Ball */}
          <circle
            cx={gameState.data.ball.x + gameState.data.ball.width / 2}
            cy={gameState.data.ball.y + gameState.data.ball.height / 2}
            r={gameState.data.ball.width / 2}
            fill="#fff"
          />
        </svg>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={startNewGame}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            marginRight: '1rem'
          }}
        >
          New Game
        </button>
        
        {gameState.data.gameStatus === 'playing' && (
          <button 
            onClick={pauseGame}
            style={{ 
              fontSize: '1.1rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Pause
          </button>
        )}
        
        {gameState.data.gameStatus === 'paused' && (
          <button 
            onClick={resumeGame}
            style={{ 
              fontSize: '1.1rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
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
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Controls</h3>
        <p style={{ margin: '0', fontSize: '0.9rem' }}>
          <strong>W/S</strong> or <strong>↑/↓ Arrow Keys</strong> to move paddle | 
          <strong>Space</strong> to pause/resume
        </p>
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
              borderRadius: '4px',
              cursor: 'pointer'
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
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
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
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
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