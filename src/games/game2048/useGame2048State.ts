/**
 * Game2048 shared state hook and controller
 */
import { useCallback, useMemo, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
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

// Game configuration
const GAME2048_CONFIG: GameConfig = {
  id: 'game2048',
  name: '2048',
  description: 'Classic number puzzle - combine tiles to reach 2048!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000
};

// Game controller
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