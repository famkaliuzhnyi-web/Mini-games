import React, { useState } from 'react';
import { useCoinService } from '../../hooks/useCoinService';
import { useSession } from '../../hooks/useSession';
import { SessionPanel } from '../multiplayer/SessionPanel';
import { getProfileInitials } from '../../utils/nameUtils';
import './Navigation.css';

interface NavigationProps {
  playerName: string;
  playerId?: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  onProfileClick?: () => void;
  onNavigateToGame?: (gameId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  playerName,
  playerId = '',
  showHomeButton = false,
  onHomeClick,
  onProfileClick,
}) => {
  const { balance } = useCoinService();
  const session = useSession();
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);

  const allPlayers = [
    ...(session.localPlayer ? [session.localPlayer] : []),
    ...session.peers,
  ];

  const showPlayers = session.isInSession && allPlayers.length > 0;

  return (
    <>
      <nav className="navigation">
        <div className="nav-content">
          <button
            className={`nav-home-btn ${!showHomeButton ? 'nav-home-btn-current' : ''}`}
            onClick={showHomeButton ? onHomeClick : undefined}
            aria-label={showHomeButton ? 'Go home' : 'Games (current page)'}
            disabled={!showHomeButton}
          >
            🏠 Games
          </button>

          <div className="nav-right">
            <div className="nav-coins" title="Your coin balance">
              🪙 {(balance ?? 0).toLocaleString()}
            </div>

            <div className="nav-user">
              {showPlayers ? (
                allPlayers.map(p => (
                  <button
                    key={p.id}
                    className={`nav-profile-btn ${p.id === session.localPlayer?.id ? 'nav-profile-btn-current' : 'nav-profile-btn-other'}`}
                    onClick={p.id === session.localPlayer?.id ? onProfileClick : undefined}
                    aria-label={p.id === session.localPlayer?.id ? `Profile: ${p.name}` : p.name}
                    title={p.name}
                    disabled={p.id !== session.localPlayer?.id}
                  >
                    {getProfileInitials(p.name)}
                  </button>
                ))
              ) : (
                <button
                  className="nav-profile-btn"
                  onClick={onProfileClick}
                  aria-label={`Profile: ${playerName}`}
                  title={playerName}
                >
                  {getProfileInitials(playerName)}
                </button>
              )}

              <button
                className={`nav-multiplayer-btn ${session.isInSession ? 'active' : ''}`}
                onClick={() => setSessionPanelOpen(true)}
                aria-label="Multiplayer session"
                title={session.isInSession ? `Session active (${allPlayers.length} players)` : 'Start a multiplayer session'}
              >
                {session.isInSession ? `👥 ${allPlayers.length}` : '+'}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {sessionPanelOpen && (
        <SessionPanel
          playerName={playerName}
          playerId={playerId}
          onClose={() => setSessionPanelOpen(false)}
        />
      )}
    </>
  );
};

export default Navigation;
