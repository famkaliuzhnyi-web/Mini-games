/**
 * Hook for managing multiplayer session state
 */

import { useState, useEffect } from 'react';
import { multiplayerService } from '../services/MultiplayerService';
import type { GameSession } from '../types/multiplayer';

export function useMultiplayerSession() {
  const [session, setSession] = useState<GameSession | null>(null);
  const [isHost, setIsHost] = useState(false);

  const updateSessionState = () => {
    const currentSession = multiplayerService.getCurrentSession();
    setSession(currentSession);
    setIsHost(multiplayerService.isHost());
  };

  useEffect(() => {
    // Get initial session state
    updateSessionState();

    // Set up event listeners for session changes
    const handleSessionCreated = () => {
      updateSessionState();
    };

    const handleSessionJoined = () => {
      updateSessionState();
    };

    const handlePlayerConnected = () => {
      updateSessionState();
    };

    const handlePlayerDisconnected = () => {
      updateSessionState();
    };

    const handlePlayerReadyChanged = () => {
      updateSessionState();
    };

    // Subscribe to events
    multiplayerService.on('session-created', handleSessionCreated);
    multiplayerService.on('session-joined', handleSessionJoined);
    multiplayerService.on('player-connected', handlePlayerConnected);
    multiplayerService.on('player-disconnected', handlePlayerDisconnected);
    multiplayerService.on('player-ready-changed', handlePlayerReadyChanged);

    // Poll for changes every 3 seconds as a fallback
    const pollInterval = setInterval(() => {
      const currentSession = multiplayerService.getCurrentSession();
      if (currentSession !== session) {
        updateSessionState();
      }
    }, 3000);

    return () => {
      // Clean up event listeners
      multiplayerService.off('session-created', handleSessionCreated);
      multiplayerService.off('session-joined', handleSessionJoined);
      multiplayerService.off('player-connected', handlePlayerConnected);
      multiplayerService.off('player-disconnected', handlePlayerDisconnected);
      multiplayerService.off('player-ready-changed', handlePlayerReadyChanged);
      clearInterval(pollInterval);
    };
  }, [session]);

  return {
    session,
    isHost,
    isConnected: session !== null,
    players: session?.players || []
  };
}