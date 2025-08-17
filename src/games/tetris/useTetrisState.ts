/**
 * Tetris shared state hook and controller
 */
import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useCoinService } from '../../hooks/useCoinService';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { TetrisGameData, TetrisAction, PieceType } from './types';
import {
  createEmptyGrid,
  createActivePiece,
  createInitialStats,
  getRandomPieceType,
  generateNextPieces,
  createGhostPiece,
  isDangerZoneActive,
  isValidPosition,
  movePiece,
  rotatePiece,
  placePiece,
  clearCompletedLines,
  isGameOver,
  updateStats,
  calculateDropSpeed,
  INITIAL_DROP_SPEED
} from './logic';

// Tetris game configuration
const TETRIS_CONFIG: GameConfig = {
  id: 'tetris',
  name: 'Tetris',
  description: 'Classic falling blocks puzzle game',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 30000
};

// Tetris game controller
class TetrisGameController implements GameController<TetrisGameData> {
  config = TETRIS_CONFIG;

  getInitialState(): GameState<TetrisGameData> {
    const now = new Date().toISOString();
    const gameStartTime = Date.now();
    const nextPieces = generateNextPieces();
    const firstPieceType = nextPieces[0];
    
    return {
      gameId: 'tetris',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        grid: createEmptyGrid(),
        activePiece: createActivePiece(firstPieceType),
        ghostPiece: null,
        holdPiece: null,
        nextPieces: nextPieces.slice(1),
        stats: createInitialStats(),
        gameOver: false,
        paused: false,
        lastMoveTime: Date.now(),
        dropSpeed: INITIAL_DROP_SPEED,
        canHold: true,
        gameStartTime,
        dangerZoneActive: false
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<TetrisGameData>): boolean {
    const isValid = !!(
      state &&
      state.data &&
      Array.isArray(state.data.grid) &&
      typeof state.data.gameOver === 'boolean' &&
      state.data.stats &&
      typeof state.data.stats.score === 'number' &&
      Array.isArray(state.data.nextPieces) &&
      state.data.nextPieces.length > 0 &&
      typeof state.data.canHold === 'boolean' &&
      typeof state.data.gameStartTime === 'number' &&
      typeof state.data.dangerZoneActive === 'boolean'
    );
    
    // If validation fails, it might be an old save format - return false to trigger reset
    if (!isValid) {
      console.warn('Tetris save validation failed - likely old save format or corrupted nextPieces, will reset');
    }
    
    return isValid;
  }

  onSaveLoad(state: GameState<TetrisGameData>): void {
    console.log('Tetris game loaded:', {
      score: state.data.stats.score,
      level: state.data.stats.level,
      lines: state.data.stats.lines
    });
  }

  onSaveDropped(): void {
    console.log('Tetris game save dropped');
  }
}

// Next piece emojis mapping
export const nextPieceEmojis: Record<PieceType, string> = {
  I: '🟦', // Cyan bar
  O: '🟨', // Yellow square
  T: '🟪', // Purple T
  S: '🟩', // Green S
  Z: '🟥', // Red Z  
  J: '🔵', // Blue J
  L: '🟠'  // Orange L
};

// Shared hook for Tetris game state and logic
export const useTetrisState = (playerId: string) => {
  const controller = useMemo(() => new TetrisGameController(), []);
  const gameLoopRef = useRef<number | null>(null);
  const { earnCoins, awardGameCompletion } = useCoinService();

  // Helper function to calculate coin rewards for line clears
  const getLineClearCoins = useCallback((linesCleared: number): number => {
    if (linesCleared === 0) return 0;
    
    // Coin rewards: 1 line = 5 coins, 2 lines = 15 coins, 3 lines = 30 coins, 4 lines = 50 coins
    const coinRewards = [0, 5, 15, 30, 50];
    return coinRewards[linesCleared] || 50;
  }, []);
  
  const {
    gameState,
    setGameState,
    hasSave,
    isLoading,
    autoSaveEnabled,
    toggleAutoSave
  } = useGameSave<TetrisGameData>({
    gameId: 'tetris',
    playerId,
    gameConfig: TETRIS_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Game action dispatcher
  const dispatch = useCallback((action: TetrisAction) => {
    const prevState = gameState;
    if (prevState.data.gameOver && action.type !== 'RESET') {
      return;
    }
    
    if (prevState.data.paused && !['PAUSE', 'UNPAUSE', 'RESET'].includes(action.type)) {
      return;
    }

    const newState = { ...prevState };
    const data = { ...newState.data };

    switch (action.type) {
      case 'MOVE': {
        if (!data.activePiece) break;
        
        const movedPiece = movePiece(data.activePiece, action.direction);
        if (isValidPosition(data.grid, movedPiece)) {
          data.activePiece = movedPiece;
          if (action.direction === 'down') {
            data.lastMoveTime = Date.now();
          }
        } else if (action.direction === 'down') {
          // Place piece logic
          data.grid = placePiece(data.grid, data.activePiece);
          const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
          data.grid = clearedGrid;
          data.stats = updateStats(data.stats, linesCleared, data.gameStartTime);
          
          // Award coins for line clears
          if (linesCleared > 0) {
            const coins = getLineClearCoins(linesCleared);
            earnCoins(
              coins,
              'game_play',
              'tetris',
              `Tetris: cleared ${linesCleared} line${linesCleared > 1 ? 's' : ''}`
            );
          }
          
          // Ensure nextPieces array is valid before using it
          if (!data.nextPieces || !Array.isArray(data.nextPieces) || data.nextPieces.length === 0) {
            data.nextPieces = generateNextPieces();
          }
          
          data.activePiece = createActivePiece(data.nextPieces[0]);
          data.nextPieces = (Array.isArray(data.nextPieces) && data.nextPieces.length > 1)
            ? [...data.nextPieces.slice(1), getRandomPieceType()]
            : generateNextPieces();
          
          if (isGameOver(data.grid, data.activePiece)) {
            data.gameOver = true;
            newState.isComplete = true;
            
            // Award coins for game completion based on final score
            awardGameCompletion('tetris', 25, data.stats.score);
          }
          
          data.dropSpeed = calculateDropSpeed(data.stats.level);
          data.stats.pieces++;
          data.canHold = true;
          data.dangerZoneActive = isDangerZoneActive(data.grid);
        }
        
        // Update ghost piece
        if (data.activePiece) {
          data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
        }
        break;
      }

      case 'ROTATE': {
        if (!data.activePiece) break;
        
        const rotatedPiece = rotatePiece(data.activePiece, action.direction);
        if (isValidPosition(data.grid, rotatedPiece)) {
          data.activePiece = rotatedPiece;
          
          // Update ghost piece
          data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
        }
        break;
      }

      case 'DROP': {
        if (!data.activePiece) break;
        
        let dropPiece = data.activePiece;
        let dropDistance = 0;
        
        while (true) {
          const nextPiece = movePiece(dropPiece, 'down');
          if (isValidPosition(data.grid, nextPiece)) {
            dropPiece = nextPiece;
            dropDistance++;
          } else {
            break;
          }
        }
        
        if (dropDistance > 0) {
          data.activePiece = dropPiece;
          data.stats.score += dropDistance * 2;
          data.lastMoveTime = 0;
          
          // Update ghost piece
          data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
        }
        break;
      }

      case 'HOLD': {
        if (!data.activePiece || !data.canHold) break;
        
        if (data.holdPiece === null) {
          // First hold - store current piece and spawn next
          data.holdPiece = data.activePiece.type;
          
          // Ensure nextPieces array is valid before using it
          if (!data.nextPieces || !Array.isArray(data.nextPieces) || data.nextPieces.length === 0) {
            data.nextPieces = generateNextPieces();
          }
          
          data.activePiece = createActivePiece(data.nextPieces[0]);
          data.nextPieces = (Array.isArray(data.nextPieces) && data.nextPieces.length > 1)
            ? [...data.nextPieces.slice(1), getRandomPieceType()]
            : generateNextPieces();
        } else {
          // Swap current piece with held piece
          const currentType = data.activePiece.type;
          data.activePiece = createActivePiece(data.holdPiece);
          data.holdPiece = currentType;
        }
        
        data.canHold = false; // Can only hold once per piece
        
        // Update ghost piece
        if (data.activePiece) {
          data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
        }
        break;
      }

      case 'PAUSE':
        data.paused = !data.paused;
        break;

      case 'UNPAUSE':
        data.paused = false;
        break;

      case 'RESET': {
        const resetState = controller.getInitialState();
        setGameState({
          ...newState,
          data: { ...resetState.data },
          isComplete: false,
          score: 0,
          lastModified: new Date().toISOString()
        });
        return;
      }

      case 'TICK': {
        const now = Date.now();
        if (now - data.lastMoveTime >= data.dropSpeed) {
          if (!data.activePiece) break;
          
          const movedPiece = movePiece(data.activePiece, 'down');
          if (isValidPosition(data.grid, movedPiece)) {
            data.activePiece = movedPiece;
            data.lastMoveTime = Date.now();
          } else {
            // Place piece logic
            data.grid = placePiece(data.grid, data.activePiece);
            const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
            data.grid = clearedGrid;
            data.stats = updateStats(data.stats, linesCleared, data.gameStartTime);
            
            // Award coins for line clears
            if (linesCleared > 0) {
              const coins = getLineClearCoins(linesCleared);
              earnCoins(
                coins,
                'game_play',
                'tetris',
                `Tetris: cleared ${linesCleared} line${linesCleared > 1 ? 's' : ''}`
              );
            }
            
            // Ensure nextPieces array is valid before using it
            if (!data.nextPieces || !Array.isArray(data.nextPieces) || data.nextPieces.length === 0) {
              data.nextPieces = generateNextPieces();
            }
            
            data.activePiece = createActivePiece(data.nextPieces[0]);
            data.nextPieces = (Array.isArray(data.nextPieces) && data.nextPieces.length > 1)
              ? [...data.nextPieces.slice(1), getRandomPieceType()]
              : generateNextPieces();
            
            if (isGameOver(data.grid, data.activePiece)) {
              data.gameOver = true;
              newState.isComplete = true;
              
              // Award coins for game completion based on final score
              awardGameCompletion('tetris', 25, data.stats.score);
            }
            
            data.dropSpeed = calculateDropSpeed(data.stats.level);
            data.stats.pieces++;
            data.lastMoveTime = Date.now();
            data.canHold = true;
            data.dangerZoneActive = isDangerZoneActive(data.grid);
          }
          
          // Update ghost piece
          if (data.activePiece) {
            data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
          }
        }
        break;
      }
    }

    newState.data = data;
    newState.score = data.stats.score;
    newState.lastModified = new Date().toISOString();
    setGameState(newState);
  }, [gameState, setGameState, controller, getLineClearCoins, earnCoins, awardGameCompletion]);

  // Control handlers
  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  const handleMobileMove = useCallback((direction: 'left' | 'right' | 'down') => {
    if (isLoading) return;
    dispatch({ type: 'MOVE', direction });
  }, [dispatch, isLoading]);

  const handleMobileRotate = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'ROTATE', direction: 'clockwise' });
  }, [dispatch, isLoading]);

  const handleMobileHardDrop = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'DROP' });
  }, [dispatch, isLoading]);

  // Game loop for automatic piece falling
  useEffect(() => {
    if (gameState.data.gameOver || gameState.data.paused || isLoading) {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      return;
    }

    gameLoopRef.current = setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 50) as unknown as number;

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.data.gameOver, gameState.data.paused, isLoading, dispatch]);

  return {
    gameState,
    isLoading,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave,
    handlePause,
    handleReset,
    handleMobileMove,
    handleMobileRotate,
    handleMobileHardDrop,
    dispatch
  };
};