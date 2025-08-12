/**
 * Counter Game - Simple example game demonstrating save/load functionality
 */
import React from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import type { GameController, GameState, GameConfig } from '../../types/game';

// Counter-specific state data
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
  autoSaveIntervalMs: 5000 // Debounce time for automatic saves on state changes
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

interface CounterGameProps {
  playerId: string;
}

export const CounterGame: React.FC<CounterGameProps> = ({ playerId }) => {
  const controller = new CounterGameController();
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    triggerAutoSave, // Add the new trigger function
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

  const handleIncrement = async () => {
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
      isComplete: newCount >= 100 // Game completes at 100 clicks
    });

    // Trigger auto-save on meaningful actions (every 10 clicks or high score)
    if (newClicks % 10 === 0 || newCount > gameState.data.highScore) {
      await triggerAutoSave();
    }
  };

  const handleDecrement = async () => {
    const newCount = Math.max(0, gameState.data.count - 1);
    const newClicks = gameState.data.clicks + 1;
    
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        count: newCount,
        clicks: newClicks
      },
      score: newCount
    });

    // Trigger auto-save on meaningful actions (every 10 clicks)
    if (newClicks % 10 === 0) {
      await triggerAutoSave();
    }
  };

  const handleReset = async () => {
    setGameState({
      ...gameState,
      data: {
        count: 0,
        clicks: gameState.data.clicks,
        highScore: gameState.data.highScore
      },
      score: 0,
      isComplete: false
    });

    // Trigger auto-save on game reset (significant action)
    await triggerAutoSave();
  };

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

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
        <h2>Loading Counter Game...</h2>
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
      <h2>{COUNTER_CONFIG.name}</h2>
      <p>{COUNTER_CONFIG.description}</p>
      
      {/* Game Status */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        backgroundColor: '#fff', 
        borderRadius: '4px',
        border: '1px solid #eee'
      }}>
        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: gameState.data.count >= 100 ? '#4CAF50' : '#333' }}>
          {gameState.data.count}
        </div>
        <div style={{ marginTop: '0.5rem', color: '#666' }}>
          Total Clicks: {gameState.data.clicks} | High Score: {gameState.data.highScore}
        </div>
        {gameState.isComplete && (
          <div style={{ marginTop: '0.5rem', color: '#4CAF50', fontWeight: 'bold' }}>
            🎉 Game Complete! You reached 100! 🎉
          </div>
        )}
      </div>

      {/* Game Controls */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button 
          onClick={handleIncrement}
          style={{ 
            fontSize: '1.2rem', 
            padding: '0.75rem 1.5rem', 
            margin: '0 0.5rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          + Increment
        </button>
        <button 
          onClick={handleDecrement}
          disabled={gameState.data.count === 0}
          style={{ 
            fontSize: '1.2rem', 
            padding: '0.75rem 1.5rem', 
            margin: '0 0.5rem',
            backgroundColor: gameState.data.count === 0 ? '#ccc' : '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: gameState.data.count === 0 ? 'not-allowed' : 'pointer'
          }}
        >
          - Decrement
        </button>
        <button 
          onClick={handleReset}
          style={{ 
            fontSize: '1.2rem', 
            padding: '0.75rem 1.5rem', 
            margin: '0 0.5rem',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Reset
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
            Auto-save enabled (triggered on game actions)
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
          {hasSave ? '💾 Save available' : '❌ No save data'}
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

export default CounterGame;