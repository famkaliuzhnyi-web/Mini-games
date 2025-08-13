/**
 * Counter Game Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useMemo } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useTheme } from '../../hooks/useTheme';
import type { GameController, GameState, GameConfig } from '../../types/game';

// Counter-specific state data (matching original implementation)
export interface CounterGameData extends Record<string, unknown> {
  count: number;
  clicks: number;
  highScore: number;
}

// Counter game configuration
const COUNTER_CONFIG: GameConfig = {
  id: 'counter',
  name: 'Counter Game',
  description: 'A simple clicking game with save/load functionality',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 5000
};

// Counter game controller
class CounterGameController implements GameController<CounterGameData> {
  config = COUNTER_CONFIG;

  getInitialState(): GameState<CounterGameData> {
    const now = new Date().toISOString();
    return {
      gameId: 'counter',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        count: 0,
        clicks: 0,
        highScore: 0
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<CounterGameData>): boolean {
    return !!(
      state &&
      state.data &&
      typeof state.data.count === 'number' &&
      typeof state.data.clicks === 'number' &&
      typeof state.data.highScore === 'number'
    );
  }

  onSaveLoad(state: GameState<CounterGameData>): void {
    console.log('Counter game loaded:', state.data);
  }

  onSaveDropped(): void {
    console.log('Counter game save dropped');
  }
}

interface SlotComponentProps {
  playerId: string;
}

// Shared state hook for counter game
const useCounterState = (playerId: string) => {
  const controller = useMemo(() => new CounterGameController(), []);
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
  } = useGameSave<CounterGameData>({
    gameId: 'counter',
    playerId,
    gameConfig: COUNTER_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  const handleIncrement = useCallback(async () => {
    const newCount = gameState.data.count + 1;
    const newClicks = gameState.data.clicks + 1;
    const newHighScore = Math.max(gameState.data.highScore, newCount);
    
    setGameState({
      ...gameState,
      data: {
        count: newCount,
        clicks: newClicks,
        highScore: newHighScore
      },
      score: newCount,
      isComplete: newCount >= 100,
      lastModified: new Date().toISOString()
    });

    if (newClicks % 10 === 0 || newCount > gameState.data.highScore) {
      await triggerAutoSave();
    }
  }, [gameState, setGameState, triggerAutoSave]);

  const handleDecrement = useCallback(async () => {
    const newCount = Math.max(0, gameState.data.count - 1);
    const newClicks = gameState.data.clicks + 1;
    
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        count: newCount,
        clicks: newClicks
      },
      score: newCount,
      lastModified: new Date().toISOString()
    });

    if (newClicks % 10 === 0) {
      await triggerAutoSave();
    }
  }, [gameState, setGameState, triggerAutoSave]);

  const handleReset = useCallback(async () => {
    setGameState({
      ...gameState,
      data: {
        count: 0,
        clicks: gameState.data.clicks,
        highScore: gameState.data.highScore
      },
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString()
    });

    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave]);

  return {
    gameState,
    isLoading,
    currentTheme,
    handleIncrement,
    handleDecrement,
    handleReset,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  };
};

// Game Field Component (the counter display and main interaction)
export const CounterGameField: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    handleIncrement,
    handleDecrement
  } = useCounterState(playerId);

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading game...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '2rem',
      backgroundColor: `var(--color-gameBackground)`,
      color: `var(--color-text)`
    }}>
      {/* Counter Display */}
      <div style={{ 
        fontSize: 'min(20vw, 8rem)', 
        fontWeight: 'bold', 
        color: gameState.data.count >= 100 ? `var(--color-success)` : `var(--color-text)`,
        fontFamily: `var(--font-mono)`,
        marginBottom: '2rem',
        textAlign: 'center',
        textShadow: gameState.data.count >= 100 ? '0 0 20px currentColor' : 'none'
      }}>
        {gameState.data.count}
      </div>

      {/* Completion Message */}
      {gameState.isComplete && (
        <div style={{ 
          marginBottom: '2rem', 
          color: `var(--color-success)`, 
          fontWeight: 'bold',
          fontSize: '1.5rem',
          textAlign: 'center',
          animation: 'pulse 2s infinite'
        }}>
          🎉 Game Complete! You reached 100! 🎉
        </div>
      )}

      {/* Main Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        <button 
          onClick={handleIncrement}
          style={{ 
            fontSize: '1.5rem', 
            padding: '1rem 2rem',
            backgroundColor: `var(--color-accent)`,
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            fontWeight: 'bold',
            minHeight: '60px',
            minWidth: '120px',
            touchAction: 'manipulation',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.95)';
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
          }}
        >
          + Add
        </button>

        <button 
          onClick={handleDecrement}
          disabled={gameState.data.count === 0}
          style={{ 
            fontSize: '1.5rem', 
            padding: '1rem 2rem',
            backgroundColor: gameState.data.count === 0 ? `var(--color-surface)` : `var(--color-error)`,
            color: gameState.data.count === 0 ? `var(--color-textMuted)` : 'white',
            border: 'none',
            borderRadius: '12px',
            cursor: gameState.data.count === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minHeight: '60px',
            minWidth: '120px',
            touchAction: 'manipulation',
            boxShadow: gameState.data.count === 0 ? 'none' : '0 4px 8px rgba(0,0,0,0.2)',
            transition: 'all 0.2s ease'
          }}
          onMouseDown={(e) => {
            if (gameState.data.count > 0) {
              e.currentTarget.style.transform = 'scale(0.95)';
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            }
          }}
          onMouseUp={(e) => {
            if (gameState.data.count > 0) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }
          }}
          onMouseLeave={(e) => {
            if (gameState.data.count > 0) {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }
          }}
        >
          - Remove
        </button>
      </div>
    </div>
  );
};

// Stats Component
export const CounterStats: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    lastSaveEvent
  } = useCounterState(playerId);

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
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)`, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        <div>Current: {gameState.data.count}</div>
        <div>Total Clicks: {gameState.data.clicks}</div>
        <div>High Score: {gameState.data.highScore}</div>
        <div>Progress: {Math.round((gameState.data.count / 100) * 100)}%</div>
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
export const CounterControls: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    isLoading,
    handleReset,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave
  } = useCounterState(playerId);

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
          onClick={handleReset}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: `var(--color-warning)`,
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
          Reset
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
              Auto-save (every 10 clicks)
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