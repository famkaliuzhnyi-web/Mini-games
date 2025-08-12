import { useEffect, useState, useCallback, useRef } from 'react';
import { WebSocketService, type GameState } from '../services/WebSocketService';
import { OfflineService } from '../services/OfflineService';

export interface GameConnection {
  isOnline: boolean;
  isConnected: boolean;
  connectionState: string;
  gameState: GameState | null;
  sendMessage: (type: string, payload: any) => void;
  updateGameState: (gameState: Partial<GameState>) => void;
  joinGame: (playerData: any) => void;
  leaveGame: (playerId: string) => void;
  sendGameAction: (action: any) => void;
}

export const useGameConnection = (serverUrl?: string): GameConnection => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected');
  const [gameState, setGameState] = useState<GameState | null>(null);
  
  const wsService = useRef<WebSocketService | null>(null);
  const offlineService = useRef<OfflineService | null>(null);

  // Initialize services
  useEffect(() => {
    wsService.current = new WebSocketService(serverUrl);
    offlineService.current = new OfflineService();

    return () => {
      wsService.current?.disconnect();
      offlineService.current?.terminate();
    };
  }, [serverUrl]);

  // Handle online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      offlineService.current?.syncWhenOnline();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Setup WebSocket event listeners
  useEffect(() => {
    if (!wsService.current) return;

    const ws = wsService.current;

    const handleConnection = (data: any) => {
      setIsConnected(data.status === 'connected');
      setConnectionState(data.status);
    };

    const handleGameStateUpdate = (newGameState: GameState) => {
      setGameState(newGameState);
      
      // Cache the game state for offline access
      if (offlineService.current) {
        offlineService.current.cacheData('gameState', newGameState);
      }
    };

    const handlePlayerJoin = (playerData: any) => {
      setGameState(prevState => {
        if (!prevState) return null;
        return {
          ...prevState,
          players: {
            ...prevState.players,
            [playerData.playerId]: playerData
          },
          lastUpdated: new Date().toISOString()
        };
      });
    };

    const handlePlayerLeave = (data: { playerId: string }) => {
      setGameState(prevState => {
        if (!prevState) return null;
        const newPlayers = { ...prevState.players };
        delete newPlayers[data.playerId];
        return {
          ...prevState,
          players: newPlayers,
          lastUpdated: new Date().toISOString()
        };
      });
    };

    const handleGameAction = (actionData: any) => {
      // Handle game actions and update local state
      console.log('Game action received:', actionData);
      
      // Cache action for offline replay
      if (offlineService.current) {
        offlineService.current.cacheData('lastAction', actionData);
      }
    };

    // Register event listeners
    ws.on('connection', handleConnection);
    ws.on('gameStateUpdate', handleGameStateUpdate);
    ws.on('playerJoin', handlePlayerJoin);
    ws.on('playerLeave', handlePlayerLeave);
    ws.on('gameAction', handleGameAction);

    return () => {
      ws.off('connection', handleConnection);
      ws.off('gameStateUpdate', handleGameStateUpdate);
      ws.off('playerJoin', handlePlayerJoin);
      ws.off('playerLeave', handlePlayerLeave);
      ws.off('gameAction', handleGameAction);
    };
  }, []);

  // Setup offline service listeners
  useEffect(() => {
    if (!offlineService.current) return;

    const offline = offlineService.current;

    const handleCachedData = (data: any) => {
      if (data.key === 'gameState' && data.data && !isOnline) {
        // Use cached game state when offline
        setGameState(data.data);
      }
    };

    const handleSyncRequest = (data: any) => {
      // Handle sync request from worker
      if (wsService.current && isOnline && isConnected) {
        wsService.current.updateGameState(data.gameState);
      }
    };

    const handleOfflineStateUpdated = (data: any) => {
      // Update local game state from offline changes
      if (!isOnline) {
        setGameState(prevState => ({
          ...prevState,
          ...data.gameState,
          lastUpdated: new Date().toISOString()
        }));
      }
    };

    offline.on('cached_data', handleCachedData);
    offline.on('sync_request', handleSyncRequest);
    offline.on('offline_state_updated', handleOfflineStateUpdated);

    return () => {
      offline.off('cached_data', handleCachedData);
      offline.off('sync_request', handleSyncRequest);
      offline.off('offline_state_updated', handleOfflineStateUpdated);
    };
  }, [isOnline, isConnected]);

  // Load cached data when going offline
  useEffect(() => {
    if (!isOnline && offlineService.current) {
      offlineService.current.getCachedData('gameState');
    }
  }, [isOnline]);

  // Callback functions
  const sendMessage = useCallback((type: string, payload: any) => {
    if (isOnline && wsService.current) {
      wsService.current.sendMessage({ type, payload });
    } else {
      // Store message for later sending when online
      if (offlineService.current) {
        offlineService.current.cacheData('pendingMessage', { type, payload });
      }
    }
  }, [isOnline]);

  const updateGameState = useCallback((newGameState: Partial<GameState>) => {
    if (isOnline && wsService.current) {
      wsService.current.updateGameState(newGameState);
    } else {
      // Update offline state
      if (offlineService.current) {
        offlineService.current.updateOfflineState(newGameState);
      }
    }
  }, [isOnline]);

  const joinGame = useCallback((playerData: any) => {
    if (isOnline && wsService.current) {
      wsService.current.joinGame(playerData);
    } else {
      // Cache join action for later
      if (offlineService.current) {
        offlineService.current.cacheData('pendingJoin', playerData);
      }
    }
  }, [isOnline]);

  const leaveGame = useCallback((playerId: string) => {
    if (isOnline && wsService.current) {
      wsService.current.leaveGame(playerId);
    } else {
      // Cache leave action for later
      if (offlineService.current) {
        offlineService.current.cacheData('pendingLeave', { playerId });
      }
    }
  }, [isOnline]);

  const sendGameAction = useCallback((action: any) => {
    if (isOnline && wsService.current) {
      wsService.current.sendGameAction(action);
    } else {
      // Process action offline and cache for sync
      if (offlineService.current) {
        offlineService.current.updateOfflineState(action);
        offlineService.current.cacheData('pendingAction', action);
      }
    }
  }, [isOnline]);

  return {
    isOnline,
    isConnected,
    connectionState,
    gameState,
    sendMessage,
    updateGameState,
    joinGame,
    leaveGame,
    sendGameAction
  };
};