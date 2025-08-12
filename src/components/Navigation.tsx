import React from 'react';
import './Navigation.css';

interface NavigationProps {
  playerName: string;
  showHomeButton?: boolean;
  onHomeClick?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  playerName,
  showHomeButton = false,
  onHomeClick
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
          <span className="nav-user-name">{playerName}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;