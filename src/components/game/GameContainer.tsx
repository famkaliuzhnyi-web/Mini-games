import React from 'react';
import { CounterGame } from '../../games/counter';
import { SudokuGame } from '../../games/sudoku';
import { TetrisGame } from '../../games/tetris';
import { TicTacToeGame } from '../../games/tic-tac-toe';
import { PingPongGame } from '../../games/ping-pong';
import { Game2048 } from '../../games/game2048';
import './GameContainer.css';

interface GameContainerProps {
  gameId: string;
  playerId: string;
  playerName: string;
}

export const GameContainer: React.FC<GameContainerProps> = ({
  gameId,
  playerId
}) => {
  const renderGame = () => {
    switch (gameId) {
      case 'game2048':
        return <Game2048 playerId={playerId} />;
      case 'tetris':
        return <TetrisGame playerId={playerId} />;
      case 'tic-tac-toe':
        return <TicTacToeGame playerId={playerId} />;
      case 'counter':
        return <CounterGame playerId={playerId} />;
      case 'sudoku':
        return <SudokuGame playerId={playerId} />;
      case 'ping-pong':
        return <PingPongGame playerId={playerId} />;
      case 'demo':
        return (
          <div className="demo-game">
            <h2>🔧 WebSocket Demo</h2>
            <p>This is a demo game showcasing WebSocket functionality.</p>
            <div className="demo-features">
              <h3>Features demonstrated:</h3>
              <ul>
                <li>✅ Real-time WebSocket communication</li>
                <li>✅ Offline mode with web workers</li>
                <li>✅ Automatic reconnection</li>
                <li>✅ Data caching for offline use</li>
                <li>✅ Multi-player state synchronization</li>
              </ul>
            </div>
            <div className="demo-note">
              <p><strong>Note:</strong> This demo requires a WebSocket server running on ws://localhost:8080/</p>
            </div>
          </div>
        );
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
    <div className="game-container">
      <main className="game-main">
        {renderGame()}
      </main>
    </div>
  );
};

export default GameContainer;