# 🛠️ Development Guide

This guide provides comprehensive information for developers who want to contribute to the Mini-games platform or add new games.

## 🏗️ Project Architecture

### Overview
The Mini-games platform is built as a modular system where each game is a self-contained module that integrates with the shared platform services.

```
src/
├── components/         # Shared UI components
├── hooks/             # Shared React hooks
├── services/          # Platform services (WebSocket, Offline)
├── games/             # Individual game modules
│   ├── sudoku/        # Sudoku game implementation
│   └── [new-game]/    # Template for new games
├── utils/             # Shared utility functions
└── types/             # Shared TypeScript types
```

### Platform Services

#### WebRTC Multiplayer Service
Provides real-time peer-to-peer multiplayer functionality:
- Session creation and management with QR code sharing
- WebRTC data channels for low-latency communication
- Automatic connection recovery and reconnection
- Cross-tab communication fallback for local testing
- Real-time game state synchronization

📖 **[WebRTC Multiplayer Documentation](docs/WEBRTC-MULTIPLAYER.md)**

#### Offline Service  
Manages offline functionality using Web Workers:
- Local data caching using IndexedDB
- State synchronization when online
- Background data processing
- Offline-first architecture

#### Game Connection Hook
Provides unified interface for games to interact with platform services:
- Real-time state synchronization
- Player management
- Game session handling
- Cross-platform compatibility

## 🎮 Game Development

### Creating a New Game

#### 1. Set up Game Structure
```bash
# Create game directory
mkdir src/games/[game-name]
cd src/games/[game-name]

# Create standard directories
mkdir components hooks logic types utils
touch index.ts README.md
```

#### 2. Game Module Template
```typescript
// src/games/[game-name]/index.ts
export { default as GameComponent } from './components/GameBoard';
export { useGameLogic } from './hooks/useGameLogic';
export type { GameState, GameAction } from './types';

export const gameConfig = {
  id: 'game-name',
  title: 'Game Name',
  description: 'Game description',
  minPlayers: 1,
  maxPlayers: 4,
  categories: ['puzzle', 'strategy'],
  estimatedDuration: '5-15 minutes',
};
```

#### 3. Game Logic Structure
```typescript
// src/games/[game-name]/logic/GameEngine.ts
export class GameEngine {
  private state: GameState;

  constructor(initialState?: Partial<GameState>) {
    this.state = this.createInitialState(initialState);
  }

  // Core game mechanics
  public makeMove(action: GameAction): GameResult {
    // Implement game logic
    const newState = this.processAction(this.state, action);
    this.state = newState;
    return this.evaluateGameState(newState);
  }

  // State management
  public getState(): GameState {
    return { ...this.state };
  }

  public isValidMove(action: GameAction): boolean {
    // Validate moves
    return true;
  }

  private processAction(state: GameState, action: GameAction): GameState {
    // Process game actions
    return state;
  }
}
```

#### 4. React Integration Hook
```typescript
// src/games/[game-name]/hooks/useGameLogic.ts
import { useState, useCallback } from 'react';
import { useGameConnection } from '../../../hooks/useGameConnection';
import { GameEngine } from '../logic/GameEngine';

export const useGameLogic = () => {
  const [gameEngine] = useState(() => new GameEngine());
  const { sendGameAction, gameState } = useGameConnection();

  const makeMove = useCallback((action: GameAction) => {
    const result = gameEngine.makeMove(action);
    
    // Send to multiplayer if needed
    if (result.isValid) {
      sendGameAction({
        type: 'GAME_MOVE',
        gameId: 'game-name',
        action,
        timestamp: new Date().toISOString()
      });
    }

    return result;
  }, [gameEngine, sendGameAction]);

  return {
    gameState: gameEngine.getState(),
    makeMove,
    isValidMove: gameEngine.isValidMove.bind(gameEngine),
  };
};
```

#### 5. React Components
```typescript
// src/games/[game-name]/components/GameBoard.tsx
import React from 'react';
import { useGameLogic } from '../hooks/useGameLogic';

const GameBoard: React.FC = () => {
  const { gameState, makeMove } = useGameLogic();

  return (
    <div className="game-board">
      {/* Game UI implementation */}
      <div className="game-status">
        Status: {gameState.status}
      </div>
      
      <div className="game-area">
        {/* Game-specific UI elements */}
      </div>
      
      <div className="game-controls">
        {/* Game controls */}
      </div>
    </div>
  );
};

export default GameBoard;
```

### Game Integration Checklist

#### Core Requirements
- [ ] **Game Logic**: Pure TypeScript implementation
- [ ] **React Components**: Responsive UI components  
- [ ] **State Management**: Integration with platform state
- [ ] **TypeScript Types**: Comprehensive type definitions
- [ ] **Error Handling**: Graceful error management

#### Platform Integration
- [ ] **Multiplayer Support**: WebRTC integration for real-time play
- [ ] **Offline Support**: Works without internet connection
- [ ] **State Synchronization**: Consistent state across devices
- [ ] **Player Management**: Multi-player game support

### 🌐 Adding Multiplayer Support

To add multiplayer functionality to your game:

#### 1. Import Multiplayer Service
```typescript
import { multiplayerService } from '../../../services/MultiplayerService';
import { MultiplayerLobby } from '../../../components/multiplayer';
```

#### 2. Add Multiplayer Event Handling
```typescript
// In your game component
useEffect(() => {
  const handleGameMove = (data: GameMoveData) => {
    if (data.gameId === 'your-game-id') {
      applyMoveToGameState(data.move);
    }
  };
  
  multiplayerService.on('game-move', handleGameMove);
  return () => multiplayerService.off('game-move', handleGameMove);
}, []);
```

#### 3. Send Game Moves
```typescript
const makeMove = async (moveData: YourMoveData) => {
  // Update local state immediately
  updateLocalGameState(moveData);
  
  // Broadcast to other players
  if (multiplayerService.getCurrentSession()) {
    await multiplayerService.sendGameMove({
      gameId: 'your-game-id',
      playerId: currentPlayerId,
      move: moveData
    });
  }
};
```

#### 4. Add Lobby Component
```typescript
{multiplayerSession && (
  <MultiplayerLobby
    session={multiplayerSession}
    isHost={multiplayerService.isHost()}
    currentPlayerId={playerId}
    sessionUrl={sessionUrl}
    onPlayerReady={handlePlayerReady}
    onLeaveSession={handleLeaveSession}
  />
)}
```

See **[tic-tac-toe implementation](src/games/tic-tac-toe/SlotComponents.tsx)** for a complete working example.

📖 **[Full Multiplayer Documentation](docs/WEBRTC-MULTIPLAYER.md)** | **[Quick Reference](docs/MULTIPLAYER-QUICK-REFERENCE.md)**

#### Quality Assurance
- [ ] **Unit Tests**: Game logic testing
- [ ] **Integration Tests**: Platform integration testing
- [ ] **Performance Tests**: 60 FPS gameplay
- [ ] **Accessibility**: Keyboard and screen reader support
- [ ] **Mobile Optimization**: Touch controls and responsive design

## 🧪 Testing Strategy

> **Note**: Testing framework is planned but not yet implemented. The following examples show the intended testing approach.

### Manual Testing Procedures
Currently, all functionality is validated through manual testing:
1. **Functional Testing**: Verify game mechanics, save/load, and UI interactions
2. **Cross-browser Testing**: Test on Chrome, Firefox, Safari, and Edge
3. **Mobile Testing**: Validate touch controls and responsive design
4. **Performance Testing**: Monitor frame rates and loading times

### Planned Unit Testing
```typescript
// src/games/[game-name]/logic/__tests__/GameEngine.test.ts
import { GameEngine } from '../GameEngine';

describe('GameEngine', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('should initialize with default state', () => {
    const state = engine.getState();
    expect(state.status).toBe('waiting');
  });

  it('should validate moves correctly', () => {
    const validMove = { type: 'MOVE', position: [0, 0] };
    expect(engine.isValidMove(validMove)).toBe(true);
  });
});
```

### Planned Integration Testing
```typescript
// src/games/[game-name]/components/__tests__/GameBoard.test.tsx
import { render, fireEvent, screen } from '@testing-library/react';
import GameBoard from '../GameBoard';

describe('GameBoard', () => {
  it('should render game board', () => {
    render(<GameBoard />);
    expect(screen.getByText('Status:')).toBeInTheDocument();
  });

  it('should handle user interactions', () => {
    render(<GameBoard />);
    const gameArea = screen.getByClassName('game-area');
    fireEvent.click(gameArea);
    // Assert game state changes
  });
});
```

## 🎨 UI/UX Guidelines

### Design Principles
- **Consistency**: Follow established design patterns
- **Accessibility**: Support keyboard navigation and screen readers
- **Performance**: Optimize for mobile and low-end devices
- **Responsive**: Work across all screen sizes

### Component Structure
```typescript
// Example component with proper styling and accessibility
const GameButton: React.FC<GameButtonProps> = ({ 
  onClick, 
  disabled, 
  children, 
  'aria-label': ariaLabel 
}) => {
  return (
    <button
      className="game-button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
};
```

### CSS Organization
```css
/* src/games/[game-name]/styles/GameBoard.module.css */
.gameBoard {
  display: grid;
  gap: 1rem;
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.gameArea {
  aspect-ratio: 1;
  background: var(--game-background);
  border-radius: var(--border-radius);
  position: relative;
}

/* Mobile-first responsive design */
@media (max-width: 768px) {
  .gameBoard {
    padding: 0.5rem;
    gap: 0.5rem;
  }
}
```

## 🚀 Performance Optimization

### Game Loop Best Practices
```typescript
// Efficient game loop implementation
class GameLoop {
  private animationId?: number;
  private lastTime = 0;
  private readonly targetFPS = 60;
  private readonly frameTime = 1000 / this.targetFPS;

  start() {
    const loop = (currentTime: number) => {
      const deltaTime = currentTime - this.lastTime;
      
      if (deltaTime >= this.frameTime) {
        this.update(deltaTime);
        this.render();
        this.lastTime = currentTime - (deltaTime % this.frameTime);
      }
      
      this.animationId = requestAnimationFrame(loop);
    };
    
    this.animationId = requestAnimationFrame(loop);
  }
  
  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
```

### Memory Management
- Use object pooling for frequently created/destroyed objects
- Implement proper cleanup in React useEffect hooks
- Avoid memory leaks in event listeners and timers
- Optimize asset loading and caching

## 🔧 Development Tools

### Recommended VS Code Extensions
- TypeScript Hero
- ES7+ React/Redux/React-Native snippets
- Auto Rename Tag
- Prettier - Code formatter
- ESLint
- GitLens

### Build and Development Scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "preview": "vite preview"
  }
}
```

### Debugging Tools
- React Developer Tools
- Redux DevTools (if using Redux)
- Browser Performance profiler
- Network analysis tools

## 📦 Deployment and CI/CD

### Automated Deployment
The project uses GitHub Actions for automated deployment:
- **Build**: Compile TypeScript and bundle assets
- **Test**: Run all tests and linting
- **Deploy**: Deploy to GitHub Pages on main branch

### Environment Configuration
```typescript
// src/config/environment.ts
export const config = {
  websocketUrl: import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
  environment: import.meta.env.MODE,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};
```

## 🤝 Contributing Guidelines

### Code Standards
- Follow TypeScript best practices
- Use meaningful variable and function names
- Write comprehensive JSDoc comments
- Follow React hooks best practices
- Implement proper error boundaries

### Pull Request Process
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/game-name`
3. **Implement** game following this guide
4. **Test** thoroughly on multiple devices
5. **Document** game features and usage
6. **Submit** pull request with clear description

### Review Checklist
- [ ] Code follows project standards
- [ ] All tests pass
- [ ] Performance meets requirements
- [ ] Accessibility standards met
- [ ] Documentation updated
- [ ] Mobile optimization confirmed

## 📚 Additional Resources

### Learning Resources
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [WebSocket API Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Web Workers Guide](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

### Platform APIs
- **Game Connection API**: Real-time multiplayer integration
- **Offline Service API**: Offline data management
- **Analytics API**: Player behavior tracking
- **Achievement API**: Progress and rewards system

### Community
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and ideas
- **Discord**: Real-time community chat (link TBD)
- **Contributing**: See CONTRIBUTING.md for detailed guidelines