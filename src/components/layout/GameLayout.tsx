/**
 * GameLayout - Fullscreen layout framework for games
 * Provides slots for game field (fullscreen) and controls/stats (bottom stripe)
 */
import React, { ReactNode } from 'react';
import './GameLayout.css';

export interface GameLayoutSlots {
  gameField: ReactNode;
  stats: ReactNode;
  controls: ReactNode;
  gameInfo?: ReactNode;
}

interface GameLayoutProps {
  slots: GameLayoutSlots;
  className?: string;
}

export const GameLayout: React.FC<GameLayoutProps> = ({ slots, className = '' }) => {
  return (
    <div className={`game-layout ${className}`}>
      {/* Main game field takes up most of the screen */}
      <div className="game-layout__field">
        {slots.gameField}
      </div>
      
      {/* Bottom stripe with all controls and stats */}
      <div className="game-layout__bottom-stripe">
        {slots.gameInfo && (
          <div className="game-layout__info">
            {slots.gameInfo}
          </div>
        )}
        
        <div className="game-layout__stats">
          {slots.stats}
        </div>
        
        <div className="game-layout__controls">
          {slots.controls}
        </div>
      </div>
    </div>
  );
};

export default GameLayout;