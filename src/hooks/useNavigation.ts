import { useState, useCallback, useEffect } from 'react';
import { UserService } from '../services/UserService';

export type ViewType = 'name-entry' | 'games-list' | 'game-playing' | 'profile';

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
  showProfile: () => void;
}

export const useNavigation = () => {
  const userService = UserService.getInstance();
  
  // Initialize with saved profile or defaults
  const initializeState = (): NavigationState => {
    const savedProfile = userService.loadProfile();
    if (savedProfile) {
      return {
        currentView: 'games-list',
        currentGame: null,
        playerName: savedProfile.playerName,
        playerId: savedProfile.playerId
      };
    }
    
    return {
      currentView: 'name-entry',
      currentGame: null,
      playerName: '',
      playerId: userService.generatePlayerId()
    };
  };

  const [navigationState, setNavigationState] = useState<NavigationState>(initializeState);

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = userService.loadProfile();
    if (savedProfile && !navigationState.playerName) {
      setNavigationState(prev => ({
        ...prev,
        currentView: 'games-list',
        playerName: savedProfile.playerName,
        playerId: savedProfile.playerId
      }));
    }
  }, [userService, navigationState.playerName]);

  const setPlayerName = useCallback((name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Save to localStorage
    const profile = userService.saveProfile({
      playerName: trimmedName,
      playerId: navigationState.playerId
    });

    setNavigationState(prev => ({
      ...prev,
      playerName: profile.playerName,
      playerId: profile.playerId,
      currentView: 'games-list'
    }));
  }, [navigationState.playerId, userService]);

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

  const showProfile = useCallback(() => {
    setNavigationState(prev => ({
      ...prev,
      currentView: 'profile',
      currentGame: null
    }));
  }, []);

  const actions: NavigationActions = {
    setPlayerName,
    showGamesList,
    playGame,
    goHome,
    showProfile
  };

  return {
    ...navigationState,
    ...actions
  };
};