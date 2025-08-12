import { useState, useCallback } from 'react';

export type ViewType = 'name-entry' | 'games-list' | 'game-playing';

export interface NavigationState {
  currentView: ViewType;
  currentGame: string | null;
  playerName: string;
  playerId: string;
}

export interface NavigationActions {
  setPlayerName: (name: string) => void;
  showGamesList: () => void;
  playGame: (gameId: string) => void;
  goHome: () => void;
}

export const useNavigation = () => {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    currentView: 'name-entry',
    currentGame: null,
    playerName: '',
    playerId: `player_${Math.random().toString(36).substr(2, 9)}`
  });

  const setPlayerName = useCallback((name: string) => {
    setNavigationState(prev => ({
      ...prev,
      playerName: name,
      currentView: 'games-list'
    }));
  }, []);

  const showGamesList = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      currentView: 'games-list',
      currentGame: null
    }));
  }, []);

  const playGame = useCallback((gameId: string) => {
    setNavigationState(prev => ({
      ...prev,
      currentView: 'game-playing',
      currentGame: gameId
    }));
  }, []);

  const goHome = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      currentView: 'games-list',
      currentGame: null
    }));
  }, []);

  const actions: NavigationActions = {
    setPlayerName,
    showGamesList,
    playGame,
    goHome
  };

  return {
    ...navigationState,
    ...actions
  };
};