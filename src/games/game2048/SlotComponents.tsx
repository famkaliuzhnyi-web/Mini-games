/**
 * Game2048 Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { Game2048Data, Direction } from './types';
import {
  createInitialGrid,
  moveGrid,
  addRandomTile,
  copyGrid,
  canMove,
  getHighestTile
} from './logic';

// Game configuration (shared)
const GAME2048_CONFIG: GameConfig = {
  id: 'game2048',
  name: '2048',
  description: 'Classic number puzzle - combine tiles to reach 2048!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000
};

// Game controller (shared)
class Game2048Controller implements GameController<Game2048Data> {
  config = GAME2048_CONFIG;

  getInitialState(): GameState<Game2048Data> {
    const now = new Date().toISOString();
    return {
      gameId: 'game2048',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        grid: createInitialGrid(),
        score: 0,
        bestScore: 0,
        gameOver: false,
        gameWon: false,
        canUndo: false,
        moves: 0
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<Game2048Data>): boolean {
    return !!(
      state &&
      state.data &&
      Array.isArray(state.data.grid) &&
      state.data.grid.length === 4 &&
      state.data.grid.every(row => Array.isArray(row) && row.length === 4) &&
      typeof state.data.score === 'number' &&
      typeof state.data.bestScore === 'number' &&
      typeof state.data.gameOver === 'boolean' &&
      typeof state.data.gameWon === 'boolean' &&
      typeof state.data.moves === 'number'
    );
  }

  onSaveLoad(state: GameState<Game2048Data>): void {
    console.log('2048 game loaded:', {
      score: state.data.score,
      bestScore: state.data.bestScore,
      moves: state.data.moves,
      highestTile: getHighestTile(state.data.grid)
    });
  }

  onSaveDropped(): void {
    console.log('2048 game save dropped');
  }
}

// Shared hook for game state and logic
export const useGame2048State = (playerId: string) => {
  const controller = useMemo(() => new Game2048Controller(), []);
  
  // Animation state for tiles
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  const [scoreAnimated, setScoreAnimated] = useState(false);
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    triggerAutoSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled
  } = useGameSave<Game2048Data>({
    gameId: 'game2048',
    playerId,
    gameConfig: GAME2048_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Handle move logic
  const handleMove = useCallback(async (direction: Direction) => {
    if (gameState.data.gameOver) return;

    const previousGrid = copyGrid(gameState.data.grid);
    const previousScore = gameState.data.score;
    const moveResult = moveGrid(gameState.data.grid, direction);
    
    if (!moveResult.moved) return;

    // Animation logic
    setAnimatingTiles(new Set());
    setMergedTiles(new Set());
    setNewTiles(new Set());

    const mergedPositions = new Set<string>();
    if (moveResult.scoreIncrease > 0) {
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const currentTile = moveResult.newGrid[row][col];
          const previousTile = previousGrid[row][col];
          if (currentTile > 0 && currentTile > previousTile) {
            mergedPositions.add(`${row}-${col}`);
          }
        }
      }
      setMergedTiles(mergedPositions);
    }

    const newGrid = copyGrid(moveResult.newGrid);
    const newTileAdded = addRandomTile(newGrid);

    if (newTileAdded) {
      const newTilePositions = new Set<string>();
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (newGrid[row][col] !== 0 && moveResult.newGrid[row][col] === 0) {
            newTilePositions.add(`${row}-${col}`);
          }
        }
      }
      setNewTiles(newTilePositions);
    }

    const newScore = gameState.data.score + moveResult.scoreIncrease;
    const newBestScore = Math.max(gameState.data.bestScore, newScore);
    const newMoves = gameState.data.moves + 1;

    if (moveResult.scoreIncrease > 0) {
      setScoreAnimated(true);
      setTimeout(() => setScoreAnimated(false), 400);
    }

    const finalGameOver = moveResult.gameOver || !canMove(newGrid);

    const newGameState: GameState<Game2048Data> = {
      ...gameState,
      data: {
        ...gameState.data,
        grid: newGrid,
        score: newScore,
        bestScore: newBestScore,
        gameOver: finalGameOver,
        gameWon: gameState.data.gameWon || moveResult.gameWon,
        canUndo: true,
        previousGrid,
        previousScore,
        moves: newMoves
      },
      score: newScore,
      isComplete: moveResult.gameWon,
      lastModified: new Date().toISOString()
    };

    setGameState(newGameState);

    setTimeout(() => setMergedTiles(new Set()), 200);
    setTimeout(() => setNewTiles(new Set()), 300);

    if (newMoves % 5 === 0 || newScore > gameState.data.bestScore) {
      await triggerAutoSave();
    }
  }, [gameState, setGameState, triggerAutoSave]);

  // Additional handler functions
  const handleUndo = useCallback(async () => {
    if (!gameState.data.canUndo || !gameState.data.previousGrid) return;

    const newGameState: GameState<Game2048Data> = {
      ...gameState,
      data: {
        ...gameState.data,
        grid: gameState.data.previousGrid,
        score: gameState.data.previousScore || 0,
        gameOver: false,
        canUndo: false,
        previousGrid: undefined,
        previousScore: undefined
      },
      score: gameState.data.previousScore || 0,
      lastModified: new Date().toISOString()
    };

    setGameState(newGameState);
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  const handleNewGame = useCallback(async () => {
    const newState = controller.getInitialState();
    const newGameState: GameState<Game2048Data> = {
      ...newState,
      playerId,
      data: {
        ...newState.data,
        bestScore: gameState.data.bestScore
      }
    };

    setGameState(newGameState);
    await triggerAutoSave();
  }, [controller, playerId, gameState.data.bestScore, setGameState, triggerAutoSave]);

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

  // Get CSS class for tile
  const getTileClass = useCallback((value: number, row: number, col: number) => {
    const tileKey = `${row}-${col}`;
    let className = 'game2048-cell';
    
    if (value === 0) return className;
    
    className += ` game2048-tile-${value}`;
    
    if (newTiles.has(tileKey)) {
      className += ' game2048-cell-new';
    }
    
    if (mergedTiles.has(tileKey)) {
      className += ' game2048-cell-merged';
    }
    
    if (animatingTiles.has(tileKey)) {
      className += ' game2048-cell-moving';
    }
    
    return className;
  }, [newTiles, mergedTiles, animatingTiles]);

  return {
    gameState,
    isLoading,
    scoreAnimated,
    autoSaveEnabled,
    hasSave,
    lastSaveEvent,
    handleMove,
    handleUndo,
    handleNewGame,
    handleManualSave,
    handleManualLoad,
    getTileClass
  };
};

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

      <div className="game2048-grid-container">
        <div className="game2048-grid">
          {gameState.data.grid.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className={getTileClass(tile, rowIndex, colIndex)}
              >
                {tile > 0 ? tile : ''}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Stats Component 
export const Game2048Stats: React.FC<{ playerId: string }> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    scoreAnimated,
    autoSaveEnabled,
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
        <small>Moves: {gameState.data.moves} | Auto-save: {autoSaveEnabled ? 'On' : 'Off'}</small>
      </div>
      {lastSaveEvent && (
        <div className="game2048-save-status" style={{ 
          marginTop: '0.5rem',
          padding: '0.25rem',
          backgroundColor: lastSaveEvent.success ? '#e8f5e8' : '#fde8e8',
          border: `1px solid ${lastSaveEvent.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '0.7rem',
          textAlign: 'center'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
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
    hasSave,
    handleNewGame,
    handleUndo,
    handleManualSave,
    handleManualLoad
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
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleManualSave}
        >
          Save
        </button>
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleManualLoad}
          disabled={!hasSave}
        >
          Load
        </button>
      </div>
      <div className="game2048-instructions">
        <p>
          <strong>Controls:</strong> Arrow keys, WASD, or swipe to move tiles.
        </p>
        <p>
          📱 <strong>Mobile:</strong> Swipe in any direction on the game board.
        </p>
      </div>
    </div>
  );
};