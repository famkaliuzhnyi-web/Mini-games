import React, { useState } from 'react';
import { useCoinService } from '../../hooks/useCoinService';
import { MultiplayerModal } from '../multiplayer/MultiplayerModal';
import './Navigation.css';

interface NavigationProps {
  playerName: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  onProfileClick?: () => void;
  onNavigateToGame?: (gameId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  playerName,
  showHomeButton = false,
  onHomeClick,
  onProfileClick,
  onNavigateToGame
}) => {
  const { balance } = useCoinService();
  const [isMultiplayerModalOpen, setIsMultiplayerModalOpen] = useState(false);

  const handleMultiplayerClick = () => {
    setIsMultiplayerModalOpen(true);
  };

  const handleCloseMultiplayerModal = () => {
    setIsMultiplayerModalOpen(false);
  };

  return (
    <>
      <nav className="navigation">
        <div className="nav-content">
          {showHomeButton && (
            <button className="nav-home-btn" onClick={onHomeClick} aria-label="Go home">
              🏠 Games
            </button>
          )}
          <div className="nav-right">
            <div className="nav-coins" title="Your coin balance">
              🪙 {balance.toLocaleString()}
            </div>
            <div className="nav-user">
              <button 
                className="nav-user-name" 
                onClick={onProfileClick}
                aria-label="Open profile"
                title="Click to edit profile"
              >
                {playerName}
              </button>
              <button 
                className="nav-multiplayer-btn" 
                onClick={handleMultiplayerClick}
                aria-label="Open multiplayer"
                title="Join or create multiplayer games"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </nav>

      <MultiplayerModal
        isOpen={isMultiplayerModalOpen}
        onClose={handleCloseMultiplayerModal}
        playerName={playerName}
        onNavigateToGame={onNavigateToGame}
      />
    </>
  );
};

export default Navigation;