/**
 * Tetris Game - Classic falling blocks puzzle game
 */
import React, { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { TetrisGameData, TetrisAction, MultiplayerGameState as _MultiplayerGameState, TetrisPlayer as _TetrisPlayer } from './types';
import { TetrisBoard } from './components/TetrisBoard';
import { TetrisControls } from './components/TetrisControls';
// import { useMultiplayerTetris } from './useMultiplayerTetris'; // For future multiplayer integration
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
  calculateGridWidth as _calculateGridWidth,
  getPlayerById,
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
  const [_showMultiplayerOptions, _setShowMultiplayerOptions] = useState(false);
  
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

  // Note: Multiplayer hook integration placeholder - will be used for real multiplayer features
  // const multiplayer = useMultiplayerTetris(...);

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
        // Handle multiplayer mode
        if (data.multiplayer?.isMultiplayer && action.playerId) {
          const currentPlayer = getPlayerById(data.multiplayer, action.playerId);
          if (!currentPlayer?.activePiece) break;
          
          const movedPiece = movePiece(currentPlayer.activePiece, action.direction);
          if (isValidPosition(data.grid, movedPiece)) {
            // Update the specific player's active piece
            const playerIndex = data.multiplayer.players.findIndex(p => p.id === action.playerId);
            if (playerIndex >= 0) {
              data.multiplayer.players[playerIndex].activePiece = movedPiece;
              if (action.direction === 'down') {
                data.lastMoveTime = Date.now();
              }
            }
          } else if (action.direction === 'down') {
            // Piece can't move down anymore, place it
            data.grid = placePiece(data.grid, currentPlayer.activePiece);
            
            // Check for line clears
            const { grid: clearedGrid, linesCleared } = clearCompletedLines(data.grid);
            data.grid = clearedGrid;
            
            // Update player stats
            const playerIndex = data.multiplayer.players.findIndex(p => p.id === action.playerId);
            if (playerIndex >= 0) {
              data.multiplayer.players[playerIndex].stats = updateStats(
                currentPlayer.stats, 
                linesCleared, 
                data.gameStartTime
              );
              
              // Spawn next piece for this player
              const player = data.multiplayer.players[playerIndex];
              // Ensure player nextPieces array is valid
              if (!player.nextPieces || !Array.isArray(player.nextPieces) || player.nextPieces.length === 0) {
                player.nextPieces = generateNextPieces();
              }
              player.activePiece = createActivePiece(
                player.nextPieces[0], 
                action.playerId, 
                player.columnStart,
                data.multiplayer.gridWidth
              );
              player.nextPieces = (Array.isArray(player.nextPieces) && player.nextPieces.length > 1) 
                ? [...player.nextPieces.slice(1), getRandomPieceType()]
                : generateNextPieces();
              player.canHold = true;
              
              // Check game over for this player
              if (isGameOver(data.grid, player.activePiece)) {
                data.gameOver = true;
                newState.isComplete = true;
              }
            }
            
            data.dangerZoneActive = isDangerZoneActive(data.grid);
          }
          
          // Update ghost pieces for all players
          if (data.multiplayer) {
            data.multiplayer.players.forEach(player => {
              if (player.activePiece) {
                const playerIndex = data.multiplayer!.players.findIndex(p => p.id === player.id);
                if (playerIndex >= 0) {
                  data.multiplayer!.players[playerIndex].ghostPiece = createGhostPiece(data.grid, player.activePiece);
                }
              }
            });
          }
        } else {
          // Single player mode (original logic)
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
            // Ensure nextPieces array is valid  
            if (!data.nextPieces || !Array.isArray(data.nextPieces) || data.nextPieces.length === 0) {
              data.nextPieces = generateNextPieces();
            }
            data.activePiece = createActivePiece(data.nextPieces[0]);
            data.nextPieces = (Array.isArray(data.nextPieces) && data.nextPieces.length > 1) 
              ? [...data.nextPieces.slice(1), getRandomPieceType()]
              : generateNextPieces();
            
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
        }
        break;
      }

      case 'HOLD': {
        // Handle multiplayer mode
        if (data.multiplayer?.isMultiplayer && action.playerId) {
          const currentPlayer = getPlayerById(data.multiplayer, action.playerId);
          if (!currentPlayer?.activePiece || !currentPlayer.canHold) break;
          
          const playerIndex = data.multiplayer.players.findIndex(p => p.id === action.playerId);
          if (playerIndex >= 0) {
            const player = data.multiplayer.players[playerIndex];
            
            if (player.holdPiece === null && player.activePiece) {
              // First hold - store current piece and spawn next
              player.holdPiece = player.activePiece.type;
              // Ensure player nextPieces array is valid
              if (!player.nextPieces || !Array.isArray(player.nextPieces) || player.nextPieces.length === 0) {
                player.nextPieces = generateNextPieces();
              }
              player.activePiece = createActivePiece(
                player.nextPieces[0], 
                action.playerId, 
                player.columnStart,
                data.multiplayer.gridWidth
              );
              player.nextPieces = (Array.isArray(player.nextPieces) && player.nextPieces.length > 1) 
                ? [...player.nextPieces.slice(1), getRandomPieceType()]
                : generateNextPieces();
            } else if (player.activePiece) {
              // Swap current piece with held piece
              const currentType = player.activePiece.type;
              player.activePiece = createActivePiece(
                player.holdPiece!,
                action.playerId,
                player.columnStart,
                data.multiplayer.gridWidth
              );
              player.holdPiece = currentType;
            }
            
            player.canHold = false; // Can only hold once per piece
            
            // Update ghost piece for this player
            if (player.activePiece) {
              player.ghostPiece = createGhostPiece(data.grid, player.activePiece);
            }
          }
        } else {
          // Single player mode (original logic)
          if (!data.activePiece || !data.canHold) break;
          
          if (data.holdPiece === null) {
            // First hold - store current piece and spawn next
            data.holdPiece = data.activePiece.type;
            // Ensure nextPieces array is valid
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
        }
        break;
      }

      case 'ROTATE': {
        // Handle multiplayer mode
        if (data.multiplayer?.isMultiplayer && action.playerId) {
          const currentPlayer = getPlayerById(data.multiplayer, action.playerId);
          if (!currentPlayer?.activePiece) break;
          
          const rotatedPiece = rotatePiece(currentPlayer.activePiece, action.direction);
          if (isValidPosition(data.grid, rotatedPiece)) {
            const playerIndex = data.multiplayer.players.findIndex(p => p.id === action.playerId);
            if (playerIndex >= 0) {
              data.multiplayer.players[playerIndex].activePiece = rotatedPiece;
              // Update ghost piece for this player
              data.multiplayer.players[playerIndex].ghostPiece = createGhostPiece(data.grid, rotatedPiece);
            }
          }
        } else {
          // Single player mode (original logic)
          if (!data.activePiece) break;
          
          const rotatedPiece = rotatePiece(data.activePiece, action.direction);
          if (isValidPosition(data.grid, rotatedPiece)) {
            data.activePiece = rotatedPiece;
            
            // Update ghost piece
            data.ghostPiece = createGhostPiece(data.grid, data.activePiece);
          }
        }
        break;
      }

      case 'DROP': {
        // Handle multiplayer mode
        if (data.multiplayer?.isMultiplayer && action.playerId) {
          const currentPlayer = getPlayerById(data.multiplayer, action.playerId);
          if (!currentPlayer?.activePiece) break;
          
          // Hard drop - move piece down until it can't move anymore
          let dropPiece = currentPlayer.activePiece;
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
            const playerIndex = data.multiplayer.players.findIndex(p => p.id === action.playerId);
            if (playerIndex >= 0) {
              data.multiplayer.players[playerIndex].activePiece = dropPiece;
              // Award points for hard drop
              data.multiplayer.players[playerIndex].stats.score += dropDistance * 2;
              // Trigger placement by setting lastMoveTime to force TICK to place piece
              data.lastMoveTime = 0;
              
              // Update ghost piece for this player
              data.multiplayer.players[playerIndex].ghostPiece = createGhostPiece(data.grid, dropPiece);
            }
          }
        } else {
          // Single player mode (original logic)
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
            // Ensure nextPieces array is valid
            if (!data.nextPieces || !Array.isArray(data.nextPieces) || data.nextPieces.length === 0) {
              data.nextPieces = generateNextPieces();
            }
            data.activePiece = createActivePiece(data.nextPieces[0]);
            data.nextPieces = (Array.isArray(data.nextPieces) && data.nextPieces.length > 1) 
              ? [...data.nextPieces.slice(1), getRandomPieceType()]
              : generateNextPieces();
            
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
    
    const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
    
    switch (event.code) {
      case 'ArrowLeft':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'left', playerId: actionPlayerId });
        break;
      case 'ArrowRight':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'right', playerId: actionPlayerId });
        break;
      case 'ArrowDown':
        event.preventDefault();
        dispatch({ type: 'MOVE', direction: 'down', playerId: actionPlayerId });
        break;
      case 'ArrowUp':
        event.preventDefault();
        dispatch({ type: 'ROTATE', direction: 'clockwise', playerId: actionPlayerId });
        break;
      case 'Space':
        event.preventDefault();
        dispatch({ type: 'DROP', playerId: actionPlayerId });
        break;
      case 'KeyC':
      case 'KeyH':
        event.preventDefault();
        dispatch({ type: 'HOLD', playerId: actionPlayerId });
        break;
      case 'KeyP':
        event.preventDefault();
        dispatch({ type: 'PAUSE' });
        break;
    }
  }, [dispatch, isLoading, gameState.data.multiplayer, playerId]);

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
    const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
    dispatch({ type: 'MOVE', direction, playerId: actionPlayerId });
  }, [dispatch, isLoading, gameState.data.multiplayer, playerId]);

  const handleMobileRotate = useCallback(() => {
    if (isLoading) return;
    const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
    dispatch({ type: 'ROTATE', direction: 'clockwise', playerId: actionPlayerId });
  }, [dispatch, isLoading, gameState.data.multiplayer, playerId]);

  const handleMobileHardDrop = useCallback(() => {
    if (isLoading) return;
    const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
    dispatch({ type: 'DROP', playerId: actionPlayerId });
  }, [dispatch, isLoading, gameState.data.multiplayer, playerId]);

  const handleMobileHold = useCallback(() => {
    if (isLoading) return;
    const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
    dispatch({ type: 'HOLD', playerId: actionPlayerId });
  }, [dispatch, isLoading, gameState.data.multiplayer, playerId]);

  // Swipe gesture support
  useSwipeGestures(gameContainerRef, {
    onSwipeLeft: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
        dispatch({ type: 'MOVE', direction: 'left', playerId: actionPlayerId });
      }
    },
    onSwipeRight: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
        dispatch({ type: 'MOVE', direction: 'right', playerId: actionPlayerId });
      }
    },
    onSwipeDown: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
        dispatch({ type: 'MOVE', direction: 'down', playerId: actionPlayerId });
      }
    },
    onSwipeUp: () => {
      if (!isLoading && !gameState.data.gameOver && !gameState.data.paused) {
        const actionPlayerId = gameState.data.multiplayer?.isMultiplayer ? playerId : undefined;
        dispatch({ type: 'ROTATE', direction: 'clockwise', playerId: actionPlayerId });
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
        
        {/* Multiplayer controls */}
        <div className="multiplayer-controls">
          {!gameState.data.multiplayer?.isMultiplayer ? (
            <button 
              className="action-btn"
              onClick={() => {
                // For demo purposes, create a simple multiplayer setup
                const newState = { ...gameState };
                newState.data.multiplayer = {
                  isMultiplayer: true,
                  players: [
                    {
                      id: playerId,
                      name: 'Player 1',
                      columnStart: 0,
                      columnEnd: 10,
                      activePiece: gameState.data.activePiece,
                      ghostPiece: gameState.data.ghostPiece,
                      holdPiece: gameState.data.holdPiece,
                      nextPieces: gameState.data.nextPieces,
                      canHold: gameState.data.canHold,
                      stats: gameState.data.stats
                    }
                  ],
                  currentPlayerId: playerId,
                  gridWidth: 10
                };
                // Clear single-player state
                newState.data.activePiece = null;
                newState.data.ghostPiece = null;
                setGameState(newState);
              }}
            >
              🎮 Enable Multiplayer Mode
            </button>
          ) : (
            <div className="multiplayer-status">
              <span>🎮 Multiplayer Mode ({gameState.data.multiplayer.players.length} players)</span>
              <button 
                className="action-btn danger"
                onClick={() => {
                  // Disable multiplayer mode
                  const newState = { ...gameState };
                  const firstPlayer = newState.data.multiplayer?.players[0];
                  if (firstPlayer) {
                    newState.data.activePiece = firstPlayer.activePiece;
                    newState.data.ghostPiece = firstPlayer.ghostPiece;
                    newState.data.holdPiece = firstPlayer.holdPiece;
                    newState.data.nextPieces = firstPlayer.nextPieces;
                    newState.data.canHold = firstPlayer.canHold;
                    newState.data.stats = firstPlayer.stats;
                  }
                  newState.data.multiplayer = undefined;
                  setGameState(newState);
                }}
              >
                Disable Multiplayer
              </button>
              {gameState.data.multiplayer.players.length < 4 && (
                <button 
                  className="action-btn"
                  onClick={() => {
                    // Add another player (demo)
                    const newState = { ...gameState };
                    if (newState.data.multiplayer) {
                      const playerCount = newState.data.multiplayer.players.length + 1;
                      const newGridWidth = playerCount * 10;
                      
                      // Create new player
                      const newPlayer = {
                        id: `player-${playerCount}`,
                        name: `Player ${playerCount}`,
                        columnStart: (playerCount - 1) * 10,
                        columnEnd: playerCount * 10,
                        activePiece: createActivePiece(
                          getRandomPieceType(),
                          `player-${playerCount}`,
                          (playerCount - 1) * 10,
                          newGridWidth
                        ),
                        ghostPiece: null,
                        holdPiece: null,
                        nextPieces: generateNextPieces(),
                        canHold: true,
                        stats: createInitialStats()
                      };
                      
                      // Update grid
                      newState.data.grid = createEmptyGrid(newGridWidth);
                      newState.data.multiplayer.players.push(newPlayer);
                      newState.data.multiplayer.gridWidth = newGridWidth;
                      
                      setGameState(newState);
                    }
                  }}
                >
                  + Add Player
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      
      <div className="tetris-content">
        <TetrisBoard
          grid={gameState.data.grid}
          activePiece={gameState.data.activePiece}
          ghostPiece={gameState.data.ghostPiece}
          gameOver={gameState.data.gameOver}
          dangerZoneActive={gameState.data.dangerZoneActive}
          multiplayer={gameState.data.multiplayer}
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