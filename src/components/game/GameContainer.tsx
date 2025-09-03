import React from 'react';
import { Game2048GameField, Game2048Stats, Game2048Controls } from '../../games/game2048';
import { TicTacToeGameField, TicTacToeStats, TicTacToeControls } from '../../games/tic-tac-toe';
import { SudokuGameField, SudokuStats, SudokuControls } from '../../games/sudoku';
import { PingPongGame } from '../../games/ping-pong';
import { SnakeGameField, SnakeStats, SnakeControls } from '../../games/snake';
import { DrawingGame } from '../../games/drawing';
import { Tetris } from '../../games/tetris';
import { IoTScannerGame } from '../../games/iot-scanner';
import { MultiplayerWIP } from '../multiplayer/MultiplayerWIP';
import { multiplayerService } from '../../services/MultiplayerService';
import { GAME_INFO } from '../../constants/gameInfo';
import { GameLayout } from '../layout/GameLayout';
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
        return (
          <GameLayout 
            slots={{
              gameField: <Game2048GameField playerId={playerId} />,
              stats: <Game2048Stats playerId={playerId} />,
              controls: <Game2048Controls playerId={playerId} />
            }}
          />
        );
      case 'tic-tac-toe':
        return (
          <GameLayout 
            slots={{
              gameField: <TicTacToeGameField playerId={playerId} />,
              stats: <TicTacToeStats playerId={playerId} />,
              controls: <TicTacToeControls playerId={playerId} />
            }}
          />
        );
      case 'sudoku':
        return (
          <GameLayout 
            slots={{
              gameField: <SudokuGameField playerId={playerId} />,
              stats: <SudokuStats playerId={playerId} />,
              controls: <SudokuControls playerId={playerId} />
            }}
          />
        );
      case 'ping-pong':
        return <PingPongGame playerId={playerId} />;
      case 'snake':
        return (
          <GameLayout 
            slots={{
              gameField: <SnakeGameField playerId={playerId} />,
              stats: <SnakeStats playerId={playerId} />,
              controls: <SnakeControls playerId={playerId} />
            }}
          />
        );
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