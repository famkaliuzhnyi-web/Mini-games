# Game Development Guide

This guide explains how to add new games to the Mini-games platform with automatic save/load functionality.

## Quick Start

1. **Create a game directory**: `src/games/your-game-name/`
2. **Implement the GameController interface**
3. **Use the useGameSave hook** for automatic save/load functionality
4. **Export your game** and add it to the game selection

## Step-by-Step Implementation

### 1. Define Your Game Data Types

```typescript
// src/games/your-game/types.ts
export interface YourGameData extends Record<string, unknown> {
  // Your game-specific data
  level: number;
  points: number;
  playerPosition: { x: number; y: number };
}
```

### 2. Create a Game Controller

```typescript
// src/games/your-game/controller.ts
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { YourGameData } from './types';

const YOUR_GAME_CONFIG: GameConfig = {
  id: 'your-game',
  name: 'Your Game Name',
  description: 'Description of your game',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 15000 // Save every 15 seconds
};

export class YourGameController implements GameController<YourGameData> {
  config = YOUR_GAME_CONFIG;

  getInitialState(): GameState<YourGameData> {
    const now = new Date().toISOString();
    return {
      gameId: 'your-game',
      playerId: '', // Will be set by the component
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        level: 1,
        points: 0,
        playerPosition: { x: 0, y: 0 }
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<YourGameData>): boolean {
    return !!(
      state &&
      state.data &&
      typeof state.data.level === 'number' &&
      typeof state.data.points === 'number'
    );
  }

  onSaveLoad(state: GameState<YourGameData>): void {
    console.log('Your game loaded:', state.data);
  }

  onSaveDropped(): void {
    console.log('Your game save dropped');
  }
}
```

### 3. Create the React Component

```typescript
// src/games/your-game/YourGame.tsx
import React from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { YourGameController } from './controller';
import type { YourGameData } from './types';

interface YourGameProps {
  playerId: string;
}

export const YourGame: React.FC<YourGameProps> = ({ playerId }) => {
  const controller = new YourGameController();
  
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
  } = useGameSave<YourGameData>({
    gameId: 'your-game',
    playerId,
    gameConfig: controller.config,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Your game logic here
  const handleGameAction = () => {
    // Update game state - this will trigger auto-save
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        points: gameState.data.points + 10
      },
      score: gameState.data.points + 10
    });
  };

  if (isLoading) {
    return <div>Loading Your Game...</div>;
  }

  return (
    <div>
      <h2>{controller.config.name}</h2>
      
      {/* Your game UI here */}
      <div>Points: {gameState.data.points}</div>
      <button onClick={handleGameAction}>Do Action</button>
      
      {/* Save Management UI (optional - you can customize this) */}
      <div>
        <h3>Save Management</h3>
        <label>
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={toggleAutoSave}
          />
          Auto-save enabled
        </label>
        
        <button onClick={() => saveGame()}>Manual Save</button>
        <button onClick={() => loadGame()} disabled={!hasSave}>
          Load Game
        </button>
        <button onClick={() => dropSave()} disabled={!hasSave}>
          Delete Save
        </button>
        
        <div>{hasSave ? '💾 Save available' : '❌ No save data'}</div>
        
        {lastSaveEvent && (
          <div>
            Last action: {lastSaveEvent.action} at {new Date(lastSaveEvent.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
};
```

### 4. Export Your Game

```typescript
// src/games/your-game/index.ts
export { YourGame, default } from './YourGame';
export type { YourGameData } from './types';
export { YourGameController } from './controller';
```

### 5. Add to Game Selection

Update `src/App.tsx` to include your game:

```typescript
// Add import
import { YourGame } from './games/your-game';

// Add to currentGame state options
const [currentGame, setCurrentGame] = useState<string>('demo'); // Add 'your-game' option

// Add button in game selection
<button 
  onClick={() => setCurrentGame('your-game')}
  style={{ /* styling */ }}
>
  🎮 Your Game Name
</button>

// Add game rendering
{currentGame === 'your-game' && <YourGame playerId={playerId} />}
```

## Features You Get Automatically

### ✅ Automatic Save/Load
- Game state is automatically saved when it changes (debounced)
- Game state is automatically loaded when the component mounts
- Configurable auto-save interval

### ✅ Manual Save Management
- `saveGame()` - Manually save current state
- `loadGame()` - Load saved state
- `dropSave()` - Delete saved state (with confirmation)

### ✅ Save Status Tracking
- `hasSave` - Boolean indicating if save data exists
- `lastSaveEvent` - Information about the last save/load/drop action
- `isLoading` - Boolean for initial load state

### ✅ Auto-Save Control
- `autoSaveEnabled` - Current auto-save status
- `toggleAutoSave()` - Enable/disable auto-save

## Best Practices

### Game State Management
- Always use `setGameState()` to update the game state (not direct mutation)
- Include timestamp updates by updating `lastModified` 
- Set `isComplete` when the game is finished
- Update `score` for scoring systems

### Save Performance
- Auto-save is debounced to prevent excessive saves
- Only save when game state actually changes
- Use reasonable auto-save intervals (10-30 seconds recommended)

### Error Handling
- The save/load system handles errors gracefully
- Check `lastSaveEvent.success` for save operation results
- Provide user feedback for manual save operations

### Type Safety
- Extend `Record<string, unknown>` for your game data interface
- Use proper TypeScript types throughout your game
- Validate state in your `GameController.validateState()` method

## Example: Counter Game

See `src/games/counter/` for a complete working example that demonstrates all features:
- Auto-save/load functionality
- Manual save management
- State validation
- User feedback
- Game completion detection

This example shows how to create a simple but complete game with full save/load integration.