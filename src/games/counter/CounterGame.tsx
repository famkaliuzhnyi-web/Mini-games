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
  autoSaveIntervalMs: 10000 // Save every 10 seconds
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

  const handleIncrement = () => {
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
  };

  const handleDecrement = () => {
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
  };

  const handleReset = () => {
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
      textAlign: 'center' as const, 
      maxWidth: '700px', 
      margin: '0 auto'
    }}>
      <h2 style={{ marginBottom: '0.5rem', color: 'rgba(255, 255, 255, 0.9)' }}>{COUNTER_CONFIG.name}</h2>
      <p style={{ marginBottom: '2rem', color: 'rgba(255, 255, 255, 0.7)' }}>{COUNTER_CONFIG.description}</p>
      
      {/* Game Status */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className={`counter-display ${gameState.isComplete ? 'complete' : ''}`}>
          {gameState.data.count}
        </div>
        <div className="game-stats">
          Total Clicks: {gameState.data.clicks} | High Score: {gameState.data.highScore}
        </div>
        {gameState.isComplete && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem',
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
            borderRadius: '12px',
            color: '#10b981', 
            fontWeight: 'bold',
            border: '1px solid rgba(16, 185, 129, 0.3)'
          }}>
            🎉 Game Complete! You reached 100! 🎉
          </div>
        )}
      </div>

      {/* Game Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', color: 'rgba(255, 255, 255, 0.9)' }}>Game Controls</h3>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleIncrement}
            className="game-button"
            style={{ 
              fontSize: '1.2rem', 
              padding: '1rem 2rem'
            }}
          >
            ➕ Increment
          </button>
          <button 
            onClick={handleDecrement}
            disabled={gameState.data.count === 0}
            className="warning-button"
            style={{ 
              fontSize: '1.2rem', 
              padding: '1rem 2rem'
            }}
          >
            ➖ Decrement
          </button>
          <button 
            onClick={handleReset}
            className="danger-button"
            style={{ 
              fontSize: '1.2rem', 
              padding: '1rem 2rem'
            }}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Save/Load Controls */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: 'rgba(255, 255, 255, 0.9)' }}>Save Management</h3>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '0.5rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '1rem'
          }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
              style={{ transform: 'scale(1.2)' }}
            />
            Auto-save enabled (saves every {COUNTER_CONFIG.autoSaveIntervalMs / 1000}s)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSave}
            style={{ padding: '0.75rem 1.25rem' }}
          >
            💾 Manual Save
          </button>
          
          <button 
            onClick={handleManualLoad}
            disabled={!hasSave}
            className={hasSave ? 'game-button' : ''}
            style={{ padding: '0.75rem 1.25rem' }}
          >
            📂 Load Game
          </button>
          
          <button 
            onClick={handleDropSave}
            disabled={!hasSave}
            className={hasSave ? 'danger-button' : ''}
            style={{ padding: '0.75rem 1.25rem' }}
          >
            🗑️ Delete Save
          </button>
        </div>

        <div style={{ 
          marginTop: '1rem', 
          fontSize: '0.9rem', 
          color: hasSave ? '#10b981' : '#ef4444',
          fontWeight: '600'
        }}>
          {hasSave ? '💾 Save available' : '❌ No save data'}
        </div>
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div className={`save-status ${lastSaveEvent.success ? 'success' : 'error'}`}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small style={{ opacity: 0.8 }}>{new Date(lastSaveEvent.timestamp).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
};

export default CounterGame;