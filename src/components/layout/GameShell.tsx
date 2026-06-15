import React from 'react';
import './GameShell.css';

interface GameShellProps {
  children: React.ReactNode;
}

/**
 * Full-height container for game content (sits below the Navigation bar).
 * Provides the dark stage and overflow control so every game starts from
 * the same baseline without its own layout concerns.
 */
export const GameShell: React.FC<GameShellProps> = ({ children }) => (
  <div className="game-shell">
    {children}
  </div>
);

export default GameShell;
