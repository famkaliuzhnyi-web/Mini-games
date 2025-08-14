/**
 * Snake Multiplayer Integration - Handles multiplayer snake game logic
 */

import { useEffect, useCallback } from 'react';
import { multiplayerService } from '../../services/MultiplayerService';
import type { SnakeAction, Direction } from './types';

interface SnakeMultiplayerHookProps {
  playerId: string;
  dispatch: (action: SnakeAction) => void;
  isMultiplayer: boolean;
}

export function useSnakeMultiplayer({ 
  playerId, 
  dispatch, 
  isMultiplayer 
}: SnakeMultiplayerHookProps) {
  // Handle incoming multiplayer moves
  const handleGameMoveReceived = useCallback((data: unknown) => {
    const moveData = data as { 
      gameId: string; 
      playerId: string; 
      move: { direction: Direction }; 
    };
    
    if (moveData.gameId === 'snake' && moveData.playerId !== playerId) {
      dispatch({ 
        type: 'CHANGE_DIRECTION', 
        playerId: moveData.playerId, 
        direction: moveData.move.direction 
      });
    }
  }, [playerId, dispatch]);

  // Handle player connections
  const handlePlayerConnected = useCallback((data: unknown) => {
    const playerData = data as { player: { id: string; name: string } };
    if (playerData.player.id !== playerId) {
      dispatch({ 
        type: 'ADD_PLAYER', 
        playerId: playerData.player.id, 
        name: playerData.player.name 
      });
    }
  }, [playerId, dispatch]);

  // Handle player disconnections
  const handlePlayerDisconnected = useCallback((data: unknown) => {
    const playerData = data as { playerId: string };
    if (playerData.playerId !== playerId) {
      dispatch({ 
        type: 'REMOVE_PLAYER', 
        playerId: playerData.playerId 
      });
    }
  }, [playerId, dispatch]);

  // Set up multiplayer event listeners
  useEffect(() => {
    if (isMultiplayer && multiplayerService.isConnected()) {
      multiplayerService.on('game-move-received', handleGameMoveReceived);
      multiplayerService.on('player-connected', handlePlayerConnected);
      multiplayerService.on('player-disconnected', handlePlayerDisconnected);

      return () => {
        multiplayerService.off('game-move-received', handleGameMoveReceived);
        multiplayerService.off('player-connected', handlePlayerConnected);
        multiplayerService.off('player-disconnected', handlePlayerDisconnected);
      };
    }
  }, [isMultiplayer, handleGameMoveReceived, handlePlayerConnected, handlePlayerDisconnected]);

  // Send move to other players
  const sendMoveToOthers = useCallback(async (direction: Direction) => {
    if (isMultiplayer && multiplayerService.isConnected()) {
      try {
        await multiplayerService.sendGameMove({ direction });
      } catch (error) {
        console.error('Failed to send move:', error);
      }
    }
  }, [isMultiplayer]);

  return {
    sendMoveToOthers
  };
}