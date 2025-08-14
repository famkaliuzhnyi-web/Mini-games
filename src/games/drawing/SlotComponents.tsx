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
    
    if (currentSession) {
      const newGameState = {
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
      };
      setGameState(newGameState);
    }
  }, [playerId, setGameState]);

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
    handleMultiplayerAction
  };
};

// Main Game Component
export const DrawingSlotComponent: React.FC<SlotComponentProps> = ({ playerId }) => {
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
    toggleAutoSave,
    multiplayerSession,
    playerName,
    handleMultiplayerAction
  } = useDrawingState(playerId);

  const handleGameUpdate = useCallback((newGameData: DrawingGameData) => {
    const newGameState = {
      ...gameState,
      data: newGameData
    };
    setGameState(newGameState);
  }, [setGameState, gameState]);

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
  }, [gameState.data.multiplayer, setGameState]);

  const handleMultiplayerStart = useCallback(async () => {
    try {
      const session = await multiplayerService.createSession({
        gameId: 'drawing',
        hostName: playerName,
        maxPlayers: 4
      });
      console.log('Multiplayer session created:', session);
    } catch (error) {
      console.error('Failed to create multiplayer session:', error);
    }
  }, [playerName]);

  const handleLeaveSession = useCallback(() => {
    multiplayerService.leaveSession();
    const newGameState = {
      ...gameState,
      data: {
        ...gameState.data,
        gameMode: 'single-player' as GameMode,
        multiplayer: {
          isMultiplayer: false,
          waitingForPlayers: false
        }
      }
    };
    setGameState(newGameState);
  }, [setGameState, gameState]);

  // Show multiplayer lobby if in multiplayer mode but not enough players
  if (multiplayerSession && gameState.data.multiplayer.waitingForPlayers) {
    return (
      <MultiplayerLobby
        session={multiplayerSession}
        isHost={multiplayerService.isHost()}
        currentPlayerId={playerId}
        sessionUrl={multiplayerService.getSessionUrl()}
        onPlayerReady={(isReady: boolean) => {
          // For drawing game, no ready state needed - players can join anytime
          console.log('Player ready state:', isReady);
        }}
        onLeaveSession={handleLeaveSession}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="drawing-game">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          Loading drawing canvas...
        </div>
      </div>
    );
  }

  return (
    <>
      <DrawingGame
        gameData={gameState.data}
        onGameUpdate={handleGameUpdate}
        playerId={playerId}
        onMultiplayerAction={handleMultiplayerAction}
      />
      
      {/* Game controls overlay */}
      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        justifyContent: 'center', 
        marginTop: '1rem',
        flexWrap: 'wrap'
      }}>
        <button
          className="drawing-control-button"
          onClick={handleNewGame}
          title="Start a new drawing"
        >
          🎨 New Drawing
        </button>
        
        {hasSave && (
          <button
            className="drawing-control-button secondary"
            onClick={() => loadGame()}
            title="Load your saved drawing"
          >
            📂 Load Save
          </button>
        )}
        
        <button
          className="drawing-control-button secondary"
          onClick={() => saveGame()}
          title="Save your current drawing"
        >
          💾 Save Drawing
        </button>
        
        {hasSave && (
          <button
            className="drawing-control-button danger"
            onClick={() => dropSave()}
            title="Delete saved drawing"
          >
            🗑️ Delete Save
          </button>
        )}
        
        {!gameState.data.multiplayer.isMultiplayer && (
          <button
            className="drawing-control-button"
            onClick={handleMultiplayerStart}
            title="Start multiplayer session"
          >
            🌐 Multiplayer
          </button>
        )}
        
        {gameState.data.multiplayer.isMultiplayer && (
          <button
            className="drawing-control-button danger"
            onClick={handleLeaveSession}
            title="Leave multiplayer session"
          >
            🚪 Leave Session
          </button>
        )}
        
        <button
          className={`drawing-control-button ${autoSaveEnabled ? 'selected' : 'secondary'}`}
          onClick={toggleAutoSave}
          title={`Auto-save: ${autoSaveEnabled ? 'ON' : 'OFF'}`}
        >
          {autoSaveEnabled ? '💾 Auto-save ON' : '💾 Auto-save OFF'}
        </button>
      </div>
      
      {lastSaveEvent && (
        <div style={{
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--color-success, #16a34a)',
          marginTop: '0.5rem'
        }}>
          ✅ {typeof lastSaveEvent === 'string' ? lastSaveEvent : 'Saved successfully'}
        </div>
      )}
    </>
  );
};

export default DrawingSlotComponent;