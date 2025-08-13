/**
 * Tetris Game - Classic falling blocks puzzle game
 */
import React, { useCallback, useEffect, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { TetrisGameData, TetrisAction } from './types';
import { TetrisBoard } from './components/TetrisBoard';
import { TetrisControls } from './components/TetrisControls';
import './TetrisGame.css';
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
  autoSaveIntervalMs: 30000 // Save every 30 seconds
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
        nextPieces: nextPieces.slice(1), // Remove first piece since it's active
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
      typeof state.data.canHold === 'boolean' &&
      typeof state.data.gameStartTime === 'number' &&
      typeof state.data.dangerZoneActive === 'boolean'
    );
    
    // If validation fails, it might be an old save format - return false to trigger reset
    if (!isValid) {
      console.warn('Tetris save validation failed - likely old save format, will reset');
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

interface TetrisGameProps {
  playerId: string;
}

export const TetrisGame: React.FC<TetrisGameProps> = ({ playerId }) => {
  const controller = useMemo(() => new TetrisGameController(), []);
  const gameLoopRef = useRef<number | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  
  const {
    gameState,
    setGameState,
    isLoading,
    autoSaveEnabled
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
          // Piece can't move down anymore, place it
          data.grid = placePiece(data.grid, data.activePiece);
          
          // Check for line clears
          const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
          data.grid = clearedGrid;
          data.stats = updateStats(data.stats, linesCleared, data.gameStartTime);
          
          // Spawn next piece
          data.activePiece = createActivePiece(data.nextPieces[0]);
          data.nextPieces = [...data.nextPieces.slice(1), getRandomPieceType()];
          
          // Check game over
          if (isGameOver(data.grid, data.activePiece)) {
            data.gameOver = true;
            newState.isComplete = true;
          }
          
          // Update drop speed based on level and other flags
          data.dropSpeed = calculateDropSpeed(data.stats.level);
          data.stats.pieces++;
          data.canHold = true; // Can hold again after placing piece
          data.dangerZoneActive = isDangerZoneActive(data.grid);
        }
        
        // Update ghost piece
        if (data.activePiece) {
          data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
        }
        break;
      }

      case 'HOLD': {
        if (!data.activePiece || !data.canHold) break;
        
        if (data.holdPiece === null) {
          // First hold - store current piece and spawn next
          data.holdPiece = data.activePiece.type;
          data.activePiece = createActivePiece(data.nextPieces[0]);
          data.nextPieces = [...data.nextPieces.slice(1), getRandomPieceType()];
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
        
        // Hard drop - move piece down until it can't move anymore
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
          // Award points for hard drop
          data.stats.score += dropDistance * 2;
          // Trigger placement by setting lastMoveTime to force TICK to place piece
          data.lastMoveTime = 0;
          
          // Update ghost piece
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
          // Use the MOVE logic directly instead of recursive dispatch
          if (!data.activePiece) break;
          
          const movedPiece = movePiece(data.activePiece, 'down');
          if (isValidPosition(data.grid, movedPiece)) {
            data.activePiece = movedPiece;
            data.lastMoveTime = Date.now();
          } else {
            // Piece can't move down anymore, place it
            data.grid = placePiece(data.grid, data.activePiece);
            
            // Check for line clears
            const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
            data.grid = clearedGrid;
            data.stats = updateStats(data.stats, linesCleared, data.gameStartTime);
            
            // Spawn next piece
            data.activePiece = createActivePiece(data.nextPieces[0]);
            data.nextPieces = [...data.nextPieces.slice(1), getRandomPieceType()];
            
            // Check game over
            if (isGameOver(data.grid, data.activePiece)) {
              data.gameOver = true;
              newState.isComplete = true;
            }
            
            // Update drop speed based on level and other flags
            data.dropSpeed = calculateDropSpeed(data.stats.level);
            data.stats.pieces++;
            data.lastMoveTime = Date.now();
            data.canHold = true; // Can hold again after placing piece
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
  }, [gameState, setGameState, controller]);

  // Keyboard controls
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (isLoading) return;
    
    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'left' });
        break;
      case 'ArrowRight':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'right' });
        break;
      case 'ArrowDown':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'down' });
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch({ type: 'ROTATE', direction: 'clockwise' });
        break;
      case 'Space':
        event.preventDefault();
        dispatch({ type: 'DROP' });
        break;
      case 'KeyC':
      case 'KeyH':
        event.preventDefault();
        dispatch({ type: 'HOLD' });
        break;
      case 'KeyP':
        event.preventDefault();
        dispatch({ type: 'PAUSE' });
        break;
    }
  }, [dispatch, isLoading]);

  // Set up keyboard listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

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
    }, 50) as unknown as number; // Check every 50ms for smooth movement

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.data.gameOver, gameState.data.paused, isLoading, dispatch]);

  // Control handlers
  const handlePause = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, [dispatch]);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, [dispatch]);

  // Mobile control handlers
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

  const handleMobileHold = useCallback(() => {
    if (isLoading) return;
    dispatch({ type: 'HOLD' });
  }, [dispatch, isLoading]);

  // Swipe gesture support
  useSwipeGestures(gameContainerRef, {
    onSwipeLeft: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'left' });
      }
    },
    onSwipeRight: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'right' });
      }
    },
    onSwipeDown: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'MOVE', direction: 'down' });
      }
    },
    onSwipeUp: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        dispatch({ type: 'ROTATE', direction: 'clockwise' });
      }
    },
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Tetris...</h2>
      </div>
    );
  }

  return (
    <div className="tetris-game" ref={gameContainerRef}>
      <div className="tetris-header">
        <h2>{TETRIS_CONFIG.name}</h2>
      </div>
      
      <div className="tetris-content">
        <TetrisBoard
          grid={gameState.data.grid}
          activePiece={gameState.data.activePiece}
          ghostPiece={gameState.data.ghostPiece}
          gameOver={gameState.data.gameOver}
          dangerZoneActive={gameState.data.dangerZoneActive}
        />
        
        <TetrisControls
          stats={gameState.data.stats}
          nextPieces={gameState.data.nextPieces}
          holdPiece={gameState.data.holdPiece}
          paused={gameState.data.paused}
          gameOver={gameState.data.gameOver}
          canHold={gameState.data.canHold}
          onPause={handlePause}
          onReset={handleReset}
          onMoveLeft={() => handleMobileMove('left')}
          onMoveRight={() => handleMobileMove('right')}
          onMoveDown={() => handleMobileMove('down')}
          onRotate={handleMobileRotate}
          onHardDrop={handleMobileHardDrop}
          onHold={handleMobileHold}
        />
      </div>
      
      <div className="tetris-save-info">
        <small>
          💾 {autoSaveEnabled ? 'Auto-save: On' : 'Auto-save: Off'}
        </small>
      </div>
    </div>
  );
};

export default TetrisGame;