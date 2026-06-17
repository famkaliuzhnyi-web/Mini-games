import React, { useMemo } from 'react';
import { Blocks, Worm, Hash, Grid3X3, Gamepad2 } from 'lucide-react';
import './GamesList.css';
import packageJson from '../../../package.json';
import { useWindowResize } from '../../hooks/useWindowResize';

export type LayoutMode = 'vertical' | 'horizontal';

export interface GameInfo {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category?: string;
}

interface GamesListProps {
  onGameSelect: (gameId: string) => void;
}

const AVAILABLE_GAMES: GameInfo[] = [
  {
    id: 'tetris',
    name: 'Tetris',
    description: 'Race to 1500 pts — your own board, first to the target wins.',
    icon: <Blocks size={40} />,
    category: 'Arcade',
  },
  {
    id: 'snake',
    name: 'Snake',
    description: 'Every player has their own snake. Eat food, grow long, survive.',
    icon: <Worm size={40} />,
    category: 'Arcade',
  },
  {
    id: 'game2048',
    name: '2048',
    description: 'Chaos mode — everyone swipes, tiles merge! Host controls who plays.',
    icon: <Hash size={40} />,
    category: 'Puzzle',
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    description: 'Two randomly chosen players duel — everyone else watches!',
    icon: <Grid3X3 size={40} />,
    category: 'Strategy',
  },
];

export const GamesList: React.FC<GamesListProps> = ({ onGameSelect }) => {
  const { width, height } = useWindowResize();

  const layoutMode: LayoutMode = useMemo(() => {
    return width / height > 1 ? 'horizontal' : 'vertical';
  }, [width, height]);

  return (
    <div className={`games-list games-list--${layoutMode}`}>
      <div className="games-list-header">
        <Gamepad2 size={28} className="games-list-header-icon" />
        <h1>Choose Your Game</h1>
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
              if (e.key === 'Enter' || e.key === ' ') onGameSelect(game.id);
            }}
          >
            <div className="game-icon">{game.icon}</div>
            <h3 className="game-name">{game.name}</h3>
            <p className="game-description">{game.description}</p>
            {game.category && (
              <span className="game-category">{game.category}</span>
            )}
            <div className="game-play-btn">Play Now</div>
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
