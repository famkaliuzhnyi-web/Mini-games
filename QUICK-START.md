# ⚡ Quick Start Guide

A developer's quick reference for getting up and running with the Mini-games project.

## 🚀 5-Minute Setup

```bash
# 1. Clone the repository
git clone https://github.com/famkaliuzhnyi-web/Mini-games.git
cd Mini-games

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Open in browser
# http://localhost:5173
```

## 🛠️ Essential Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint checks
npm run lint:fix     # Fix ESLint issues automatically
```

### Testing (Future)
```bash
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage report
```

## 📁 Key Directories

```bash
src/
├── games/           # 🎮 Individual game implementations
├── components/      # 🧩 Shared React components  
├── hooks/           # 🎣 Custom React hooks
├── services/        # 🛠️ Platform services (WebSocket, Offline)
├── types/           # 📝 TypeScript type definitions
└── utils/           # 🎯 Utility functions
```

## 🎮 Adding a New Game

### 1. Create Game Structure
```bash
mkdir src/games/my-game
cd src/games/my-game
mkdir components hooks logic types utils styles
```

### 2. Basic Game Template
```typescript
// src/games/my-game/index.ts
export { default as GameComponent } from './components/GameBoard';
export { useGameLogic } from './hooks/useGameLogic';
export type { GameState, GameAction } from './types';

export const gameConfig = {
  id: 'my-game',
  title: 'My Game',
  description: 'A fun mini-game',
  minPlayers: 1,
  maxPlayers: 4,
};
```

### 3. Game Logic Hook
```typescript
// src/games/my-game/hooks/useGameLogic.ts
import { useState, useCallback } from 'react';
import { useGameConnection } from '../../../hooks/useGameConnection';

export const useGameLogic = () => {
  const [gameState, setGameState] = useState(initialState);
  const { sendGameAction } = useGameConnection();

  const makeMove = useCallback((action) => {
    // Game logic here
    setGameState(newState);
    sendGameAction(action);
  }, [sendGameAction]);

  return { gameState, makeMove };
};
```

### 4. Game Component
```typescript
// src/games/my-game/components/GameBoard.tsx
import React from 'react';
import { useGameLogic } from '../hooks/useGameLogic';

const GameBoard: React.FC = () => {
  const { gameState, makeMove } = useGameLogic();

  return (
    <div className="game-board">
      {/* Your game UI */}
    </div>
  );
};

export default GameBoard;
```

## 🔧 Platform Integration

### WebSocket Multiplayer
```typescript
import { useGameConnection } from '../../hooks/useGameConnection';

const { 
  isConnected,           // WebSocket connection status
  sendGameAction,        // Send action to other players
  gameState,            // Shared game state
  joinGame,             // Join multiplayer session
  leaveGame             // Leave multiplayer session
} = useGameConnection();
```

### Offline Support
```typescript
import { useOfflineSync } from '../../hooks/useOfflineSync';

const {
  isOnline,             // Network status
  syncData,             // Sync data when back online
  cacheGameState        // Cache state for offline use
} = useOfflineSync();
```

## 📝 TypeScript Patterns

### Game State Interface
```typescript
interface GameState {
  readonly status: 'waiting' | 'playing' | 'finished';
  readonly players: Player[];
  readonly currentPlayer: string;
  readonly score: number;
  readonly moves: GameMove[];
}
```

### Game Actions
```typescript
type GameAction = 
  | { type: 'START_GAME'; playerId: string }
  | { type: 'MAKE_MOVE'; move: GameMove }
  | { type: 'END_GAME'; result: GameResult };
```

### Component Props
```typescript
interface GameBoardProps {
  readonly gameId: string;
  readonly isMultiplayer: boolean;
  readonly onGameEnd: (result: GameResult) => void;
}
```

## 🎨 Styling Guidelines

### CSS Modules
```css
/* GameBoard.module.css */
.gameBoard {
  display: grid;
  gap: 1rem;
  max-width: 600px;
  margin: 0 auto;
}

.gameArea {
  background: var(--game-background);
  border-radius: var(--border-radius);
  padding: 1rem;
}

/* Mobile-first responsive design */
@media (max-width: 768px) {
  .gameBoard {
    gap: 0.5rem;
    padding: 0.5rem;
  }
}
```

### CSS Custom Properties
```css
:root {
  --color-primary: #2196f3;
  --color-secondary: #ff9800;
  --color-success: #4caf50;
  --color-error: #f44336;
  
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 2rem;
  
  --border-radius: 8px;
  --font-family: 'Inter', system-ui, sans-serif;
}
```

## 🧪 Testing Patterns

### Unit Tests
```typescript
// GameEngine.test.ts
import { GameEngine } from '../GameEngine';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should initialize correctly', () => {
    expect(engine.getState().status).toBe('waiting');
  });
});
```

### Component Tests
```typescript
// GameBoard.test.tsx
import { render, fireEvent, screen } from '@testing-library/react';
import GameBoard from '../GameBoard';

test('handles user input', () => {
  render(<GameBoard />);
  const button = screen.getByRole('button', { name: /start game/i });
  fireEvent.click(button);
  expect(screen.getByText(/game started/i)).toBeInTheDocument();
});
```

## 🚨 Common Pitfalls

### ❌ Don't
```typescript
// Don't mutate state directly
gameState.score = newScore;

// Don't use any type
const handleMove = (move: any) => { ... };

// Don't forget error handling
const makeMove = async (move) => {
  await api.sendMove(move); // No error handling
};
```

### ✅ Do
```typescript
// Do use immutable updates
setGameState(prev => ({ ...prev, score: newScore }));

// Do use proper types
const handleMove = (move: GameMove) => { ... };

// Do handle errors gracefully
const makeMove = async (move: GameMove) => {
  try {
    await api.sendMove(move);
  } catch (error) {
    console.error('Failed to send move:', error);
    // Handle error appropriately
  }
};
```

## 📚 Useful Resources

### Documentation
- [README.md](README.md) - Project overview
- [DEVELOPMENT.md](DEVELOPMENT.md) - Comprehensive dev guide  
- [GAMES.md](GAMES.md) - Game specifications
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines

### External Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

## 🆘 Getting Help

### Common Issues
1. **Build errors**: Check TypeScript types and imports
2. **WebSocket not connecting**: Verify server is running
3. **Hot reload not working**: Restart dev server
4. **Styling issues**: Check CSS module imports

### Where to Ask
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **Code Review**: Pull request feedback
- **Documentation**: Update docs for unclear areas

## 🔥 Pro Tips

### Development Workflow
1. **Start small**: Begin with basic functionality
2. **Test early**: Write tests alongside code
3. **Mobile first**: Design for mobile, enhance for desktop
4. **Performance**: Profile game loops for 60 FPS
5. **Accessibility**: Test with keyboard navigation

### Code Organization
1. **Single responsibility**: One concern per file/function
2. **Consistent naming**: Follow established conventions
3. **Export patterns**: Use index files for clean imports
4. **Type safety**: Leverage TypeScript fully
5. **Documentation**: Write clear JSDoc comments

### Game Development
1. **Pure logic**: Separate game logic from UI
2. **State machines**: Use clear game states
3. **Validation**: Validate all user inputs
4. **Multiplayer**: Design with real-time sync in mind
5. **Offline first**: Work without internet connection

---

**Happy coding! 🎮**

Need more help? Check out the [DEVELOPMENT.md](DEVELOPMENT.md) for comprehensive guidance or ask in [GitHub Discussions](https://github.com/famkaliuzhnyi-web/Mini-games/discussions).