/**
 * Game Save Service - Handles automatic and manual save/load operations
 */
import type { 
  GameSaveData, 
  GameState, 
  SaveResult, 
  LoadResult, 
  SaveEvent
} from '../types/game';

export class GameSaveService {
  private static instance: GameSaveService | null = null;
  private eventListeners: { [event: string]: ((data: SaveEvent<any>) => void)[] } = {};
  private autoSaveTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  
  private constructor() {
    // Initialize localStorage cleanup on app start
    this.cleanupOldSaves();
  }

  public static getInstance(): GameSaveService {
    if (!GameSaveService.instance) {
      GameSaveService.instance = new GameSaveService();
    }
    return GameSaveService.instance;
  }

  /**
   * Save game state to localStorage
   */
  public async saveGame<T extends Record<string, unknown>>(
    gameId: string,
    playerId: string,
    gameState: GameState<T>,
    isAutoSave = false
  ): Promise<SaveResult> {
    try {
      const saveKey = this.getSaveKey(gameId, playerId);
      const saveData: GameSaveData<T> = {
        gameId,
        playerId,
        gameState,
        savedAt: new Date().toISOString(),
        version: gameState.version,
        autoSave: isAutoSave
      };

      localStorage.setItem(saveKey, JSON.stringify(saveData));

      const result: SaveResult = {
        success: true,
        savedAt: saveData.savedAt
      };

      // Emit save event
      this.emitEvent({
        action: isAutoSave ? 'auto-save' : 'save',
        gameId,
        success: true,
        gameState,
        timestamp: saveData.savedAt
      });

      console.log(`Game saved: ${gameId} for player ${playerId}${isAutoSave ? ' (auto-save)' : ''}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: SaveResult = {
        success: false,
        error: errorMessage
      };

      // Emit error event
      this.emitEvent({
        action: isAutoSave ? 'auto-save' : 'save',
        gameId,
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      console.error(`Failed to save game ${gameId}:`, error);
      return result;
    }
  }

  /**
   * Load game state from localStorage
   */
  public async loadGame<T extends Record<string, unknown>>(
    gameId: string,
    playerId: string
  ): Promise<LoadResult<T>> {
    try {
      const saveKey = this.getSaveKey(gameId, playerId);
      const savedData = localStorage.getItem(saveKey);

      if (!savedData) {
        return {
          success: false,
          error: 'No save data found'
        };
      }

      const saveData: GameSaveData<T> = JSON.parse(savedData);
      
      // Validate save data structure
      if (!this.validateSaveData(saveData)) {
        return {
          success: false,
          error: 'Invalid save data format'
        };
      }

      const result: LoadResult<T> = {
        success: true,
        gameState: saveData.gameState,
        loadedAt: new Date().toISOString()
      };

      // Emit load event
      this.emitEvent({
        action: 'load',
        gameId,
        success: true,
        gameState: saveData.gameState,
        timestamp: result.loadedAt!
      });

      console.log(`Game loaded: ${gameId} for player ${playerId} (saved at: ${saveData.savedAt})`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: LoadResult<T> = {
        success: false,
        error: errorMessage
      };

      // Emit error event
      this.emitEvent({
        action: 'load',
        gameId,
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      console.error(`Failed to load game ${gameId}:`, error);
      return result;
    }
  }

  /**
   * Drop (delete) saved game data
   */
  public async dropSave(gameId: string, playerId: string): Promise<SaveResult> {
    try {
      const saveKey = this.getSaveKey(gameId, playerId);
      
      // Check if save exists
      const savedData = localStorage.getItem(saveKey);
      if (!savedData) {
        return {
          success: false,
          error: 'No save data to drop'
        };
      }

      // Remove from localStorage
      localStorage.removeItem(saveKey);

      // Clear any active auto-save timer
      const timerKey = `${gameId}-${playerId}`;
      const timer = this.autoSaveTimers.get(timerKey);
      if (timer) {
        clearTimeout(timer);
        this.autoSaveTimers.delete(timerKey);
      }

      const result: SaveResult = {
        success: true,
        savedAt: new Date().toISOString()
      };

      // Emit drop event
      this.emitEvent({
        action: 'drop',
        gameId,
        success: true,
        timestamp: result.savedAt!
      });

      console.log(`Save dropped: ${gameId} for player ${playerId}`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result: SaveResult = {
        success: false,
        error: errorMessage
      };

      // Emit error event
      this.emitEvent({
        action: 'drop',
        gameId,
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });

      console.error(`Failed to drop save for game ${gameId}:`, error);
      return result;
    }
  }

  /**
   * Check if a save exists for a game
   */
  public hasSave(gameId: string, playerId: string): boolean {
    const saveKey = this.getSaveKey(gameId, playerId);
    return localStorage.getItem(saveKey) !== null;
  }

  /**
   * Setup auto-save for a game
   */
  public setupAutoSave<T extends Record<string, unknown>>(
    gameId: string,
    playerId: string,
    gameStateProvider: () => GameState<T>,
    intervalMs: number = 30000 // Default 30 seconds
  ): void {
    const timerKey = `${gameId}-${playerId}`;
    
    // Clear existing timer if any
    const existingTimer = this.autoSaveTimers.get(timerKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Setup new auto-save timer
    const timer = setInterval(async () => {
      const gameState = gameStateProvider();
      if (gameState) {
        await this.saveGame(gameId, playerId, gameState, true);
      }
    }, intervalMs);

    this.autoSaveTimers.set(timerKey, timer);
    console.log(`Auto-save enabled for ${gameId} (interval: ${intervalMs}ms)`);
  }

  /**
   * Disable auto-save for a game
   */
  public disableAutoSave(gameId: string, playerId: string): void {
    const timerKey = `${gameId}-${playerId}`;
    const timer = this.autoSaveTimers.get(timerKey);
    
    if (timer) {
      clearInterval(timer);
      this.autoSaveTimers.delete(timerKey);
      console.log(`Auto-save disabled for ${gameId}`);
    }
  }

  /**
   * Get all saved games for a player
   */
  public getSavedGames(playerId: string): Array<{ gameId: string; savedAt: string; autoSave: boolean }> {
    const savedGames: Array<{ gameId: string; savedAt: string; autoSave: boolean }> = [];
    const prefix = `minigames_save_${playerId}_`;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const saveData: GameSaveData = JSON.parse(data);
            const gameId = key.replace(prefix, '');
            savedGames.push({
              gameId,
              savedAt: saveData.savedAt,
              autoSave: saveData.autoSave
            });
          }
        } catch (error) {
          console.warn(`Failed to parse save data for key ${key}:`, error);
        }
      }
    }

    return savedGames.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
  }

  /**
   * Event listener management
   */
  public on(event: string, callback: (data: SaveEvent<any>) => void): void {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
  }

  public off(event: string, callback: (data: SaveEvent<any>) => void): void {
    if (this.eventListeners[event]) {
      this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
  }

  private emitEvent<T extends Record<string, unknown>>(event: SaveEvent<T>): void {
    // Emit to specific action listeners
    const actionListeners = this.eventListeners[event.action];
    if (actionListeners) {
      actionListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error(`Error in ${event.action} event listener:`, error);
        }
      });
    }

    // Emit to general listeners
    const generalListeners = this.eventListeners['*'];
    if (generalListeners) {
      generalListeners.forEach(callback => {
        try {
          callback(event);
        } catch (error) {
          console.error('Error in general event listener:', error);
        }
      });
    }
  }

  /**
   * Generate save key for localStorage
   */
  private getSaveKey(gameId: string, playerId: string): string {
    return `minigames_save_${playerId}_${gameId}`;
  }

  /**
   * Validate save data structure
   */
  private validateSaveData<T extends Record<string, unknown>>(saveData: GameSaveData<T>): boolean {
    return !!(
      saveData &&
      saveData.gameId &&
      saveData.playerId &&
      saveData.gameState &&
      saveData.savedAt &&
      saveData.version &&
      typeof saveData.autoSave === 'boolean'
    );
  }

  /**
   * Cleanup old saves (older than 30 days)
   */
  private cleanupOldSaves(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('minigames_save_')) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const saveData: GameSaveData = JSON.parse(data);
            const savedDate = new Date(saveData.savedAt);
            if (savedDate < thirtyDaysAgo) {
              keysToRemove.push(key);
            }
          }
        } catch (error) {
          // If we can't parse it, it's probably corrupted, so remove it
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleaned up old save: ${key}`);
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old save files`);
    }
  }

  /**
   * Cleanup method for component unmounting
   */
  public cleanup(): void {
    // Clear all auto-save timers
    this.autoSaveTimers.forEach(timer => clearInterval(timer));
    this.autoSaveTimers.clear();
    
    // Clear event listeners
    this.eventListeners = {};
  }
}