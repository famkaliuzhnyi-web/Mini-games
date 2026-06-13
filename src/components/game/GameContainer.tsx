import React from 'react';
import { Game2048 } from '../../games/game2048';
import { TicTacToeGame } from '../../games/tic-tac-toe';
import { SudokuGame } from '../../games/sudoku';
import { PingPongGame } from '../../games/ping-pong';
import { SnakeGame } from '../../games/snake';
import { DrawingGame } from '../../games/drawing';
import { Tetris } from '../../games/tetris';
import { IoTScannerGame } from '../../games/iot-scanner';
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
      case 'sudoku':      return <SudokuGame playerId={playerId} />;
      case 'ping-pong':   return <PingPongGame playerId={playerId} />;
      case 'snake':       return <SnakeGame playerId={playerId} />;
      case 'drawing':     return <DrawingGame playerId={playerId} />;
      case 'tetris':      return <Tetris playerId={playerId} />;
      case 'iot-scanner': return <IoTScannerGame playerId={playerId} />;
      default:
        return (
          <div className="game-not-found">
            <h2>🎮 Game Not Found</h2>
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