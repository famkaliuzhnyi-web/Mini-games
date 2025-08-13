import React from 'react';
import { Game2048GameField, Game2048Stats, Game2048Controls } from '../../games/game2048/SlotComponents';
import { TetrisGameField, TetrisStats, TetrisControls } from '../../games/tetris/SlotComponents';
import { TicTacToeGameField, TicTacToeStats, TicTacToeControls } from '../../games/tic-tac-toe/SlotComponents';
import { CounterGameField, CounterStats, CounterControls } from '../../games/counter/SlotComponents';
import { SudokuGameField, SudokuStats, SudokuControls } from '../../games/sudoku/SlotComponents';
import { PingPongGameField, PingPongStats, PingPongControls } from '../../games/ping-pong/SlotComponents';
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
            </div>
          )
        };
      case 'tic-tac-toe':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <TicTacToeGameField playerId={playerId} />,
          stats: <TicTacToeStats playerId={playerId} />,
          controls: <TicTacToeControls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
            </div>
          )
        };
      case 'counter':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <CounterGameField playerId={playerId} />,
          stats: <CounterStats playerId={playerId} />,
          controls: <CounterControls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
            </div>
          )
        };
      case 'sudoku':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <SudokuGameField playerId={playerId} />,
          stats: <SudokuStats playerId={playerId} />,
          controls: <SudokuControls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
            </div>
          )
        };
      case 'ping-pong':
        // Use the proper slots system with dedicated slot components
        return {
          gameField: <PingPongGameField playerId={playerId} />,
          stats: <PingPongStats playerId={playerId} />,
          controls: <PingPongControls playerId={playerId} />,
          gameInfo: (
            <div>
              <h2>{gameInfo.name}</h2>
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
          controls: <div>Demo controls</div>,
          gameInfo: (
            <div>
              <h2>WebSocket Demo</h2>
            </div>
          )
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

  // Remove unused renderLegacyGame function as all games are now platformized
  const gameSlots = renderGameInSlots();

  return <GameLayout slots={gameSlots} className={`game-container--${gameId}`} />;
};

export default GameContainer;