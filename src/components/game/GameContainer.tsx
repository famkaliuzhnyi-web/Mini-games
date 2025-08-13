import React from 'react';
import { CounterGame } from '../../games/counter';
import { SudokuGame } from '../../games/sudoku';
import { TetrisGame } from '../../games/tetris';
import { TicTacToeGame } from '../../games/tic-tac-toe';
import { PingPongGame } from '../../games/ping-pong';
import { Game2048 } from '../../games/game2048';
import { Game2048GameField, Game2048Stats, Game2048Controls } from '../../games/game2048/SlotComponents';
import { TetrisGameField, TetrisStats, TetrisControls } from '../../games/tetris/SlotComponents';
import { GameLayout } from '../layout/GameLayout';
import type { GameLayoutSlots } from '../layout/GameLayout';
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
  // Get game info for different games
  const getGameInfo = () => {
    switch (gameId) {
      case 'game2048':
        return {
          name: '2048',
          description: 'Classic number puzzle - combine tiles to reach 2048!'
        };
      case 'tetris':
        return {
          name: 'Tetris',
          description: 'Classic falling blocks puzzle game'
        };
      case 'tic-tac-toe':
        return {
          name: 'Tic Tac Toe',
          description: 'Classic strategy game for two players'
        };
      case 'counter':
        return {
          name: 'Counter',
          description: 'Simple counter game'
        };
      case 'sudoku':
        return {
          name: 'Sudoku',
          description: 'Number placement puzzle game'
        };
      case 'ping-pong':
        return {
          name: 'Ping Pong',
          description: 'Classic arcade paddle game'
        };
      case 'demo':
        return {
          name: 'WebSocket Demo',
          description: 'Demo showcasing WebSocket functionality'
        };
      default:
        return {
          name: 'Unknown Game',
          description: 'Game not found'
        };
    }
  };

  const renderGameInSlots = (): GameLayoutSlots => {
    const gameInfo = getGameInfo();

    switch (gameId) {
      case 'game2048':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <Game2048GameField playerId={playerId} />,
          stats: <Game2048Stats playerId={playerId} />,
          controls: <Game2048Controls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
              <p>{gameInfo.description}</p>
            </div>
          )
        };
      case 'tetris':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <TetrisGameField playerId={playerId} />,
          stats: <TetrisStats playerId={playerId} />,
          controls: <TetrisControls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
              <p>{gameInfo.description}</p>
            </div>
          )
        };
      case 'tic-tac-toe':
      case 'counter':
      case 'sudoku':
      case 'ping-pong':
        // For other games, use legacy approach until they are updated
        return {
          gameField: (
            <div className="fullscreen-game-field">
              {renderLegacyGame()}
            </div>
          ),
          stats: <div className="game-stats-placeholder">Stats coming soon</div>,
          controls: <div className="game-controls-placeholder">Controls coming soon</div>,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
              <p>{gameInfo.description}</p>
            </div>
          )
        };
      case 'demo':
        return {
          gameField: (
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
          ),
          stats: <div>WebSocket Status: Disconnected</div>,
          controls: <div>Demo controls</div>
        };
      default:
        return {
          gameField: (
            <div className="game-not-found">
              <h2>🎮 Game Not Found</h2>
              <p>Sorry, the game "{gameId}" is not available.</p>
            </div>
          ),
          stats: <div></div>,
          controls: <div></div>
        };
    }
  };

  const renderLegacyGame = () => {
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
      default:
        return null;
    }
  };

  const gameSlots = renderGameInSlots();

  return <GameLayout slots={gameSlots} className={`game-container--${gameId}`} />;
};

export default GameContainer;