import React, { useState } from 'react';
import { useCoinService } from '../../hooks/useCoinService';
import { useMultiplayerSession } from '../../hooks/useMultiplayerSession';
import { MultiplayerModal } from '../multiplayer/MultiplayerModal';
import { getProfileInitials } from '../../utils/nameUtils';
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
  const { isConnected, players } = useMultiplayerSession();
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
          <button 
            className={`nav-home-btn ${!showHomeButton ? 'nav-home-btn-current' : ''}`}
            onClick={showHomeButton ? onHomeClick : undefined}
            aria-label={showHomeButton ? "Go home" : "Games (current page)"}
            disabled={!showHomeButton}
          >
            🏠 Games
          </button>
          <div className="nav-right">
            <div className="nav-coins" title="Your coin balance">
              🪙 {balance.toLocaleString()}
            </div>
            <div className="nav-user">
              {isConnected && players.length > 0 ? (
                // Show all multiplayer players (remove duplicates based on player name)
                players
                  .filter((player, index, array) => 
                    array.findIndex(p => p.name === player.name) === index
                  )
                  .map((player) => (
                    <button
                      key={player.id}
                      className={`nav-profile-btn ${player.name === playerName ? 'nav-profile-btn-current' : 'nav-profile-btn-other'}`}
                      onClick={player.name === playerName ? onProfileClick : undefined}
                      aria-label={player.name === playerName ? `Open profile for ${player.name}` : `Player ${player.name}`}
                      title={player.name === playerName ? `${player.name} - Click to edit profile` : `${player.name} (${player.role})`}
                      disabled={player.name !== playerName}
                    >
                      {getProfileInitials(player.name)}
                    </button>
                  ))
              ) : (
                // Show only current player when not in multiplayer
                <button 
                  className="nav-profile-btn" 
                  onClick={onProfileClick}
                  aria-label={`Open profile for ${playerName}`}
                  title={`${playerName} - Click to edit profile`}
                >
                  {getProfileInitials(playerName)}
                </button>
              )}
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