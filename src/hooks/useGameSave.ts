/**
 * React hook for game save/load functionality
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { GameSaveService } from '../services/GameSaveService';
import type { 
  GameState, 
  SaveResult, 
  LoadResult, 
  SaveEvent,
  GameConfig 
} from '../types/game';

interface UseGameSaveOptions<T extends Record<string, unknown>> {
  gameId: string;
  playerId: string;
  gameConfig: GameConfig;
  initialState: GameState<T>;
  onSaveLoad?: (gameState: GameState<T>) => void;
  onSaveDropped?: () => void;
}

interface UseGameSaveReturn<T extends Record<string, unknown>> {
  gameState: GameState<T>;
  setGameState: (state: GameState<T>) => void;
  saveGame: () => Promise<SaveResult>;
  loadGame: () => Promise<LoadResult<T>>;
  dropSave: () => Promise<SaveResult>;
  triggerAutoSave: () => Promise<SaveResult>; // New manual trigger function
  hasSave: boolean;
  isLoading: boolean;
  lastSaveEvent: SaveEvent<T> | null;
  autoSaveEnabled: boolean;
  toggleAutoSave: () => void;
}

export const useGameSave = <T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseGameSaveOptions<T>
): UseGameSaveReturn<T> => {
  const {
    gameId,
    playerId,
    gameConfig,
    initialState,
    onSaveLoad,
    onSaveDropped
  } = options;

  const [gameState, setGameStateInternal] = useState<GameState<T>>(initialState);
  const [hasSave, setHasSave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaveEvent, setLastSaveEvent] = useState<SaveEvent<T> | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(gameConfig.autoSaveEnabled);
  
  const saveServiceRef = useRef<GameSaveService>(GameSaveService.getInstance());
  const gameStateRef = useRef<GameState<T>>(gameState);
  const lastSaveTimeRef = useRef<number>(0);
  const saveDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update ref when gameState changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Check for existing save on mount
  useEffect(() => {
    const checkExistingSave = async () => {
      setIsLoading(true);
      const saveExists = saveServiceRef.current.hasSave(gameId, playerId);
      setHasSave(saveExists);

      // Auto-load if save exists
      if (saveExists) {
        const loadResult = await saveServiceRef.current.loadGame<T>(gameId, playerId);
        if (loadResult.success && loadResult.gameState) {
          setGameStateInternal(loadResult.gameState);
          onSaveLoad?.(loadResult.gameState);
          console.log(`Auto-loaded save for game ${gameId}`);
        }
      }
      setIsLoading(false);
    };

    checkExistingSave();
  }, [gameId, playerId, onSaveLoad]);

  // Setup auto-save when enabled
  useEffect(() => {
    const saveService = saveServiceRef.current;
    
    if (autoSaveEnabled) {
      saveService.setupAutoSave(
        gameId,
        playerId,
        () => gameStateRef.current,
        gameConfig.autoSaveIntervalMs
      );
    } else {
      saveService.disableAutoSave(gameId, playerId);
    }

    return () => {
      saveService.disableAutoSave(gameId, playerId);
    };
  }, [gameId, playerId, autoSaveEnabled, gameConfig.autoSaveIntervalMs]);

  // Setup save event listeners
  useEffect(() => {
    const handleSaveEvent = (event: SaveEvent<unknown>) => {
      if (event.gameId === gameId) {
        setLastSaveEvent(event as SaveEvent<T>);
        
        // Update hasSave status based on save/drop events
        if (event.success) {
          if (event.action === 'drop') {
            setHasSave(false);
          } else if (event.action === 'save' || event.action === 'auto-save') {
            setHasSave(true);
          }
        }
      }
    };

    const saveService = saveServiceRef.current;
    saveService.on('*', handleSaveEvent);

    return () => {
      saveService.off('*', handleSaveEvent);
    };
  }, [gameId]);

  // Debounced auto-save on state changes
  useEffect(() => {
    if (!autoSaveEnabled) return;

    // Clear existing timeout
    if (saveDebounceTimeoutRef.current) {
      clearTimeout(saveDebounceTimeoutRef.current);
    }

    // Don't auto-save too frequently
    const now = Date.now();
    const timeSinceLastSave = now - lastSaveTimeRef.current;
    const minInterval = Math.min(gameConfig.autoSaveIntervalMs, 5000); // At least 5 seconds between saves

    if (timeSinceLastSave >= minInterval) {
      // Save immediately if enough time has passed
      saveServiceRef.current.saveGame(gameId, playerId, gameState, true);
      lastSaveTimeRef.current = now;
    } else {
      // Debounce the save
      saveDebounceTimeoutRef.current = setTimeout(() => {
        saveServiceRef.current.saveGame(gameId, playerId, gameStateRef.current, true);
        lastSaveTimeRef.current = Date.now();
      }, minInterval - timeSinceLastSave);
    }

    return () => {
      if (saveDebounceTimeoutRef.current) {
        clearTimeout(saveDebounceTimeoutRef.current);
      }
    };
  }, [gameState, autoSaveEnabled, gameId, playerId, gameConfig.autoSaveIntervalMs]);

  // Update game state with timestamp
  const setGameState = useCallback((newState: GameState<T>) => {
    const updatedState = {
      ...newState,
      lastModified: new Date().toISOString()
    };
    setGameStateInternal(updatedState);
  }, []);

  // Manual auto-save trigger function
  const triggerAutoSave = useCallback(async (): Promise<SaveResult> => {
    if (!autoSaveEnabled) {
      return {
        success: false,
        error: 'Auto-save is disabled'
      };
    }
    const currentState = gameStateRef.current;
    return await saveServiceRef.current.saveGame(gameId, playerId, currentState, true);
  }, [gameId, playerId, autoSaveEnabled]);

  // Manual save function
  const saveGame = useCallback(async (): Promise<SaveResult> => {
    const currentState = gameStateRef.current;
    return await saveServiceRef.current.saveGame(gameId, playerId, currentState, false);
  }, [gameId, playerId]);

  // Load function
  const loadGame = useCallback(async (): Promise<LoadResult<T>> => {
    const result = await saveServiceRef.current.loadGame<T>(gameId, playerId);
    if (result.success && result.gameState) {
      setGameStateInternal(result.gameState);
      onSaveLoad?.(result.gameState);
    }
    return result;
  }, [gameId, playerId, onSaveLoad]);

  // Drop save function
  const dropSave = useCallback(async (): Promise<SaveResult> => {
    const result = await saveServiceRef.current.dropSave(gameId, playerId);
    if (result.success) {
      setHasSave(false);
      onSaveDropped?.();
    }
    return result;
  }, [gameId, playerId, onSaveDropped]);

  // Toggle auto-save
  const toggleAutoSave = useCallback(() => {
    setAutoSaveEnabled(prev => !prev);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveDebounceTimeoutRef.current) {
        clearTimeout(saveDebounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    triggerAutoSave, // Add the new trigger function
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  };
};