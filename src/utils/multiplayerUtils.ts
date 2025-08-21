/**
 * Shared Multiplayer Integration Helper
 * 
 * Provides common patterns and utilities for integrating multiplayer functionality
 * into games, reducing code duplication and ensuring consistent behavior.
 */

import { useEffect, useCallback, useRef } from 'react';
import { multiplayerService } from '../services/MultiplayerService';
import type { GameMoveData } from '../types/multiplayer';

export interface MultiplayerGameMove<T = unknown> {
  type: string;
  data: T;
  timestamp: number;
  sequence?: number;
}

export interface MultiplayerIntegrationOptions<T> {
  gameId: string;
  playerId: string;
  isMultiplayer: boolean;
  onReceiveMove: (move: MultiplayerGameMove<T>) => void;
  onPlayerJoin?: (playerId: string) => void;
  onPlayerLeave?: (playerId: string) => void;
  onSessionEnd?: () => void;
  validateMove?: (move: MultiplayerGameMove<T>) => boolean;
  enableMoveSequencing?: boolean;
}

export interface MultiplayerIntegrationReturn<T> {
  sendMove: (moveType: string, moveData: T) => Promise<void>;
  isConnected: boolean;
  playerCount: number;
  currentPlayers: string[];
  moveSequence: number;
}

/**
 * Hook for integrating multiplayer functionality into games
 */
export const useMultiplayerIntegration = <T = unknown>(
  options: MultiplayerIntegrationOptions<T>
): MultiplayerIntegrationReturn<T> => {
  const {
    gameId,
    playerId,
    isMultiplayer,
    onReceiveMove,
    onPlayerJoin,
    onPlayerLeave,
    onSessionEnd,
    validateMove,
    enableMoveSequencing = false
  } = options;

  const moveSequenceRef = useRef(0);
  const receivedSequencesRef = useRef(new Set<number>());

  // Handle incoming game moves
  useEffect(() => {
    if (!isMultiplayer) return;

    const handleGameMove = (data: GameMoveData) => {
      if (data.gameId !== gameId) return;
      if (data.playerId === playerId) return; // Ignore own moves

      try {
        const move: MultiplayerGameMove<T> = JSON.parse(JSON.stringify(data.move));
        
        // Validate move if validator provided
        if (validateMove && !validateMove(move)) {
          console.warn('Invalid multiplayer move received:', move);
          return;
        }

        // Handle move sequencing to prevent duplicates
        if (enableMoveSequencing && move.sequence !== undefined) {
          if (receivedSequencesRef.current.has(move.sequence)) {
            console.warn('Duplicate move sequence received:', move.sequence);
            return;
          }
          receivedSequencesRef.current.add(move.sequence);
          
          // Clean up old sequences (keep last 100)
          if (receivedSequencesRef.current.size > 100) {
            const sequences = Array.from(receivedSequencesRef.current).sort((a, b) => a - b);
            sequences.slice(0, -100).forEach(seq => {
              receivedSequencesRef.current.delete(seq);
            });
          }
        }

        onReceiveMove(move);
      } catch (error) {
        console.error('Error parsing multiplayer move:', error);
      }
    };

    multiplayerService.on('game-move-received', handleGameMove);
    return () => multiplayerService.off('game-move-received', handleGameMove);
  }, [gameId, playerId, isMultiplayer, onReceiveMove, validateMove, enableMoveSequencing]);

  // Handle player join/leave events
  useEffect(() => {
    if (!isMultiplayer) return;

    const handlePlayerConnected = (data: { playerId: string }) => {
      if (data.playerId !== playerId && onPlayerJoin) {
        onPlayerJoin(data.playerId);
      }
    };

    const handlePlayerDisconnected = (data: { playerId: string }) => {
      if (data.playerId !== playerId && onPlayerLeave) {
        onPlayerLeave(data.playerId);
      }
    };

    const handleGameEnded = () => {
      if (onSessionEnd) {
        onSessionEnd();
      }
    };

    multiplayerService.on('player-connected', handlePlayerConnected);
    multiplayerService.on('player-disconnected', handlePlayerDisconnected);
    multiplayerService.on('game-ended', handleGameEnded);

    return () => {
      multiplayerService.off('player-connected', handlePlayerConnected);
      multiplayerService.off('player-disconnected', handlePlayerDisconnected);
      multiplayerService.off('game-ended', handleGameEnded);
    };
  }, [isMultiplayer, playerId, onPlayerJoin, onPlayerLeave, onSessionEnd]);

  // Send move function
  const sendMove = useCallback(async (moveType: string, moveData: T) => {
    if (!isMultiplayer) return;

    const session = multiplayerService.getCurrentSession();
    if (!session) {
      console.warn('No active multiplayer session');
      return;
    }

    try {
      const move: MultiplayerGameMove<T> = {
        type: moveType,
        data: moveData,
        timestamp: Date.now(),
        ...(enableMoveSequencing && { sequence: ++moveSequenceRef.current })
      };

      await multiplayerService.sendGameMove(move as unknown as Record<string, unknown>);
    } catch (error) {
      console.error('Error sending multiplayer move:', error);
    }
  }, [gameId, playerId, isMultiplayer, enableMoveSequencing]);

  // Get connection status
  const isConnected = isMultiplayer && !!multiplayerService.getCurrentSession();
  
  // Get player information
  const session = multiplayerService.getCurrentSession();
  const playerCount = session ? session.players.length : 0;
  const currentPlayers = session ? session.players.map((p: { id: string }) => p.id) : [];

  return {
    sendMove,
    isConnected,
    playerCount,
    currentPlayers,
    moveSequence: moveSequenceRef.current
  };
};

/**
 * Common multiplayer move types
 */
export const MultiplayerMoveTypes = {
  GAME_MOVE: 'game-move',
  GAME_STATE: 'game-state',
  PLAYER_READY: 'player-ready',
  GAME_START: 'game-start',
  GAME_END: 'game-end',
  GAME_PAUSE: 'game-pause',
  GAME_RESUME: 'game-resume',
  SYNC_REQUEST: 'sync-request',
  SYNC_RESPONSE: 'sync-response'
} as const;

/**
 * Utility functions for common multiplayer patterns
 */
export const MultiplayerUtils = {
  /**
   * Creates a standard game move object
   */
  createGameMove: <T>(moveData: T): MultiplayerGameMove<T> => ({
    type: MultiplayerMoveTypes.GAME_MOVE,
    data: moveData,
    timestamp: Date.now()
  }),

  /**
   * Creates a game state sync move
   */
  createStateSyncMove: <T>(gameState: T): MultiplayerGameMove<T> => ({
    type: MultiplayerMoveTypes.GAME_STATE,
    data: gameState,
    timestamp: Date.now()
  }),

  /**
   * Validates move timestamp to prevent replay attacks
   */
  validateMoveTimestamp: (move: MultiplayerGameMove, maxAgeMs: number = 30000): boolean => {
    const now = Date.now();
    const age = now - move.timestamp;
    return age >= 0 && age <= maxAgeMs;
  },

  /**
   * Debounces rapid moves to prevent spam
   */
  createMoveDebouncer: (delayMs: number = 100) => {
    let lastMoveTime = 0;
    
    return (callback: () => void): boolean => {
      const now = Date.now();
      if (now - lastMoveTime >= delayMs) {
        lastMoveTime = now;
        callback();
        return true;
      }
      return false;
    };
  }
};

export default useMultiplayerIntegration;