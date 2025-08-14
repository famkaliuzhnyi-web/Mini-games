/**
 * Drawing Game Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import type { DrawingGameData, DrawAction, GameMode } from './types';
import { DEFAULT_COLORS, GRID_SIZE } from './types';
import { createEmptyGrid, applyDrawAction, clearGrid } from './logic';
import { multiplayerService } from '../../services/MultiplayerService';
import type { GameSession, GameMoveData, GameStateData } from '../../types/multiplayer';
import { MultiplayerLobby } from '../../components/multiplayer';
import { GameLayout } from '../../components/layout';
import { DrawingGame } from './DrawingGame';

interface SlotComponentProps {
  playerId: string;
}

// Game controller for drawing game
class DrawingGameController {
  config = {
    id: 'drawing',
    name: 'Drawing',
    description: 'Collaborative drawing on a 32x32 pixel canvas',
    version: '1.0.0',
    autoSaveEnabled: true,
    autoSaveIntervalMs: 5000,
    minPlayers: 1,
    maxPlayers: 4,
    category: 'Creative'
  };

  getInitialState(): DrawingGameData {
    return {
      grid: createEmptyGrid(),
      selectedColor: DEFAULT_COLORS[0], // Black
      gameStatus: 'drawing',
      actionHistory: [],
      gameMode: 'single-player',
      multiplayer: {
        isMultiplayer: false,
        waitingForPlayers: false
      }
    };
  }

  onSaveLoad = (gameState: import('../../types/game').GameState<DrawingGameData>): void => {
    // Ensure grid is properly initialized
    if (!gameState.data.grid || gameState.data.grid.length !== GRID_SIZE) {
      gameState.data.grid = createEmptyGrid();
    }
    
    // Ensure selected color is valid
    if (!gameState.data.selectedColor || !DEFAULT_COLORS.includes(gameState.data.selectedColor)) {
      gameState.data.selectedColor = DEFAULT_COLORS[0];
    }

    // Ensure action history is initialized
    if (!gameState.data.actionHistory) {
      gameState.data.actionHistory = [];
    }
  };

  onSaveDropped = (): void => {
    // Called when save is dropped - nothing special needed
  };
}

// Shared state hook for drawing game
const useDrawingState = (playerId: string) => {
  const controller = useMemo(() => new DrawingGameController(), []);
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
  } = useGameSave<DrawingGameData>({
    gameId: 'drawing',
    playerId,
    gameConfig: controller.config,
    initialState: {
      gameId: 'drawing',
      playerId,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      data: controller.getInitialState(),
      isComplete: false
    },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Handle multiplayer actions
  const handleMultiplayerAction = useCallback((action: {type: string; payload: unknown}) => {
    if (!gameState.data.multiplayer.isMultiplayer) return;

    if (action.type === 'DRAW_PIXEL') {
      // Send drawing action to other players
      multiplayerService.sendGameMove({
        gameId: 'drawing',
        playerId,
        move: action.payload,
        timestamp: new Date().toISOString()
      });
    } else if (action.type === 'CLEAR_CANVAS') {
      // Send clear action to other players
      multiplayerService.sendGameMove({
        gameId: 'drawing',
        playerId,
        move: { type: 'clear' },
        timestamp: new Date().toISOString()
      });
    }
  }, [gameState.data.multiplayer.isMultiplayer, playerId]);

  // Initialize multiplayer event listeners
  useEffect(() => {
    const handleGameMove = (moveData: GameMoveData) => {
      if (moveData.playerId === playerId) return; // Skip own moves
      
      console.log('Received multiplayer move:', moveData);
      
      // Apply the remote move to our game state
      if (moveData.move) {
        if (moveData.move.type === 'clear') {
          // Handle clear canvas
          const newGameState = {
            ...gameState,
            data: {
              ...gameState.data,
              grid: clearGrid(),
              actionHistory: []
            }
          };
          setGameState(newGameState);
        } else if (moveData.move.x !== undefined && moveData.move.y !== undefined) {
          // Handle pixel drawing
          const action = moveData.move as unknown as DrawAction;
          const newGameState = {
            ...gameState,
            data: {
              ...gameState.data,
              grid: applyDrawAction(gameState.data.grid, action),
              actionHistory: [...gameState.data.actionHistory, action]
            }
          };
          setGameState(newGameState);
        }
      }
    };

    const handleGameState = (stateData: GameStateData) => {
      console.log('Received multiplayer game state:', stateData);
      // Could sync with received game state if needed
    };

    multiplayerService.on('game-move-received', handleGameMove);
    multiplayerService.on('game-state-updated', handleGameState);

    return () => {
      multiplayerService.off('game-move-received', handleGameMove);
      multiplayerService.off('game-state-updated', handleGameState);
    };
  }, [playerId, setGameState]);

  // Update multiplayer session state
  useEffect(() => {
    const currentSession = multiplayerService.getCurrentSession();
    setMultiplayerSession(currentSession);
    
    if (currentSession && !gameState.data.multiplayer.isMultiplayer) {
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          gameMode: 'multiplayer' as GameMode,
          multiplayer: {
            isMultiplayer: true,
            sessionId: currentSession.id,
            isHost: multiplayerService.isHost(),
            playerId,
            connectedPlayers: currentSession.players.map(p => p.name),
            waitingForPlayers: currentSession.players.length < 2
          }
        }
      });
    }
  }, []);  // Run once on mount

  // Standard multiplayer functions following the tic-tac-toe pattern
  const startMultiplayerHost = useCallback(async () => {
    try {
      const session = await multiplayerService.createSession({
        gameId: 'drawing',
        maxPlayers: 4, // Drawing game supports up to 4 players
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
            waitingForPlayers: true
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
            waitingForPlayers: false // Join immediately into drawing
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
          isMultiplayer: false,
          waitingForPlayers: false
        }
      },
      lastModified: new Date().toISOString()
    });
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  // Auto-save trigger
  useEffect(() => {
    if (autoSaveEnabled && gameState.data.actionHistory.length > 0) {
      triggerAutoSave();
    }
  }, [gameState.data.actionHistory, autoSaveEnabled, triggerAutoSave]);

  return {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave,
    multiplayerSession,
    playerName,
    handleMultiplayerAction,
    startMultiplayerHost,
    joinMultiplayerSession,
    leaveMultiplayerSession
  };
};

// Game Field Component (the drawing canvas)
export const DrawingGameField: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    setGameState,
    isLoading,
    multiplayerSession,
    handleMultiplayerAction,
    leaveMultiplayerSession
  } = useDrawingState(playerId);

  const handleGameUpdate = useCallback((newGameData: DrawingGameData) => {
    const newGameState = {
      ...gameState,
      data: newGameData
    };
    setGameState(newGameState);
  }, [gameState, setGameState]);

  const handlePlayerReady = (isReady: boolean) => {
    multiplayerService.setPlayerReady(isReady);
  };

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading drawing canvas...</div>;
  }

  // Show multiplayer lobby if in multiplayer mode but waiting for players
  if (gameState.data.multiplayer?.isMultiplayer && multiplayerSession && gameState.data.multiplayer.waitingForPlayers) {
    return (
      <MultiplayerLobby
        session={multiplayerSession}
        isHost={gameState.data.multiplayer?.isHost || false}
        currentPlayerId={playerId}
        sessionUrl={multiplayerService.getSessionUrl()}
        onPlayerReady={handlePlayerReady}
        onLeaveSession={leaveMultiplayerSession}
      />
    );
  }

  return (
    <div className="drawing-game-field">
      <DrawingGame
        gameData={gameState.data}
        onGameUpdate={handleGameUpdate}
        playerId={playerId}
        onMultiplayerAction={handleMultiplayerAction}
      />
    </div>
  );
};

// Stats Component
export const DrawingStats: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    lastSaveEvent
  } = useDrawingState(playerId);

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
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Drawing Stats</div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)` }}>
        Actions: {gameState.data.actionHistory.length}
      </div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)` }}>
        Status: {gameState.data.gameStatus}
      </div>
      {gameState.data.multiplayer.isMultiplayer && (
        <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)` }}>
          Mode: Multiplayer ({gameState.data.multiplayer.connectedPlayers?.length || 1} players)
        </div>
      )}
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
export const DrawingControls: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    setGameState,
    isLoading,
    multiplayerSession,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave,
    startMultiplayerHost,
    joinMultiplayerSession,
    leaveMultiplayerSession
  } = useDrawingState(playerId);

  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showMultiplayerMenu, setShowMultiplayerMenu] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');

  const handleNewGame = useCallback(() => {
    const controller = new DrawingGameController();
    const newGameData = controller.getInitialState();
    
    // Preserve multiplayer state if active
    if (gameState.data.multiplayer.isMultiplayer) {
      newGameData.gameMode = 'multiplayer';
      newGameData.multiplayer = gameState.data.multiplayer;
    }
    
    const newGameState = {
      ...gameState,
      data: newGameData
    };
    setGameState(newGameState);
  }, [gameState, setGameState]);

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
      alert('Drawing saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Drawing loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved drawing?')) {
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
          🎨 New Drawing
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
            Multiplayer Drawing
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
              🏠 Host Session
            </button>
          </div>

          <div style={{ 
            fontSize: '0.8rem',
            color: `var(--color-textSecondary)`,
            marginBottom: '0.5rem'
          }}>
            Or join a session:
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

// Backward compatibility - Main Game Component
export const DrawingSlotComponent: React.FC<SlotComponentProps> = ({ playerId }) => {
  return (
    <GameLayout 
      slots={{
        gameField: <DrawingGameField playerId={playerId} />,
        stats: <DrawingStats playerId={playerId} />,
        controls: <DrawingControls playerId={playerId} />
      }}
      className="drawing-game-layout"
    />
  );
};

export default DrawingSlotComponent;