/**
 * Tic-Tac-Toe Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useRef, useMemo, useEffect } from 'react';
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
import { multiplayerService } from '../../services/MultiplayerService';
import type { GameSession } from '../../types/multiplayer';
import { MultiplayerLobby } from '../../components/multiplayer';
import './TicTacToeGame.css';

interface SlotComponentProps {
  playerId: string;
}

// Shared state hook for tic-tac-toe game
const useTicTacToeState = (playerId: string) => {
  const controller = useMemo(() => new TicTacToeGameController(), []);
  const { currentTheme } = useTheme();
  const [multiplayerSession, setMultiplayerSession] = useState<GameSession | null>(null);
  const [playerName] = useState(() => {
    // Get player name from localStorage or generate one
    const stored = localStorage.getItem('minigames_user_profile');
    if (stored) {
      try {
        const profile = JSON.parse(stored);
        return profile.name || 'Player';
      } catch {
        return 'Player';
      }
    }
    return 'Player';
  });
  
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

  // Initialize multiplayer event listeners
  useEffect(() => {
    const handleGameMove = (moveData: any) => {
      if (moveData.playerId === playerId) return; // Skip own moves
      
      console.log('Received multiplayer move:', moveData);
      
      // Apply the remote move to our game state
      if (moveData.move && typeof moveData.move === 'object') {
        const { row, col } = moveData.move;
        if (isValidMove(gameState.data.board, row, col)) {
          handleCellClickInternal(row, col, true); // Skip multiplayer broadcast
        }
      }
    };

    const handleGameState = (stateData: any) => {
      console.log('Received multiplayer game state:', stateData);
      // Sync with received game state
    };

    multiplayerService.on('game-move-received', handleGameMove);
    multiplayerService.on('game-state-updated', handleGameState);

    return () => {
      multiplayerService.off('game-move-received', handleGameMove);
      multiplayerService.off('game-state-updated', handleGameState);
    };
  }, [gameState.data.board, playerId]);

  // Update multiplayer session state
  useEffect(() => {
    const currentSession = multiplayerService.getCurrentSession();
    setMultiplayerSession(currentSession);
  }, []);

  const handleCellClickInternal = useCallback(async (row: number, col: number, skipMultiplayerBroadcast = false) => {
    if (gameState.data.gameStatus !== 'playing' || !isValidMove(gameState.data.board, row, col)) {
      return;
    }

    // In multiplayer, check if it's our turn
    if (gameState.data.multiplayer?.isMultiplayer && gameState.data.multiplayer?.waitingForMove) {
      return; // Not our turn
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
          winningCombination,
          multiplayer: gameState.data.multiplayer?.isMultiplayer ? {
            ...(gameState.data.multiplayer || {}),
            waitingForMove: newGameStatus === 'playing' // Wait for opponent's move
          } : gameState.data.multiplayer || { isMultiplayer: false }
        },
        score: newScore,
        isComplete: newGameStatus !== 'playing',
        lastModified: new Date().toISOString()
      });

      // Broadcast move to other players
      if (gameState.data.multiplayer?.isMultiplayer && !skipMultiplayerBroadcast) {
        await multiplayerService.sendGameMove({ row, col, player: gameState.data.currentPlayer });
      }

      await triggerAutoSave();
    } catch (error) {
      console.error('Error making move:', error);
    }
  }, [gameState, setGameState, triggerAutoSave]);

  const handleCellClick = useCallback((row: number, col: number) => {
    handleCellClickInternal(row, col, false);
  }, [handleCellClickInternal]);

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
          gameMode: currentStats.gameMode || 'single-player',
          multiplayer: {
            ...(currentStats.multiplayer || { isMultiplayer: false }),
            waitingForMove: false
          },
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
          gameMode: currentStats.gameMode || 'single-player',
          multiplayer: {
            ...(currentStats.multiplayer || { isMultiplayer: false }),
            waitingForMove: false
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
    }
    
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  const startMultiplayerHost = useCallback(async () => {
    try {
      const session = await multiplayerService.createSession({
        gameId: 'tic-tac-toe',
        maxPlayers: 2, // Tic-tac-toe is 2 players (host + 1 guest)
        hostName: playerName
      });

      setMultiplayerSession(session);
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          gameMode: 'multiplayer',
          multiplayer: {
            isMultiplayer: true,
            sessionId: session.id,
            isHost: true,
            playerId,
            waitingForMove: false
          }
        },
        lastModified: new Date().toISOString()
      });

      await triggerAutoSave();
    } catch (error) {
      console.error('Failed to create multiplayer session:', error);
      alert('Failed to create multiplayer session');
    }
  }, [gameState, setGameState, triggerAutoSave, playerName, playerId]);

  const joinMultiplayerSession = useCallback(async (sessionId: string) => {
    try {
      const session = await multiplayerService.joinSession({
        sessionId,
        playerName
      });

      setMultiplayerSession(session);
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          gameMode: 'multiplayer',
          multiplayer: {
            isMultiplayer: true,
            sessionId: session.id,
            isHost: false,
            playerId,
            waitingForMove: true // Guest waits for host's first move
          }
        },
        lastModified: new Date().toISOString()
      });

      await triggerAutoSave();
    } catch (error) {
      console.error('Failed to join multiplayer session:', error);
      alert('Failed to join multiplayer session');
    }
  }, [gameState, setGameState, triggerAutoSave, playerName, playerId]);

  const leaveMultiplayerSession = useCallback(async () => {
    await multiplayerService.leaveSession();
    setMultiplayerSession(null);
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        gameMode: 'single-player',
        multiplayer: {
          isMultiplayer: false
        }
      },
      lastModified: new Date().toISOString()
    });
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  return {
    gameState,
    isLoading,
    currentTheme,
    multiplayerSession,
    playerName,
    handleCellClick,
    handleNewGame,
    startMultiplayerHost,
    joinMultiplayerSession,
    leaveMultiplayerSession,
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
    multiplayerSession,
    handleCellClick,
    leaveMultiplayerSession
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

  const handlePlayerReady = (isReady: boolean) => {
    multiplayerService.setPlayerReady(isReady);
  };

  const handleStartGame = () => {
    // Game can start when ready
    console.log('Starting multiplayer game');
  };

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading game...</div>;
  }

  // Show multiplayer lobby if in multiplayer mode but not playing yet
  if (gameState.data.multiplayer?.isMultiplayer && multiplayerSession && multiplayerSession.state === 'waiting') {
    return (
      <MultiplayerLobby
        session={multiplayerSession}
        isHost={gameState.data.multiplayer?.isHost || false}
        currentPlayerId={playerId}
        sessionUrl={multiplayerService.getSessionUrl()}
        onPlayerReady={handlePlayerReady}
        onStartGame={handleStartGame}
        onLeaveSession={leaveMultiplayerSession}
      />
    );
  }

  return (
    <div 
      className="tic-tac-toe-game-field" 
      ref={gameRef}
    >
      {/* Game Status Message */}
      <div className={`tic-tac-toe-status-message ${gameState.data.gameStatus === 'playing' ? 'playing' : 'winner'}`}>
        {gameState.data.gameStatus === 'X-wins' && '🎉 X Wins!'}
        {gameState.data.gameStatus === 'O-wins' && '🎉 O Wins!'}
        {gameState.data.gameStatus === 'tie' && '🤝 It\'s a Tie!'}
        {gameState.data.gameStatus === 'playing' && `${gameState.data.currentPlayer}'s Turn`}
      </div>

      {/* Game Board */}
      <div className="tic-tac-toe-board-wrapper">
        <div className="tic-tac-toe-board-slot">
          {gameState.data.board.map((row, rowIndex) =>
            row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                className={`tic-tac-toe-cell-slot ${
                  cell === 'X' ? 'x-mark' : cell === 'O' ? 'o-mark' : ''
                } ${isPartOfWinningCombination(rowIndex, colIndex) ? 'winning-cell' : ''}`}
                disabled={gameState.data.gameStatus !== 'playing' || cell !== null}
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
    gameState,
    isLoading,
    multiplayerSession,
    handleNewGame,
    startMultiplayerHost,
    joinMultiplayerSession,
    leaveMultiplayerSession,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave
  } = useTicTacToeState(playerId);

  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');

  const handleJoinSession = () => {
    if (joinSessionId.trim()) {
      joinMultiplayerSession(joinSessionId.trim());
      setJoinSessionId('');
      setShowMultiplayerMenu(false);
    }
  };

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
          disabled={gameState.data.multiplayer?.isMultiplayer && multiplayerSession?.state === 'waiting'}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: (gameState.data.multiplayer?.isMultiplayer && multiplayerSession?.state === 'waiting') 
              ? `var(--color-surface)` 
              : `var(--color-accent)`,
            color: (gameState.data.multiplayer?.isMultiplayer && multiplayerSession?.state === 'waiting') 
              ? `var(--color-textMuted)` 
              : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: (gameState.data.multiplayer?.isMultiplayer && multiplayerSession?.state === 'waiting') 
              ? 'not-allowed' 
              : 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold',
            minHeight: '40px',
            touchAction: 'manipulation'
          }}
        >
          New Game
        </button>

        {/* Multiplayer Button */}
        {!(gameState.data.multiplayer?.isMultiplayer) ? (
          <button 
            onClick={() => setShowMultiplayerMenu(!showMultiplayerMenu)}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: `var(--color-success)`,
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
            🌐 Multiplayer
          </button>
        ) : (
          <button 
            onClick={leaveMultiplayerSession}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: `var(--color-error)`,
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
            🚪 Leave Multiplayer
          </button>
        )}

        {!(gameState.data.multiplayer?.isMultiplayer) && (
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
        )}
      </div>

      {/* Multiplayer Menu */}
      {showMultiplayerMenu && !(gameState.data.multiplayer?.isMultiplayer) && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: `var(--color-gameBackground)`,
          borderRadius: '6px',
          border: `1px solid var(--color-border)`
        }}>
          <div style={{
            fontSize: '0.9rem',
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: `var(--color-text)`
          }}>
            Multiplayer Options
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button 
              onClick={startMultiplayerHost}
              style={{ 
                flex: 1,
                padding: '0.5rem',
                backgroundColor: `var(--color-accent)`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}
            >
              🏠 Host Game
            </button>
          </div>

          <div style={{ 
            fontSize: '0.8rem',
            color: `var(--color-textSecondary)`,
            marginBottom: '0.5rem'
          }}>
            Or join a game:
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            <input
              type="text"
              placeholder="Enter Session ID"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              style={{
                flex: 1,
                padding: '0.375rem',
                border: `1px solid var(--color-border)`,
                borderRadius: '4px',
                fontSize: '0.8rem',
                backgroundColor: `var(--color-surface)`,
                color: `var(--color-text)`
              }}
            />
            <button 
              onClick={handleJoinSession}
              disabled={!joinSessionId.trim()}
              style={{ 
                padding: '0.375rem 0.75rem',
                backgroundColor: joinSessionId.trim() ? `var(--color-success)` : `var(--color-surface)`,
                color: joinSessionId.trim() ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: joinSessionId.trim() ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem'
              }}
            >
              Join
            </button>
          </div>
        </div>
      )}

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