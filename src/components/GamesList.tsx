import React from 'react';
import './GamesList.css';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category?: string;
}

interface GamesListProps {
  onGameSelect: (gameId: string) => void;
}

const AVAILABLE_GAMES: GameInfo[] = [
  {
    id: 'counter',
    name: 'Counter Game',
    description: 'A simple clicking game with save/load functionality',
    emoji: '🎯',
    category: 'Casual'
  },
  {
    id: 'demo',
    name: 'WebSocket Demo',
    description: 'Test real-time multiplayer features',
    emoji: '🔧',
    category: 'Demo'
  }
];

export const GamesList: React.FC<GamesListProps> = ({ onGameSelect }) => {
  return (
    <div className="games-list">
      <div className="games-list-header">
        <h1>🎮 Choose Your Game</h1>
        <p>Select a game to start playing!</p>
      </div>
      
      <div className="games-grid">
        {AVAILABLE_GAMES.map((game) => (
          <div
            key={game.id}
            className="game-card"
            onClick={() => onGameSelect(game.id)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                onGameSelect(game.id);
              }
            }}
          >
            <div className="game-emoji">{game.emoji}</div>
            <h3 className="game-name">{game.name}</h3>
            <p className="game-description">{game.description}</p>
            {game.category && (
              <span className="game-category">{game.category}</span>
            )}
            <div className="game-play-btn">
              Play Now
            </div>
          </div>
        ))}
      </div>

      <div className="games-list-footer">
        <p className="footer-text">
          More games coming soon! 
          <br />
          <small>All games support automatic save/load functionality.</small>
        </p>
      </div>
    </div>
  );
};

export default GamesList;