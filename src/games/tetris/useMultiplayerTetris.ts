/**
 * Hook for multiplayer Tetris functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { multiplayerService } from '../../services/MultiplayerService';
import type { GameSession } from '../../types/multiplayer';
import type { TetrisAction, MultiplayerGameState, TetrisPlayer } from './types';
import { generateNextPieces, createInitialStats, createPlayerColumns } from './logic';

interface UseMultiplayerTetrisOptions {
  onAction?: (action: TetrisAction) => void;
  playerId?: string;
  playerName?: string;
}

export function useMultiplayerTetris({
  onAction,
  playerId = '',
  playerName = 'Player'
}: UseMultiplayerTetrisOptions) {
  const [session, setSession] = useState<GameSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [multiplayerState, setMultiplayerState] = useState<MultiplayerGameState | null>(null);

  const updateSessionState = useCallback(() => {
    const currentSession = multiplayerService.getCurrentSession();
    setSession(currentSession);
    setIsHost(multiplayerService.isHost());
  }, []);

  const createMultiplayerSession = useCallback(async () => {
    try {
      const session = await multiplayerService.createSession({
        gameId: 'tetris',
        maxPlayers: 4,
        hostName: playerName
      });

      // Initialize multiplayer state for Tetris
      const playerColumns = createPlayerColumns(1);
      const hostPlayer: TetrisPlayer = {
        id: playerId,
        name: playerName,
        columnStart: playerColumns[0].columnStart,
        columnEnd: playerColumns[0].columnEnd,
        activePiece: null,
        ghostPiece: null,
        holdPiece: null,
        nextPieces: generateNextPieces(),
        canHold: true,
        stats: createInitialStats()
      };

      const multiplayerState: MultiplayerGameState = {
        isMultiplayer: true,
        players: [hostPlayer],
        currentPlayerId: playerId,
        gridWidth: 10 // Will expand as players join
      };

      setMultiplayerState(multiplayerState);
      setSession(session);
      setIsHost(true);
    } catch (error) {
      console.error('Failed to create multiplayer session:', error);
    }
  }, [playerId, playerName]);

  const joinMultiplayerSession = useCallback(async (sessionId: string) => {
    try {
      const session = await multiplayerService.joinSession({
        sessionId,
        playerName
      });

      setSession(session);
      setIsHost(false);
      // Multiplayer state will be received from host
    } catch (error) {
      console.error('Failed to join multiplayer session:', error);
    }
  }, [playerName]);

  const leaveMultiplayerSession = useCallback(async () => {
    try {
      await multiplayerService.leaveSession();
      setSession(null);
      setIsHost(false);
      setMultiplayerState(null);
    } catch (error) {
      console.error('Failed to leave multiplayer session:', error);
    }
  }, []);

  const sendMove = useCallback(async (action: TetrisAction) => {
    if (!session) return;

    try {
      await multiplayerService.sendGameMove({
        action,
        playerId
      });
    } catch (error) {
      console.error('Failed to send multiplayer move:', error);
    }
  }, [session, playerId]);

  const addPlayerToGame = useCallback((newPlayerId: string, newPlayerName: string) => {
    if (!multiplayerState || !isHost) return;

    const existingPlayer = multiplayerState.players.find(p => p.id === newPlayerId);
    if (existingPlayer) return; // Player already exists

    const playerCount = multiplayerState.players.length + 1;
    const playerColumns = createPlayerColumns(playerCount);
    const newGridWidth = playerCount * 10;

    // Update existing players' column assignments
    const updatedPlayers = multiplayerState.players.map((player, index) => ({
      ...player,
      columnStart: playerColumns[index].columnStart,
      columnEnd: playerColumns[index].columnEnd
    }));

    // Create new player
    const newPlayer: TetrisPlayer = {
      id: newPlayerId,
      name: newPlayerName,
      columnStart: playerColumns[playerCount - 1].columnStart,
      columnEnd: playerColumns[playerCount - 1].columnEnd,
      activePiece: null,
      ghostPiece: null,
      holdPiece: null,
      nextPieces: generateNextPieces(),
      canHold: true,
      stats: createInitialStats()
    };

    const updatedMultiplayerState: MultiplayerGameState = {
      ...multiplayerState,
      players: [...updatedPlayers, newPlayer],
      gridWidth: newGridWidth
    };

    setMultiplayerState(updatedMultiplayerState);

    // Broadcast updated state
    multiplayerService.sendGameState({
      multiplayerState: updatedMultiplayerState
    });
  }, [multiplayerState, isHost]);

  // Set up event listeners
  useEffect(() => {
    const handleGameMoveReceived = (data: any) => {
      if (data.action && onAction) {
        onAction(data.action);
      }
    };

    const handleGameStateUpdated = (data: any) => {
      if (data.multiplayerState) {
        setMultiplayerState(data.multiplayerState);
      }
    };

    const handlePlayerConnected = () => {
      updateSessionState();
    };

    const handlePlayerDisconnected = () => {
      updateSessionState();
    };

    multiplayerService.on('game-move-received', handleGameMoveReceived);
    multiplayerService.on('game-state-updated', handleGameStateUpdated);
    multiplayerService.on('player-connected', handlePlayerConnected);
    multiplayerService.on('player-disconnected', handlePlayerDisconnected);

    return () => {
      multiplayerService.off('game-move-received', handleGameMoveReceived);
      multiplayerService.off('game-state-updated', handleGameStateUpdated);
      multiplayerService.off('player-connected', handlePlayerConnected);
      multiplayerService.off('player-disconnected', handlePlayerDisconnected);
    };
  }, [onAction, updateSessionState]);

  return {
    session,
    isHost,
    isConnected: session !== null,
    multiplayerState,
    createMultiplayerSession,
    joinMultiplayerSession,
    leaveMultiplayerSession,
    sendMove,
    addPlayerToGame,
    sessionUrl: session ? multiplayerService.getSessionUrl() : null
  };
}