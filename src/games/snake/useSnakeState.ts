/**
 * Snake Game State Hook - Manages game state and game loop
 */

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { snakeGameController } from './controller';
import type { SnakeGameData, SnakeAction, Direction } from './types';
import { 
  moveSnake, 
  growSnake, 
  detectCollision, 
  checkFoodCollision, 
  spawnFood, 
  rebuildGrid, 
  checkGameOver, 
  getWinner,
  createSnake,
  isValidDirectionChange
} from './logic';

/**
 * Snake game state reducer
 */
function snakeGameReducer(state: SnakeGameData, action: SnakeAction): SnakeGameData {
  switch (action.type) {
    case 'CHANGE_DIRECTION': {
      const snake = state.snakes.find(s => s.id === action.playerId);
      if (!snake || !snake.alive) return state;

      // Validate direction change
      if (!isValidDirectionChange(snake.direction, action.direction)) {
        return state;
      }

      // Update snake's next direction (buffered until next move)
      const updatedSnakes = state.snakes.map(s => 
        s.id === action.playerId 
          ? { ...s, nextDirection: action.direction }
          : s
      );

      return {
        ...state,
        snakes: updatedSnakes
      };
    }

    case 'TICK': {
      if (state.gameOver || state.isPaused) return state;

      let updatedFood = [...state.food];
      let foodEaten = false;

      // Check collisions and handle food consumption for each snake
      const updatedSnakes = state.snakes.map(snake => {
        if (!snake.alive) return snake;

        // Move the snake first
        const movedSnake = moveSnake(snake);
        const head = movedSnake.segments[0];
        
        // Check collision with walls, self, or other snakes
        // Use original snakes array to avoid checking against already moved snakes
        const collision = detectCollision(head, movedSnake, state.snakes, state.config);
        if (collision) {
          return { ...movedSnake, alive: false };
        }

        // Check food collision
        const eatenFood = checkFoodCollision(head, updatedFood);
        if (eatenFood) {
          // Remove eaten food
          updatedFood = updatedFood.filter(f => f !== eatenFood);
          foodEaten = true;
          
          // Grow snake
          return growSnake(movedSnake);
        }

        return movedSnake;
      });

      // Spawn new food if any was eaten
      if (foodEaten) {
        const newGrid = rebuildGrid(state.config, updatedSnakes, updatedFood);
        const newFood = spawnFood(newGrid, state.config);
        updatedFood.push(newFood);
      }

      // Rebuild grid
      const newGrid = rebuildGrid(state.config, updatedSnakes, updatedFood);

      // Check game over
      const gameOver = checkGameOver(updatedSnakes, state.gameMode);
      const winner = gameOver ? getWinner(updatedSnakes) : state.winner;

      // Update stats
      const newStats = {
        ...state.stats,
        elapsedTime: Math.floor((Date.now() - state.stats.gameStartTime) / 1000),
        totalFood: foodEaten ? state.stats.totalFood + 1 : state.stats.totalFood
      };

      return {
        ...state,
        grid: newGrid,
        snakes: updatedSnakes,
        food: updatedFood,
        stats: newStats,
        gameOver,
        winner,
        currentTick: state.currentTick + 1
      };
    }

    case 'PAUSE':
      return { ...state, isPaused: true };

    case 'UNPAUSE':
      return { ...state, isPaused: false };

    case 'ADD_PLAYER': {
      if (state.snakes.length >= state.config.maxPlayers) return state;
      
      const newSnake = createSnake(action.playerId, state.snakes.length, state.config);
      const updatedSnakes = [...state.snakes, newSnake];
      const newGrid = rebuildGrid(state.config, updatedSnakes, state.food);

      return {
        ...state,
        grid: newGrid,
        snakes: updatedSnakes,
        gameMode: 'multiplayer'
      };
    }

    case 'REMOVE_PLAYER': {
      const updatedSnakes = state.snakes.filter(s => s.id !== action.playerId);
      const newGrid = rebuildGrid(state.config, updatedSnakes, state.food);
      const gameMode = updatedSnakes.length > 1 ? 'multiplayer' : 'single';

      return {
        ...state,
        grid: newGrid,
        snakes: updatedSnakes,
        gameMode
      };
    }

    default:
      return state;
  }
}

/**
 * Custom hook for Snake game state management
 */
export function useSnakeState(playerId: string) {
  const gameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Create player-specific initial state
  const createPlayerInitialState = useCallback(() => {
    const baseState = snakeGameController.getInitialState();
    return {
      ...baseState,
      playerId,
      data: {
        ...baseState.data,
        snakes: baseState.data.snakes.map(snake => ({ ...snake, id: playerId }))
      }
    };
  }, [playerId]);
  
  // Use platform's game save system
  const {
    gameState,
    setGameState,
    isLoading,
    autoSaveEnabled
  } = useGameSave<SnakeGameData>({
    gameId: snakeGameController.config.id,
    playerId,
    gameConfig: snakeGameController.config,
    initialState: createPlayerInitialState(),
    onSaveLoad: snakeGameController.onSaveLoad,
    onSaveDropped: snakeGameController.onSaveDropped
  });

  // Local game state reducer with player context
  const snakeGameReducerWithPlayer = useCallback((state: SnakeGameData, action: SnakeAction): SnakeGameData => {
    if (action.type === 'RESET') {
      return createPlayerInitialState().data;
    }
    return snakeGameReducer(state, action);
  }, [createPlayerInitialState]);

  // Local game state reducer
  const [localGameData, dispatch] = useReducer(snakeGameReducerWithPlayer, gameState?.data || createPlayerInitialState().data);

  // Sync local state with saved state when it changes
  useEffect(() => {
    if (gameState?.data && gameState.data !== localGameData) {
      // Only sync if it's significantly different to avoid loops
      const savedTick = gameState.data.currentTick || 0;
      const localTick = localGameData.currentTick || 0;
      
      if (Math.abs(savedTick - localTick) > 5) { // Increased threshold
        // Reset local reducer to match saved state
        dispatch({ type: 'RESET' });
      }
    }
  }, [gameState?.data.currentTick]); // Only depend on tick to avoid loops

  // Save local state to platform when it changes (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!isLoading && localGameData && gameState) {
      // Clear previous timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounce save operations to prevent loops
      saveTimeoutRef.current = setTimeout(() => {
        const updatedState = {
          ...gameState,
          data: localGameData,
          lastModified: new Date().toISOString(),
          score: Math.max(...localGameData.snakes.map(s => s.score), 0),
          isComplete: localGameData.gameOver
        };
        setGameState(updatedState);
      }, 100); // 100ms debounce
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [localGameData.currentTick, localGameData.gameOver]); // Only depend on key changes

  // Game loop
  useEffect(() => {
    if (!localGameData.gameOver && !localGameData.isPaused) {
      gameIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK' });
      }, localGameData.config.moveSpeed);
    }

    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
        gameIntervalRef.current = null;
      }
    };
  }, [localGameData.gameOver, localGameData.isPaused, localGameData.config.moveSpeed]);

  // Game controls
  const changeDirection = useCallback((direction: Direction) => {
    dispatch({ type: 'CHANGE_DIRECTION', playerId, direction });
  }, [playerId]);

  const pauseGame = useCallback(() => {
    dispatch({ type: 'PAUSE' });
  }, []);

  const resumeGame = useCallback(() => {
    dispatch({ type: 'UNPAUSE' });
  }, []);

  const resetGame = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const addPlayer = useCallback((newPlayerId: string, name: string) => {
    dispatch({ type: 'ADD_PLAYER', playerId: newPlayerId, name });
  }, []);

  const removePlayer = useCallback((targetPlayerId: string) => {
    dispatch({ type: 'REMOVE_PLAYER', playerId: targetPlayerId });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameIntervalRef.current) {
        clearInterval(gameIntervalRef.current);
      }
    };
  }, []);

  return {
    gameState: { ...gameState!, data: localGameData },
    isLoading,
    autoSaveEnabled,
    dispatch,
    actions: {
      changeDirection,
      pauseGame,
      resumeGame,
      resetGame,
      addPlayer,
      removePlayer
    }
  };
}