/**
 * Tetris shared state hook and controller
 */
import { useCallback, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useCoinService } from '../../hooks/useCoinService';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { TetrisData, TetrisAction } from './types';
import {
  createEmptyBoard,
  createPiece,
  getRandomPieceType,
  isValidPosition,
  rotatePiece,
  placePiece,
  getCompletedLines,
  clearLines,
  calculateScore,
  calculateLevel,
  getDropSpeed,
  isGameOver,
  getHardDropPosition,
  BOARD_HEIGHT,
  BOARD_BUFFER
} from './logic';

// Game configuration
const TETRIS_CONFIG: GameConfig = {
  id: 'tetris',
  name: 'Tetris',
  description: 'Classic block puzzle game - arrange falling pieces to clear lines!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000
};

// Game controller
class TetrisController implements GameController<TetrisData> {
  config = TETRIS_CONFIG;

  getInitialState(): GameState<TetrisData> {
    const now = new Date().toISOString();
    const firstPiece = getRandomPieceType();
    return {
      gameId: 'tetris',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        board: createEmptyBoard(),
        activePiece: createPiece(firstPiece),
        nextPiece: getRandomPieceType(),
        score: 0,
        level: 0,
        lines: 0,
        gameOver: false,
        isPaused: false,
        dropTime: getDropSpeed(0)
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<TetrisData>): boolean {
    return !!(
      state &&
      state.data &&
      Array.isArray(state.data.board) &&
      state.data.board.length === BOARD_HEIGHT + BOARD_BUFFER &&
      typeof state.data.score === 'number' &&
      typeof state.data.level === 'number' &&
      typeof state.data.lines === 'number' &&
      typeof state.data.gameOver === 'boolean' &&
      typeof state.data.isPaused === 'boolean'
    );
  }

  onSaveLoad(state: GameState<TetrisData>): void {
    console.log('Tetris game loaded:', {
      score: state.data.score,
      level: state.data.level,
      lines: state.data.lines,
      gameOver: state.data.gameOver
    });
  }

  onSaveDropped(): void {
    console.log('Tetris game save dropped');
  }
}

// Shared hook for game state and logic
export const useTetrisState = (playerId: string) => {
  const controller = useMemo(() => new TetrisController(), []);
  const { earnCoins } = useCoinService();
  
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
  } = useGameSave<TetrisData>({
    gameId: 'tetris',
    playerId,
    gameConfig: TETRIS_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Handle game actions
  const performAction = useCallback(async (action: TetrisAction) => {
    if (gameState.data.gameOver && action.type !== 'NEW_GAME') return;
    if (gameState.data.isPaused && action.type !== 'PAUSE' && action.type !== 'NEW_GAME') return;

    let newData = { ...gameState.data };

    switch (action.type) {
      case 'MOVE_LEFT':
        if (newData.activePiece) {
          const newPosition = { 
            row: newData.activePiece.position.row, 
            col: newData.activePiece.position.col - 1 
          };
          if (isValidPosition(newData.board, newData.activePiece, newPosition)) {
            newData.activePiece = { ...newData.activePiece, position: newPosition };
          }
        }
        break;

      case 'MOVE_RIGHT':
        if (newData.activePiece) {
          const newPosition = { 
            row: newData.activePiece.position.row, 
            col: newData.activePiece.position.col + 1 
          };
          if (isValidPosition(newData.board, newData.activePiece, newPosition)) {
            newData.activePiece = { ...newData.activePiece, position: newPosition };
          }
        }
        break;

      case 'MOVE_DOWN':
        if (newData.activePiece) {
          const newPosition = { 
            row: newData.activePiece.position.row + 1, 
            col: newData.activePiece.position.col 
          };
          if (isValidPosition(newData.board, newData.activePiece, newPosition)) {
            newData.activePiece = { ...newData.activePiece, position: newPosition };
          } else {
            // Piece has landed - place it and spawn new piece
            newData.board = placePiece(newData.board, newData.activePiece);
            const completedLines = getCompletedLines(newData.board);
            
            if (completedLines.length > 0) {
              newData.board = clearLines(newData.board, completedLines);
              newData.lines += completedLines.length;
              newData.score += calculateScore(completedLines.length, newData.level);
              newData.level = calculateLevel(newData.lines);
              newData.dropTime = getDropSpeed(newData.level);
              
              // Earn coins for clearing lines
              const coinReward = completedLines.length * 10;
              await earnCoins(coinReward, 'game_play', 'tetris', `Cleared ${completedLines.length} line${completedLines.length > 1 ? 's' : ''}`);
            }
            
            // Check game over before spawning new piece
            if (isGameOver(newData.board)) {
              newData.gameOver = true;
              newData.activePiece = null;
            } else {
              // Spawn new piece
              newData.activePiece = createPiece(newData.nextPiece);
              newData.nextPiece = getRandomPieceType();
            }
          }
        }
        break;

      case 'ROTATE':
        if (newData.activePiece) {
          const rotatedPiece = rotatePiece(newData.activePiece);
          if (isValidPosition(newData.board, rotatedPiece, rotatedPiece.position)) {
            newData.activePiece = rotatedPiece;
          }
        }
        break;

      case 'HARD_DROP': {
        if (newData.activePiece) {
          const dropPosition = getHardDropPosition(newData.board, newData.activePiece);
          newData.activePiece = { ...newData.activePiece, position: dropPosition };
          // Immediately place the piece
          newData.board = placePiece(newData.board, newData.activePiece);
          const completedLines = getCompletedLines(newData.board);
          
          if (completedLines.length > 0) {
            newData.board = clearLines(newData.board, completedLines);
            newData.lines += completedLines.length;
            newData.score += calculateScore(completedLines.length, newData.level);
            newData.level = calculateLevel(newData.lines);
            newData.dropTime = getDropSpeed(newData.level);
            
            // Earn coins for clearing lines
            const coinReward = completedLines.length * 10;
            await earnCoins(coinReward, 'game_play', 'tetris', `Cleared ${completedLines.length} line${completedLines.length > 1 ? 's' : ''}`);
          }
          
          // Check game over before spawning new piece
          if (isGameOver(newData.board)) {
            newData.gameOver = true;
            newData.activePiece = null;
          } else {
            // Spawn new piece
            newData.activePiece = createPiece(newData.nextPiece);
            newData.nextPiece = getRandomPieceType();
          }
        }
        break;
      }

      case 'PAUSE':
        newData.isPaused = !newData.isPaused;
        break;

      case 'NEW_GAME': {
        const initialState = controller.getInitialState();
        newData = initialState.data;
        break;
      }

      case 'TICK':
        // This will be handled in the main component
        break;
    }

    const updatedState = {
      ...gameState,
      data: newData,
      score: newData.score,
      isComplete: newData.gameOver,
      lastModified: new Date().toISOString()
    };

    setGameState(updatedState);
    
    // Auto-save on significant events
    if (['MOVE_DOWN', 'HARD_DROP', 'NEW_GAME'].includes(action.type)) {
      await triggerAutoSave();
    }
  }, [gameState, controller, earnCoins, setGameState, triggerAutoSave]);

  return {
    gameState,
    isLoading,
    hasSave,
    lastSaveEvent,
    autoSaveEnabled,
    actions: {
      performAction,
      saveGame,
      loadGame,
      triggerAutoSave
    }
  };
};