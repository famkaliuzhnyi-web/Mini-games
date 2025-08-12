/**
 * Tic-Tac-Toe Game React Component
 */
import React from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { TicTacToeGameController } from './controller';
import type { TicTacToeGameData } from './types';
import { 
  isValidMove, 
  makeMove, 
  getGameStatusWithCombination,
  getNextPlayer, 
  createEmptyBoard 
} from './gameLogic';

interface TicTacToeGameProps {
  playerId: string;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ playerId }) => {
  const controller = new TicTacToeGameController();
  
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
          ...newStats
        },
        score: 0,
        isComplete: false,
        lastModified: new Date().toISOString()
      });
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
          gamesPlayed: currentStats.gamesPlayed,
          xWins: currentStats.xWins,
          oWins: currentStats.oWins,
          ties: currentStats.ties
        },
        score: 0,
        isComplete: false,
        lastModified: new Date().toISOString()
      });
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
    const isEmpty = gameState.data.board[row][col] === null;
    const isPlayable = gameState.data.gameStatus === 'playing' && isEmpty;
    const isWinningCell = isPartOfWinningCombination(row, col);
    
    return `${baseClass} ${isPlayable ? 'playable' : ''} ${isEmpty ? 'empty' : 'filled'} ${isWinningCell ? 'winning-cell' : ''}`;
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
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Tic-Tac-Toe...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '2rem', 
      textAlign: 'center', 
      maxWidth: '600px', 
      margin: '0 auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      backgroundColor: '#f9f9f9'
    }}>
      <h2>{controller.config.name}</h2>
      <p>{controller.config.description}</p>
      
      {/* Game Status */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        backgroundColor: '#fff', 
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <div style={{ 
          fontSize: '1.5rem', 
          fontWeight: 'bold', 
          color: gameState.data.gameStatus === 'playing' ? '#333' : '#4CAF50',
          marginBottom: '0.5rem'
        }}>
          {getStatusMessage()}
        </div>
        
        {/* Game Statistics */}
        <div style={{ fontSize: '0.9rem', color: '#666' }}>
          Games: {gameState.data.gamesPlayed} | 
          X Wins: {gameState.data.xWins} | 
          O Wins: {gameState.data.oWins} | 
          Ties: {gameState.data.ties}
        </div>
      </div>

      {/* Game Board */}
      <div style={{ 
        marginBottom: '1.5rem',
        display: 'inline-block',
        border: '2px solid #333',
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 80px)', 
          gridTemplateRows: 'repeat(3, 80px)',
          gap: '1px',
          backgroundColor: '#333'
        }}>
          {gameState.data.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                style={{
                  backgroundColor: isPartOfWinningCombination(rowIndex, colIndex) ? '#ffeb3b' : '#fff',
                  border: isPartOfWinningCombination(rowIndex, colIndex) ? '3px solid #ff9800' : 'none',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  cursor: gameState.data.gameStatus === 'playing' && cell === null ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: cell === 'X' ? '#2196F3' : cell === 'O' ? '#f44336' : '#333',
                  transition: 'all 0.3s',
                  boxShadow: isPartOfWinningCombination(rowIndex, colIndex) ? '0 0 10px rgba(255, 152, 0, 0.5)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (gameState.data.gameStatus === 'playing' && cell === null && !isPartOfWinningCombination(rowIndex, colIndex)) {
                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPartOfWinningCombination(rowIndex, colIndex)) {
                    e.currentTarget.style.backgroundColor = '#fff';
                  }
                }}
              >
                {getCellContent(rowIndex, colIndex)}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={handleNewGame}
          style={{ 
            fontSize: '1.1rem', 
            padding: '0.75rem 1.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          New Game
        </button>
      </div>

      {/* Save/Load Controls */}
      <div style={{ 
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: '#fff',
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Save Management</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
            />
            Auto-save enabled (saves every {controller.config.autoSaveIntervalMs / 1000}s)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manual Save
          </button>
          
          <button 
            onClick={handleManualLoad}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
            }}
          >
            Load Game
          </button>
          
          <button 
            onClick={handleDropSave}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#f44336' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
            }}
          >
            Delete Save
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
          {hasSave ? 
            (lastSaveEvent?.action === 'auto-save' && 
             (Date.now() - new Date(lastSaveEvent.timestamp).getTime()) < 5000) ? 
              '💾 Save available (recently saved)' : 
              '💾 Save available' 
            : '❌ No save data'
          }
          {autoSaveEnabled && gameState.score > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#4CAF50', marginTop: '0.25rem' }}>
              ⚡ Auto-save active - moves saved instantly
            </div>
          )}
        </div>
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '0.5rem',
          backgroundColor: lastSaveEvent.success ? '#e8f5e8' : '#fde8e8',
          border: `1px solid ${lastSaveEvent.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '0.9rem'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small>{new Date(lastSaveEvent.timestamp).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame;