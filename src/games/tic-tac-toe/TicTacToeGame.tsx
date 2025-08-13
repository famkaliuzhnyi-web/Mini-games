/**
 * Tic-Tac-Toe Game React Component
 */
import React from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useCoinService } from '../../hooks/useCoinService';
import { TicTacToeGameController } from './controller';
import type { TicTacToeGameData } from './types';
import { 
  isValidMove, 
  makeMove, 
  getGameStatusWithCombination,
  getNextPlayer, 
  createEmptyBoard 
} from './gameLogic';
import './TicTacToeGame.css';

interface TicTacToeGameProps {
  playerId: string;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ playerId }) => {
  const controller = new TicTacToeGameController();
  const { awardGameCompletion, awardGamePlay } = useCoinService();
  
  // State for collapsible save section
  const [saveExpanded, setSaveExpanded] = React.useState(false);
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  } = useGameSave<TicTacToeGameData>({
    gameId: 'tic-tac-toe',
    playerId,
    gameConfig: controller.config,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  /**
   * Handle cell click to make a move
   */
  const handleCellClick = (row: number, col: number) => {
    // Don't allow moves if game is over
    if (gameState.data.gameStatus !== 'playing') {
      return;
    }

    // Check if move is valid
    if (!isValidMove(gameState.data.board, row, col)) {
      return;
    }

    try {
      // Make the move
      const newBoard = makeMove(gameState.data.board, row, col, gameState.data.currentPlayer);
      const { status: newGameStatus, winningCombination } = getGameStatusWithCombination(newBoard);
      const newPlayer = getNextPlayer(gameState.data.currentPlayer);
      
      // Create move record
      const move = {
        row,
        col,
        player: gameState.data.currentPlayer,
        timestamp: new Date().toISOString()
      };

      // Calculate score (moves made)
      const newScore = gameState.data.moveHistory.length + 1;

      // Update game state
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          board: newBoard,
          currentPlayer: newPlayer,
          gameStatus: newGameStatus,
          moveHistory: [...gameState.data.moveHistory, move],
          winningCombination
        },
        score: newScore,
        isComplete: newGameStatus !== 'playing',
        lastModified: new Date().toISOString()
      });

      // Award coins when game completes
      if (newGameStatus !== 'playing' && gameState.data.gameStatus === 'playing') {
        // Award base completion reward
        let reward = 5; // Base reward for completing a game
        
        if (newGameStatus === 'X-wins' || newGameStatus === 'O-wins') {
          reward += 10; // Bonus for winning
        } else if (newGameStatus === 'tie') {
          reward += 3; // Smaller bonus for tie
        }
        
        awardGameCompletion('tic-tac-toe', reward);
      }
    } catch (error) {
      console.error('Error making move:', error);
    }
  };

  /**
   * Start a new game
   */
  const handleNewGame = () => {
    const currentStats = gameState.data;

    // Update statistics if previous game was completed
    if (gameState.data.gameStatus !== 'playing') {
      const newStats = {
        gamesPlayed: currentStats.gamesPlayed + 1,
        xWins: currentStats.xWins + (gameState.data.gameStatus === 'X-wins' ? 1 : 0),
        oWins: currentStats.oWins + (gameState.data.gameStatus === 'O-wins' ? 1 : 0),
        ties: currentStats.ties + (gameState.data.gameStatus === 'tie' ? 1 : 0)
      };

      setGameState({
        ...gameState,
        data: {
          board: createEmptyBoard(),
          currentPlayer: 'X',
          gameStatus: 'playing',
          moveHistory: [],
          winningCombination: undefined,
          gameMode: 'single-player',
          multiplayer: {
            isMultiplayer: false
          },
          ...newStats
        },
        score: 0,
        isComplete: false,
        lastModified: new Date().toISOString()
      });
      
      // Award small play reward for starting a new game
      awardGamePlay('tic-tac-toe', 1);
    } else {
      // No game to complete, just reset
      setGameState({
        ...gameState,
        data: {
          board: createEmptyBoard(),
          currentPlayer: 'X',
          gameStatus: 'playing',
          moveHistory: [],
          winningCombination: undefined,
          gameMode: 'single-player',
          multiplayer: {
            isMultiplayer: false
          },
          gamesPlayed: currentStats.gamesPlayed,
          xWins: currentStats.xWins,
          oWins: currentStats.oWins,
          ties: currentStats.ties
        },
        score: 0,
        isComplete: false,
        lastModified: new Date().toISOString()
      });
      
      // Award small play reward for starting a game
      awardGamePlay('tic-tac-toe', 1);
    }
  };

  /**
   * Get cell display content
   */
  const getCellContent = (row: number, col: number): string => {
    const cellValue = gameState.data.board[row][col];
    return cellValue || '';
  };

  /**
   * Get cell CSS class based on state
   */
  const getCellClass = (row: number, col: number): string => {
    const baseClass = 'tic-tac-toe-cell';
    const cellValue = gameState.data.board[row][col];
    const isEmpty = cellValue === null;
    const isPlayable = gameState.data.gameStatus === 'playing' && isEmpty;
    const isWinningCell = isPartOfWinningCombination(row, col);
    
    const classes = [baseClass];
    
    if (isPlayable) classes.push('playable');
    if (isEmpty) classes.push('empty');
    if (!isEmpty) classes.push('filled');
    if (isWinningCell) classes.push('winning-cell');
    if (cellValue === 'X') classes.push('x-mark');
    if (cellValue === 'O') classes.push('o-mark');
    
    return classes.join(' ');
  };

  /**
   * Check if a cell is part of the winning combination
   */
  const isPartOfWinningCombination = (row: number, col: number): boolean => {
    if (!gameState.data.winningCombination) return false;
    
    return gameState.data.winningCombination.positions.some(
      ([winRow, winCol]) => winRow === row && winCol === col
    );
  };

  /**
   * Get game status message
   */
  const getStatusMessage = (): string => {
    switch (gameState.data.gameStatus) {
      case 'X-wins':
        return '🎉 X Wins!';
      case 'O-wins':
        return '🎉 O Wins!';
      case 'tie':
        return '🤝 It\'s a Tie!';
      case 'playing':
        return `${gameState.data.currentPlayer}'s Turn`;
      default:
        return '';
    }
  };

  /**
   * Handle manual save with user feedback
   */
  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  /**
   * Handle manual load with user feedback
   */
  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

  /**
   * Handle save deletion with confirmation
   */
  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game? This cannot be undone.')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="tic-tac-toe-loading">
        <h2>Loading Tic-Tac-Toe...</h2>
      </div>
    );
  }

  return (
    <div className="tic-tac-toe-game">
      <div className="tic-tac-toe-header">
        <h2>{controller.config.name}</h2>
        <p>{controller.config.description}</p>
      </div>
      
      {/* Game Status */}
      <div className="tic-tac-toe-status">
        <div className={`tic-tac-toe-status-message ${gameState.data.gameStatus === 'playing' ? 'playing' : 'winner'}`}>
          {getStatusMessage()}
        </div>
        
        {/* Game Statistics */}
        <div className="tic-tac-toe-stats">
          <span>Games: {gameState.data.gamesPlayed}</span>
          <span>X: {gameState.data.xWins}</span>
          <span>O: {gameState.data.oWins}</span>
          <span>Ties: {gameState.data.ties}</span>
        </div>
      </div>

      {/* Game Board */}
      <div className="tic-tac-toe-board-container">
        <div className="tic-tac-toe-board">
          {gameState.data.board.map((row, rowIndex) =>
            row.map((_, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
              >
                {getCellContent(rowIndex, colIndex)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Game Controls */}
      <div className="tic-tac-toe-controls">
        <button 
          onClick={handleNewGame}
          className="tic-tac-toe-new-game-btn"
        >
          New Game
        </button>
      </div>

      {/* Collapsible Save Management */}
      <div className={`tic-tac-toe-save-section ${saveExpanded ? 'expanded' : 'collapsed'}`}>
        <div className="tic-tac-toe-save-header" onClick={() => setSaveExpanded(!saveExpanded)}>
          <h3>Save Management</h3>
          <span className={`tic-tac-toe-save-toggle ${saveExpanded ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        
        {saveExpanded && (
          <div className="tic-tac-toe-save-content">
            <div className="tic-tac-toe-autosave-toggle">
              <input
                type="checkbox"
                id="auto-save-toggle"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
              />
              <label htmlFor="auto-save-toggle">
                Auto-save enabled (saves every {controller.config.autoSaveIntervalMs / 1000}s)
              </label>
            </div>

            <div className="tic-tac-toe-save-status">
              {hasSave ? 
                (lastSaveEvent?.action === 'auto-save' && 
                 (Date.now() - new Date(lastSaveEvent.timestamp).getTime()) < 5000) ? 
                  '💾 Save available (recently saved)' : 
                  '💾 Save available' 
                : '❌ No save data'
              }
              {autoSaveEnabled && gameState.score && gameState.score > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-success, #4CAF50)', marginTop: '0.5rem' }}>
                  ⚡ Auto-save active - moves saved instantly
                </div>
              )}
            </div>

            <div className="tic-tac-toe-save-buttons">
              <button 
                onClick={handleManualSave}
                className="tic-tac-toe-save-btn save"
              >
                Manual Save
              </button>
              
              <button 
                onClick={handleManualLoad}
                disabled={!hasSave}
                className="tic-tac-toe-save-btn load"
              >
                Load Game
              </button>
              
              <button 
                onClick={handleDropSave}
                disabled={!hasSave}
                className="tic-tac-toe-save-btn delete"
              >
                Delete Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '1rem',
          background: lastSaveEvent.success ? 
            'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          border: `1px solid ${lastSaveEvent.success ? 'var(--color-success, #4CAF50)' : 'var(--color-error, #f44336)'}`,
          borderRadius: '12px',
          fontSize: '0.9rem',
          fontWeight: '500',
          color: lastSaveEvent.success ? 'var(--color-success, #4CAF50)' : 'var(--color-error, #f44336)',
          animation: 'fadeIn 0.3s ease'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small style={{ opacity: 0.8 }}>
            {new Date(lastSaveEvent.timestamp).toLocaleString()}
          </small>
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame;