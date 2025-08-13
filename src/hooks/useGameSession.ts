import { useEffect } from 'react';
import { useNavigation } from './useNavigation';
import { useGameConnection } from './useGameConnection';

/**
 * Custom hook that handles the game session lifecycle.
 * Automatically joins/leaves games when player authentication state changes.
 * Eliminates code duplication between different page components.
 */
export function useGameSession() {
  const navigation = useNavigation();
  const { joinGame, leaveGame } = useGameConnection();

  // Join/leave game when player name changes
  useEffect(() => {
    if (navigation.playerName) {
      joinGame({
        playerId: navigation.playerId,
        name: navigation.playerName,
        joinedAt: new Date().toISOString()
      });
    }

    return () => {
      if (navigation.playerName) {
        leaveGame(navigation.playerId);
      }
    };
  }, [navigation.playerName, navigation.playerId, joinGame, leaveGame]);

  return navigation;
}