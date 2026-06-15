import React from 'react';
import { Game2048 } from '../../games/game2048';
import { TicTacToeGame } from '../../games/tic-tac-toe';
import { SnakeGame } from '../../games/snake';
import './GameContainer.css';

interface GameContainerProps {
  gameId: string;
  playerId: string;
  playerName: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({ gameId, playerId, playerName }) => {
  const renderGame = () => {
    switch (gameId) {
      case 'game2048':    return <Game2048 playerId={playerId} />;
      case 'tic-tac-toe': return <TicTacToeGame playerId={playerId} playerName={playerName} />;
      case 'snake':       return <SnakeGame playerId={playerId} playerName={playerName} />;
      default:
        return (
          <div className="game-not-found">
            <h2>Game Not Found</h2>
            <p>Sorry, the game "{gameId}" is not available.</p>
          </div>
        );
    }
  };

  return (
    <div className={`game-container game-container--${gameId}`}>
      {renderGame()}
    </div>
  );
};

export default GameContainer;
