import React from 'react';
import { Game2048 } from '../../games/game2048';
import { TicTacToeGame } from '../../games/tic-tac-toe';
import { SudokuGame } from '../../games/sudoku';
import { PingPongGame } from '../../games/ping-pong';
import { SnakeGame } from '../../games/snake';
import { DrawingGame } from '../../games/drawing';
import { Tetris } from '../../games/tetris';
import { IoTScannerGame } from '../../games/iot-scanner';
import { MultiplayerWIP } from '../multiplayer/MultiplayerWIP';
import { multiplayerService } from '../../services/MultiplayerService';
import { GAME_INFO } from '../../constants/gameInfo';
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
  // Check if we're in a multiplayer session
  const currentSession = multiplayerService.getCurrentSession();
  const isInMultiplayerSession = currentSession !== null;
  
  // Get game info
  const gameInfo = GAME_INFO[gameId];
  
  // Render the original integrated game components instead of slots system
  const renderGame = () => {
    // If in multiplayer session and game doesn't support multiplayer, show WIP message
    if (isInMultiplayerSession && gameInfo && !gameInfo.hasMultiplayerSupport) {
      return <MultiplayerWIP gameId={gameId} gameName={gameInfo.name} />;
    }
    
    switch (gameId) {
      case 'game2048':
        return <Game2048 playerId={playerId} />;
      case 'tic-tac-toe':
        return <TicTacToeGame playerId={playerId} />;
      case 'sudoku':
        return <SudokuGame playerId={playerId} />;
      case 'ping-pong':
        return <PingPongGame playerId={playerId} />;
      case 'snake':
        return <SnakeGame playerId={playerId} />;
      case 'drawing':
        return <DrawingGame playerId={playerId} />;
      case 'tetris':
        return <Tetris playerId={playerId} />;
      case 'iot-scanner':
        return <IoTScannerGame playerId={playerId} />;
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