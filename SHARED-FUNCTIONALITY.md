# Shared Game Functionality Documentation

This document explains the shared functionality that has been created to reduce code duplication across games and provide consistent patterns for future game development.

## Overview

The shared functionality provides:
- **BaseGameController**: Abstract base class for game controllers
- **Shared Game Utilities**: Common game mechanics and patterns  
- **Shared UI Components**: Consistent game controls and statistics displays
- **Multiplayer Integration**: Common patterns for multiplayer functionality

## 1. BaseGameController

### Location
`src/components/game/BaseGameController.ts`

### Purpose
Provides a base implementation of the `GameController` interface with common functionality that all games need, reducing boilerplate code.

### Key Features
- Base game state validation (timestamps, required fields, etc.)
- Helper methods for state updates, validation, and common patterns
- Default implementations for save/load callbacks
- Type-safe game data validation framework

### Usage Example

```typescript
import { BaseGameController } from '../../components/game/BaseGameController';
import type { GameConfig } from '../../types/game';

export class MyGameController extends BaseGameController<MyGameData> {
  public readonly config: GameConfig = {
    id: 'my-game',
    name: 'My Game',
    description: 'A great game',
    version: '1.0.0',
    autoSaveEnabled: true,
    autoSaveIntervalMs: 10000
  };

  // Only implement game-specific logic
  protected getInitialGameData(): MyGameData {
    return {
      level: 1,
      score: 0,
      lives: 3
    };
  }

  protected validateGameData(data: MyGameData): boolean {
    return this.isValidNumber(data.level, 1) &&
           this.isValidNumber(data.score, 0) &&
           this.isValidNumber(data.lives, 0, 10);
  }
}
```

### Benefits
- **Reduced Code**: 50-70% less boilerplate code per game controller
- **Consistency**: All games follow the same patterns
- **Type Safety**: Built-in validation helpers prevent common errors
- **Maintainability**: Bug fixes and improvements apply to all games

## 2. Shared Game Utilities

### Location
`src/utils/gameUtils.ts`

### Purpose
Provides common utility functions for game mechanics that appear across multiple games.

### Modules

#### Grid Utilities
```typescript
import { createEmptyGrid, copyGrid, isValidGrid, findEmptyPositions, getNeighbors } from '../utils/gameUtils';

// Create a 3x3 grid filled with zeros
const grid = createEmptyGrid(3, 3, 0);

// Find all empty positions
const emptySpots = findEmptyPositions(grid, 0);

// Get neighboring cells
const neighbors = getNeighbors(1, 1, 3, 3);
```

#### Scoring System
```typescript
import { createScoreSystem, updateScore, resetScore } from '../utils/gameUtils';

const scoring = createScoreSystem(1000); // Start with best score of 1000
const newScoring = updateScore(scoring, 100); // Add 100 points
```

#### Game Statistics
```typescript
import { createInitialStats, updateStats, getWinRate } from '../utils/gameUtils';

const stats = createInitialStats();
const updatedStats = updateStats(stats, { won: true, score: 500, playTime: 60000 });
const winRate = getWinRate(updatedStats); // Returns percentage
```

#### Timer Utilities
```typescript
import { createTimer, pauseTimer, resumeTimer, getElapsedTime, formatTime } from '../utils/gameUtils';

const timer = createTimer();
// ... later
const pausedTimer = pauseTimer(timer);
const resumedTimer = resumeTimer(pausedTimer);
const elapsed = getElapsedTime(resumedTimer);
const formattedTime = formatTime(elapsed); // "05:32"
```

#### Move History (Undo/Redo)
```typescript
import { createMoveHistory, addMove, canUndo, canRedo, getPreviousMove } from '../utils/gameUtils';

const history = createMoveHistory<GameMove>(50); // Keep last 50 moves
const newHistory = addMove(history, moveData);
if (canUndo(newHistory)) {
  const previousMove = getPreviousMove(newHistory);
}
```

## 3. Shared UI Components

### GameControls Component

#### Location
`src/components/game/GameControls.tsx`

#### Purpose
Provides consistent UI for common game controls across all games.

#### Usage
```typescript
import { GameControls } from '../../components/game/GameControls';

<GameControls
  // Save/Load controls
  onSave={() => saveGame()}
  onLoad={() => loadGame()}
  onDropSave={() => dropSave()}
  hasSave={hasSave}
  isLoading={isLoading}
  autoSaveEnabled={autoSaveEnabled}
  onToggleAutoSave={toggleAutoSave}
  lastSaveEvent={lastSaveEvent}
  
  // Game controls
  onNewGame={() => handleNewGame()}
  onPause={() => handlePause()}
  onResume={() => handleResume()}
  isPaused={isPaused}
  
  // Undo/Redo
  onUndo={() => handleUndo()}
  onRedo={() => handleRedo()}
  canUndo={canUndo}
  canRedo={canRedo}
  
  // Display options
  showSaveControls={true}
  showGameControls={true}
  showUndoControls={true}
  compact={false}
/>
```

### GameStatistics Component

#### Location
`src/components/game/GameStatistics.tsx`

#### Purpose
Displays game statistics in a consistent format across all games.

#### Usage
```typescript
import { GameStatistics } from '../../components/game/GameStatistics';

<GameStatistics
  currentScore={gameState.data.score}
  bestScore={gameState.data.bestScore}
  scoreLabel="Points"
  stats={gameState.data.stats}
  timer={gameTimer}
  showTimer={true}
  gameStatus={gameState.data.status}
  isGameComplete={gameState.isComplete}
  gameResult={gameResult}
  showWinRate={true}
  showAverageScore={true}
  customStats={[
    { label: 'Level', value: gameState.data.level, icon: '🎯' },
    { label: 'Lives', value: gameState.data.lives, icon: '❤️' }
  ]}
/>
```

## 4. Multiplayer Integration

### Location
`src/utils/multiplayerUtils.ts`

### Purpose
Provides common patterns for integrating multiplayer functionality into games.

### Usage
```typescript
import { useMultiplayerIntegration, MultiplayerMoveTypes } from '../utils/multiplayerUtils';

const {
  sendMove,
  isConnected,
  playerCount,
  currentPlayers
} = useMultiplayerIntegration({
  gameId: 'my-game',
  playerId: playerId,
  isMultiplayer: isMultiplayerMode,
  onReceiveMove: (move) => {
    // Handle incoming move
    handleOpponentMove(move.data);
  },
  onPlayerJoin: (playerId) => {
    console.log('Player joined:', playerId);
  },
  onPlayerLeave: (playerId) => {
    console.log('Player left:', playerId);
  },
  validateMove: (move) => {
    // Validate move is legal
    return isValidMove(move.data);
  }
});

// Send a move to other players
await sendMove(MultiplayerMoveTypes.GAME_MOVE, moveData);
```

## 5. Migration Guide

### For Existing Games

1. **Update Controller**:
   ```typescript
   // Old way
   export class MyGameController implements GameController<MyGameData> {
     // 100+ lines of boilerplate...
   }

   // New way
   export class MyGameController extends BaseGameController<MyGameData> {
     // 20-30 lines of game-specific logic
   }
   ```

2. **Use Shared Utilities**:
   ```typescript
   // Old way - custom grid implementation
   const grid = Array(3).fill(null).map(() => Array(3).fill(0));
   
   // New way - shared utility
   const grid = createEmptyGrid(3, 3, 0);
   ```

3. **Add Shared UI Components**:
   ```typescript
   // Replace custom save/load UI with shared component
   <GameControls
     onSave={() => saveGame()}
     onLoad={() => loadGame()}
     hasSave={hasSave}
     // ... other props
   />
   ```

### For New Games

1. **Start with BaseGameController**
2. **Use shared utilities for common mechanics**
3. **Use shared UI components for consistency**
4. **Follow established patterns for multiplayer support**

## 6. Benefits Summary

### Code Reduction
- **Controllers**: 50-70% less code per game
- **UI Components**: Reusable controls eliminate duplicate UI code
- **Utilities**: Common algorithms implemented once

### Consistency
- All games follow the same patterns
- Consistent user experience across games
- Standardized save/load behavior

### Maintainability
- Bug fixes apply to all games using shared code
- New features can be added to shared components
- Easier to onboard new developers

### Future-Proofing
- New games automatically get shared functionality improvements
- Easy to add new shared utilities as patterns emerge
- Consistent foundation for advanced features

## 7. Example: Complete Game Integration

See `src/games/tic-tac-toe/refactoredController.ts` for a complete example of how to refactor an existing game to use all the shared functionality.

The refactored controller demonstrates:
- Extending BaseGameController
- Using validation helpers
- Enhanced logging
- State update utilities
- Reduced code complexity

## 8. Contributing New Shared Functionality

When adding new games, look for patterns that could be shared:

1. **Common Game Mechanics**: Add to `gameUtils.ts`
2. **Reusable UI Patterns**: Create new shared components
3. **Controller Patterns**: Enhance BaseGameController
4. **Multiplayer Patterns**: Extend multiplayer utilities

### Guidelines
- Keep shared code generic and configurable
- Add comprehensive TypeScript types
- Include usage examples in documentation
- Test with multiple games before finalizing

## Conclusion

The shared functionality system provides a solid foundation for game development that:
- Reduces development time for new games
- Ensures consistency across the platform
- Makes maintenance and bug fixes easier
- Provides a better developer experience

All future games should use this shared functionality, and existing games can be gradually migrated to take advantage of these improvements.