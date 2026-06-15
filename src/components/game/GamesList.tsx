import React, { useMemo } from 'react';
import './GamesList.css';
import packageJson from '../../../package.json';
import { useWindowResize } from '../../hooks/useWindowResize';

export type LayoutMode = 'vertical' | 'horizontal';

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
    id: 'snake',
    name: 'Snake',
    description: 'Every player has their own snake. Eat food, grow long, survive.',
    emoji: '🐍',
    category: 'Arcade'
  },
  {
    id: 'game2048',
    name: '2048',
    description: 'Chaos mode — everyone swipes, tiles merge! Host controls who plays.',
    emoji: '🔢',
    category: 'Puzzle'
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Two randomly chosen players duel — everyone else watches!',
    emoji: '⭕',
    category: 'Strategy'
  },
];

export const GamesList: React.FC<GamesListProps> = ({ onGameSelect }) => {
  const { width, height } = useWindowResize();
  
  // Determine layout mode based on screen proportions (aspect ratio)
  // Horizontal for landscape orientation (width > height), vertical for portrait orientation (width <= height)
  const layoutMode: LayoutMode = useMemo(() => {
    const aspectRatio = width / height;
    return aspectRatio > 1 ? 'horizontal' : 'vertical';
  }, [width, height]);

  return (
    <div className={`games-list games-list--${layoutMode}`}>
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
          <br />
          <small className="version-info">Version {packageJson.version}</small>
        </p>
      </div>
    </div>
  );
};

export default GamesList;