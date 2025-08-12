/**
 * Ping Pong Game React Component
 */
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { PingPongGameController, GAME_CONSTANTS } from './controller';
import type { PingPongGameData, Difficulty } from './types';
import {
  updateBall,
  updateAiPaddle,
  updatePlayerPaddle,
  resetBall,
  isGameOver,
  getGameWinner,
  initializeGame
} from './logic';

interface PingPongGameProps {
  playerId: string;
}

export const PingPongGame: React.FC<PingPongGameProps> = ({ playerId }) => {
  const controller = new PingPongGameController();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [lastPauseTime, setPauseTime] = useState<number | null>(null);

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

  /**
   * Draw the game on canvas
   */
  const draw = useCallback((ctx: CanvasRenderingContext2D, data: PingPongGameData) => {
    const { gameField, ball, playerPaddle, aiPaddle } = data;
    
    // Clear canvas
    ctx.clearRect(0, 0, gameField.width, gameField.height);
    
    // Draw field background
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gameField.width, gameField.height);
    
    // Draw center line
    ctx.setLineDash([10, 10]);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(gameField.width / 2, 0);
    ctx.lineTo(gameField.width / 2, gameField.height);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw paddles
    ctx.fillStyle = '#fff';
    ctx.fillRect(playerPaddle.x, playerPaddle.y, playerPaddle.width, playerPaddle.height);
    ctx.fillRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height);
    
    // Draw ball
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw game status overlay
    if (data.gameStatus !== 'playing') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, gameField.width, gameField.height);
      
      ctx.fillStyle = '#fff';
      ctx.font = '48px Arial';
      ctx.textAlign = 'center';
      
      let statusText = '';
      if (data.gameStatus === 'waiting') {
        statusText = 'Press SPACE to Start';
      } else if (data.gameStatus === 'paused') {
        statusText = 'PAUSED - Press SPACE to Resume';
      } else if (data.gameStatus === 'game-over') {
        const winner = getGameWinner(data.score.player, data.score.ai);
        statusText = winner === 'player' ? 'YOU WIN!' : 'AI WINS!';
      }
      
      ctx.fillText(statusText, gameField.width / 2, gameField.height / 2);
      
      if (data.gameStatus === 'game-over') {
        ctx.font = '24px Arial';
        ctx.fillText('Press R to Play Again', gameField.width / 2, gameField.height / 2 + 50);
      }
    }
  }, []);

  /**
   * Game loop
   */
  const gameLoop = useCallback(() => {
    if (!canvasRef.current || gameState.data.gameStatus !== 'playing') {
      return;
    }
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const data = { ...gameState.data };
    
    // Handle player input
    let playerDirection: 'up' | 'down' | 'none' = 'none';
    if (keysRef.current.has('ArrowUp') || keysRef.current.has('KeyW')) {
      playerDirection = 'up';
    } else if (keysRef.current.has('ArrowDown') || keysRef.current.has('KeyS')) {
      playerDirection = 'down';
    }
    
    // Update game objects
    data.playerPaddle = updatePlayerPaddle(data.playerPaddle, playerDirection, data.gameField);
    data.aiPaddle = updateAiPaddle(data.aiPaddle, data.ball, data.difficulty, data.gameField);
    
    const ballUpdate = updateBall(data.ball, data.playerPaddle, data.aiPaddle, data.gameField);
    data.ball = ballUpdate.ball;
    
    // Handle scoring
    let shouldUpdate = false;
    if (ballUpdate.playerScored) {
      data.score.player += 1;
      data.ball = resetBall(data.gameField);
      shouldUpdate = true;
    } else if (ballUpdate.aiScored) {
      data.score.ai += 1;
      data.ball = resetBall(data.gameField);
      shouldUpdate = true;
    }
    
    // Check for game over
    if (isGameOver(data.score.player, data.score.ai)) {
      data.gameStatus = 'game-over';
      const winner = getGameWinner(data.score.player, data.score.ai);
      const gameEndTime = Date.now();
      const gameDuration = gameStartTime ? Math.floor((gameEndTime - gameStartTime) / 1000) : 0;
      
      // Update statistics
      data.gamesPlayed += 1;
      data.lastGameDuration = gameDuration;
      data.totalTimePlayed += gameDuration;
      
      if (winner === 'player') {
        data.gamesWon += 1;
        data.highScore = Math.max(data.highScore, data.score.player);
      } else {
        data.gamesLost += 1;
      }
      
      shouldUpdate = true;
    }
    
    // Update state if needed
    if (shouldUpdate) {
      setGameState({
        ...gameState,
        data,
        score: data.score.player * 10, // Convert to numeric score for save system
        isComplete: data.gameStatus === 'game-over',
        lastModified: new Date().toISOString()
      });
    } else {
      // Update local data only for smooth rendering
      gameState.data = data;
    }
    
    // Draw the game
    draw(ctx, data);
    
    // Continue game loop
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, setGameState, draw, gameStartTime]);

  /**
   * Start the game
   */
  const startGame = useCallback(() => {
    const newData = { ...gameState.data };
    newData.gameStatus = 'playing';
    
    setGameState({
      ...gameState,
      data: newData,
      lastModified: new Date().toISOString()
    });
    
    setGameStartTime(Date.now());
  }, [gameState, setGameState]);

  /**
   * Pause/Resume the game
   */
  const togglePause = useCallback(() => {
    const newData = { ...gameState.data };
    const currentTime = Date.now();
    
    if (newData.gameStatus === 'playing') {
      newData.gameStatus = 'paused';
      setPauseTime(currentTime);
    } else if (newData.gameStatus === 'paused') {
      newData.gameStatus = 'playing';
      
      // Adjust start time to account for pause duration
      if (lastPauseTime && gameStartTime) {
        const pauseDuration = currentTime - lastPauseTime;
        setGameStartTime(gameStartTime + pauseDuration);
      }
      setPauseTime(null);
    }
    
    setGameState({
      ...gameState,
      data: newData,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState, lastPauseTime, gameStartTime]);

  /**
   * Reset the game
   */
  const resetGame = useCallback(() => {
    const { ball, playerPaddle, aiPaddle } = initializeGame(gameState.data.gameField);
    
    const newData = {
      ...gameState.data,
      ball,
      playerPaddle,
      aiPaddle,
      score: { player: 0, ai: 0 },
      gameStatus: 'waiting' as const
    };
    
    setGameState({
      ...gameState,
      data: newData,
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString()
    });
    
    setGameStartTime(null);
    setPauseTime(null);
  }, [gameState, setGameState]);

  /**
   * Change difficulty
   */
  const changeDifficulty = useCallback((difficulty: Difficulty) => {
    const newData = { ...gameState.data };
    newData.difficulty = difficulty;
    
    setGameState({
      ...gameState,
      data: newData,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  /**
   * Handle keyboard input
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState.data.gameStatus === 'waiting' || gameState.data.gameStatus === 'paused') {
          if (gameState.data.gameStatus === 'waiting') {
            startGame();
          } else {
            togglePause();
          }
        }
      } else if (e.code === 'KeyP') {
        e.preventDefault();
        if (gameState.data.gameStatus === 'playing' || gameState.data.gameStatus === 'paused') {
          togglePause();
        }
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        resetGame();
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState.data.gameStatus, startGame, togglePause, resetGame]);

  /**
   * Initialize and cleanup game loop
   */
  useEffect(() => {
    if (gameState.data.gameStatus === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState.data.gameStatus, gameLoop]);

  /**
   * Draw initial state
   */
  useEffect(() => {
    if (canvasRef.current && gameState.data.gameStatus !== 'playing') {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        draw(ctx, gameState.data);
      }
    }
  }, [gameState.data, draw]);

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

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Ping Pong...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem', 
      textAlign: 'center', 
      maxWidth: '900px', 
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>{controller.config.name}</h2>
      <p>{controller.config.description}</p>
      
      {/* Score Display */}
      <div style={{ 
        marginBottom: '1rem', 
        padding: '1rem', 
        backgroundColor: '#fff', 
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <div style={{ 
          fontSize: '2rem', 
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center'
        }}>
          <div style={{ color: '#4CAF50' }}>
            Player: {gameState.data.score.player}
          </div>
          <div style={{ fontSize: '1rem', color: '#666' }}>
            First to {GAME_CONSTANTS.WIN_SCORE}
          </div>
          <div style={{ color: '#f44336' }}>
            AI: {gameState.data.score.ai}
          </div>
        </div>
        
        {/* Game Statistics */}
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Games Played: {gameState.data.gamesPlayed} | 
          Won: {gameState.data.gamesWon} | 
          Lost: {gameState.data.gamesLost} | 
          High Score: {gameState.data.highScore}
        </div>
      </div>

      {/* Game Canvas */}
      <div style={{ marginBottom: '1rem', display: 'inline-block' }}>
        <canvas
          ref={canvasRef}
          width={gameState.data.gameField.width}
          height={gameState.data.gameField.height}
          style={{
            border: '2px solid #333',
            borderRadius: '8px',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ marginRight: '1rem' }}>
            Difficulty:
            <select
              value={gameState.data.difficulty}
              onChange={(e) => changeDifficulty(e.target.value as Difficulty)}
              disabled={gameState.data.gameStatus === 'playing'}
              style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {gameState.data.gameStatus === 'waiting' && (
            <button 
              onClick={startGame}
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
              Start Game (SPACE)
            </button>
          )}
          
          {(gameState.data.gameStatus === 'playing' || gameState.data.gameStatus === 'paused') && (
            <button 
              onClick={togglePause}
              style={{ 
                fontSize: '1.1rem', 
                padding: '0.75rem 1.5rem',
                backgroundColor: gameState.data.gameStatus === 'playing' ? '#FF9800' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              {gameState.data.gameStatus === 'playing' ? 'Pause (P)' : 'Resume (SPACE)'}
            </button>
          )}
          
          <button 
            onClick={resetGame}
            style={{ 
              fontSize: '1.1rem', 
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            New Game (R)
          </button>
        </div>
      </div>

      {/* Controls Instructions */}
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #eee',
        fontSize: '0.9rem'
      }}>
        <h3 style={{ margin: '0 0 0.5rem 0' }}>Controls</h3>
        <div>
          <strong>Arrow Keys</strong> or <strong>W/S</strong> - Move paddle up/down<br/>
          <strong>SPACE</strong> - Start game or resume from pause<br/>
          <strong>P</strong> - Pause/Resume game<br/>
          <strong>R</strong> - Reset game
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
          {gameState.data.totalTimePlayed > 0 && (
            <span> | Total play time: {Math.floor(gameState.data.totalTimePlayed / 60)}m {gameState.data.totalTimePlayed % 60}s</span>
          )}
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