import { useEffect } from 'react';
import { useNavigation } from './useNavigation';

/**
 * Custom hook that handles the game session lifecycle.
 * Manages player navigation and game state without WebSocket connectivity.
 * Eliminates code duplication between different page components.
 */
export function useGameSession() {
  const navigation = useNavigation();

  // Basic session management without websocket functionality
  useEffect(() => {
    // Session is now managed locally without remote connections
    console.log('Game session initialized for player:', navigation.playerName);
  }, [navigation.playerName]);

  return navigation;
}