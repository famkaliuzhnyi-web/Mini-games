import React from 'react';
import './Navigation.css';

interface NavigationProps {
  playerName: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
  onProfileClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  playerName,
  showHomeButton = false,
  onHomeClick,
  onProfileClick
}) => {
  return (
    <nav className="navigation">
      <div className="nav-content">
        {showHomeButton && (
          <button className="nav-home-btn" onClick={onHomeClick} aria-label="Go home">
            🏠 Games
          </button>
        )}
        <div className="nav-user">
          <button 
            className="nav-user-name" 
            onClick={onProfileClick}
            aria-label="Open profile"
            title="Click to edit profile"
          >
            {playerName}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;