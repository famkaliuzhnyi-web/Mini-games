/**
 * Tic-Tac-Toe Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useRef, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useTheme } from '../../hooks/useTheme';
import { TicTacToeGameController } from './controller';
import type { TicTacToeGameData } from './types';
import { 
  isValidMove, 
  makeMove, 
  getGameStatusWithCombination,
  getNextPlayer, 
  createEmptyBoard 
} from './gameLogic';

interface SlotComponentProps {
  playerId: string;
}

// Shared state hook for tic-tac-toe game
const useTicTacToeState = (playerId: string) => {
  const controller = useMemo(() => new TicTacToeGameController(), []);
  const { currentTheme } = useTheme();
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    triggerAutoSave,
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

  const handleCellClick = useCallback(async (row: number, col: number) => {
    if (gameState.data.gameStatus !== 'playing' || !isValidMove(gameState.data.board, row, col)) {
      return;
    }

    try {
      const newBoard = makeMove(gameState.data.board, row, col, gameState.data.currentPlayer);
      const { status: newGameStatus, winningCombination } = getGameStatusWithCombination(newBoard);
      const newPlayer = getNextPlayer(gameState.data.currentPlayer);
      
      const move = {
        row,
        col,
        player: gameState.data.currentPlayer,
        timestamp: new Date().toISOString()
      };

      const newScore = gameState.data.moveHistory.length + 1;

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

      await triggerAutoSave();
    } catch (error) {
      console.error('Error making move:', error);
    }
  }, [gameState, setGameState, triggerAutoSave]);

  const handleNewGame = useCallback(async () => {
    const currentStats = gameState.data;

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
    
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  return {
    gameState,
    isLoading,
    currentTheme,
    handleCellClick,
    handleNewGame,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  };
};

// Game Field Component (the tic-tac-toe board)
export const TicTacToeGameField: React.FC<SlotComponentProps> = ({ playerId }) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const {
    gameState,
    isLoading,
    handleCellClick
  } = useTicTacToeState(playerId);

  const getCellContent = (row: number, col: number): string => {
    const cellValue = gameState.data.board[row][col];
    return cellValue || '';
  };

  const isPartOfWinningCombination = (row: number, col: number): boolean => {
    if (!gameState.data.winningCombination) return false;
    return gameState.data.winningCombination.positions.some(
      ([winRow, winCol]) => winRow === row && winCol === col
    );
  };

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading game...</div>;
  }

  return (
    <div 
      className="tic-tac-toe-game-field" 
      ref={gameRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '1rem',
        backgroundColor: `var(--color-gameBackground)`,
        color: `var(--color-text)`
      }}
    >
      {/* Game Status Message */}
      <div style={{ 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        marginBottom: '1.5rem',
        color: gameState.data.gameStatus === 'playing' ? `var(--color-text)` : `var(--color-success)`,
        textAlign: 'center'
      }}>
        {gameState.data.gameStatus === 'X-wins' && '🎉 X Wins!'}
        {gameState.data.gameStatus === 'O-wins' && '🎉 O Wins!'}
        {gameState.data.gameStatus === 'tie' && '🤝 It\'s a Tie!'}
        {gameState.data.gameStatus === 'playing' && `${gameState.data.currentPlayer}'s Turn`}
      </div>

      {/* Game Board */}
      <div style={{ 
        display: 'inline-block',
        border: `2px solid var(--color-border)`,
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: `var(--color-border)`
      }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: '2px',
          width: 'min(60vw, 300px)',
          height: 'min(60vw, 300px)',
          maxWidth: '300px',
          maxHeight: '300px'
        }}>
          {gameState.data.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                style={{
                  backgroundColor: isPartOfWinningCombination(rowIndex, colIndex) 
                    ? `var(--color-warning)` 
                    : `var(--color-gameSurface)`,
                  border: isPartOfWinningCombination(rowIndex, colIndex) 
                    ? `3px solid var(--color-accent)` 
                    : 'none',
                  fontSize: 'min(8vw, 3rem)',
                  fontWeight: 'bold',
                  cursor: gameState.data.gameStatus === 'playing' && cell === null ? 'pointer' : 'default',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: cell === 'X' ? `var(--color-accent)` : 
                         cell === 'O' ? `var(--color-error)` : `var(--color-text)`,
                  transition: 'all 0.3s ease',
                  aspectRatio: '1',
                  minHeight: '44px', // Touch-friendly
                  touchAction: 'manipulation'
                }}
                onMouseEnter={(e) => {
                  if (gameState.data.gameStatus === 'playing' && cell === null && !isPartOfWinningCombination(rowIndex, colIndex)) {
                    e.currentTarget.style.backgroundColor = `var(--color-surface)`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isPartOfWinningCombination(rowIndex, colIndex)) {
                    e.currentTarget.style.backgroundColor = `var(--color-gameSurface)`;
                  }
                }}
              >
                {getCellContent(rowIndex, colIndex)}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// Stats Component
export const TicTacToeStats: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    lastSaveEvent
  } = useTicTacToeState(playerId);

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading stats...</div>;
  }

  return (
    <div style={{
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px',
      color: `var(--color-text)`,
      fontSize: '0.9rem'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Stats</div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)` }}>
        Games: {gameState.data.gamesPlayed} | X: {gameState.data.xWins} | O: {gameState.data.oWins} | Ties: {gameState.data.ties}
      </div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)` }}>
        Moves: {gameState.data.moveHistory.length}
      </div>
      {lastSaveEvent && lastSaveEvent.success && (
        <div style={{ 
          marginTop: '0.25rem',
          fontSize: '0.7rem',
          color: `var(--color-success)`,
          textAlign: 'center'
        }}>
          ✅ Saved
        </div>
      )}
    </div>
  );
};

// Controls Component
export const TicTacToeControls: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    isLoading,
    handleNewGame,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave
  } = useTicTacToeState(playerId);

  const [showSaveMenu, setShowSaveMenu] = useState(false);

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game?')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
    setShowSaveMenu(false);
  };

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading controls...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px'
    }}>
      {/* Main Controls */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={handleNewGame}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: `var(--color-accent)`,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            minHeight: '40px',
            touchAction: 'manipulation'
          }}
        >
          New Game
        </button>

        <button 
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: `var(--color-secondary)`,
            color: `var(--color-text)`,
            border: `1px solid var(--color-border)`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            minHeight: '40px',
            touchAction: 'manipulation'
          }}
        >
          Save/Load
        </button>
      </div>

      {/* Save Menu */}
      {showSaveMenu && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: `var(--color-gameBackground)`,
          borderRadius: '6px',
          border: `1px solid var(--color-border)`
        }}>
          {/* Auto-save toggle */}
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: `var(--color-textSecondary)`
            }}>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
                style={{ accentColor: `var(--color-accent)` }}
              />
              Auto-save
            </label>
          </div>
          
          {/* Save actions */}
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleManualSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: `var(--color-accent)`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Save
            </button>
            
            <button 
              onClick={handleManualLoad}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-success)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Load
            </button>
            
            <button 
              onClick={handleDropSave}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-error)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};