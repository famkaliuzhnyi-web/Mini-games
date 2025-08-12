import { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const location = useLocation();
  
  // Determine current view based on URL
  const getCurrentView = useCallback((): ViewType => {
    if (location.pathname === '/profile') return 'profile';
    if (location.pathname.startsWith('/game/') && gameId) return 'game-playing';
    
    // Check if user has a saved profile to determine if they should see games list or name entry
    const savedProfile = userService.loadProfile();
    return savedProfile ? 'games-list' : 'name-entry';
  }, [location.pathname, gameId, userService]);
  
  // Initialize with saved profile or defaults
  const initializeState = (): NavigationState => {
    const savedProfile = userService.loadProfile();
    if (savedProfile) {
      return {
        currentView: getCurrentView(),
        currentGame: gameId || null,
        playerName: savedProfile.playerName,
        playerId: savedProfile.playerId
      };
    }
    
    return {
      currentView: 'name-entry',
      currentGame: gameId || null,
      playerName: '',
      playerId: userService.generatePlayerId()
    };
  };

  const [navigationState, setNavigationState] = useState<NavigationState>(initializeState);

  // Update state when URL changes
  useEffect(() => {
    setNavigationState(prev => ({
      ...prev,
      currentView: getCurrentView(),
      currentGame: gameId || null
    }));
  }, [location.pathname, gameId, getCurrentView]);

  // Load saved profile on mount
  useEffect(() => {
    const savedProfile = userService.loadProfile();
    if (savedProfile && !navigationState.playerName) {
      setNavigationState(prev => ({
        ...prev,
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
      playerId: profile.playerId
    }));

    // Navigate to games list after setting name
    navigate('/');
  }, [navigationState.playerId, userService, navigate]);

  const showGamesList = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const playGame = useCallback((gameId: string) => {
    navigate(`/game/${gameId}`);
  }, [navigate]);

  const goHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const showProfile = useCallback(() => {
    navigate('/profile');
  }, [navigate]);

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