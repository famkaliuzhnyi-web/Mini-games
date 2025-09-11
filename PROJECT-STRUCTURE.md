# 📁 Project Structure

This document provides a comprehensive overview of the Mini-games project structure, explaining the purpose and organization of each directory and key files.

## 🏗️ Repository Overview

```
Mini-games/
├── 📄 Configuration Files
│   ├── package.json              # Project dependencies and scripts
│   ├── package-lock.json         # Locked dependency versions
│   ├── tsconfig.json            # TypeScript configuration
│   ├── tsconfig.app.json        # App-specific TypeScript config
│   ├── tsconfig.node.json       # Node-specific TypeScript config
│   ├── vite.config.ts           # Vite build configuration
│   ├── eslint.config.js         # ESLint linting rules
│   └── .gitignore               # Git ignore patterns
│
├── 📚 Documentation
│   ├── README.md                # Main project documentation
│   ├── GAMES.md                 # Detailed games documentation
│   ├── DEVELOPMENT.md           # Developer guide and APIs
│   ├── CONTRIBUTING.md          # Contribution guidelines
│   ├── ROADMAP.md              # Project roadmap and milestones
│   └── PROJECT-STRUCTURE.md     # This file
│
├── 🌐 GitHub Configuration
│   └── .github/
│       └── workflows/           # GitHub Actions CI/CD pipelines
│           └── deploy.yml       # Automated deployment to GitHub Pages
│
├── 🏠 Application Root
│   ├── index.html               # Main HTML template
│   └── public/                  # Static assets served directly
│       ├── vite.svg            # Vite logo asset
│       └── sw.js               # Service Worker for PWA and offline functionality
│
└── 💻 Source Code
    └── src/                     # Main application source code
        ├── main.tsx             # Application entry point
        ├── App.tsx              # Root React component
        ├── App.css              # Global application styles
        ├── index.css            # Base CSS styles and variables
        ├── vite-env.d.ts        # Vite type definitions
        │
        ├── 🎮 games/            # Individual game implementations  
        │   ├── game2048/        # 2048 number puzzle game
        │   ├── tic-tac-toe/     # Tic-Tac-Toe strategy game
        │   ├── ping-pong/       # Ping Pong arcade game
        │   ├── sudoku/          # Sudoku logic puzzle game
        │   ├── snake/           # Snake arcade game
        │   ├── drawing/         # Drawing creative tool
        │   ├── tetris/          # Tetris block puzzle game
        │   ├── iot-scanner/     # IoT device scanning utility
        │   └── [future-games]/  # Template for additional games
        │
        ├── 🧩 components/       # Shared React components
        │   ├── ui/              # Basic UI components (buttons, inputs)
        │   ├── layout/          # Layout components (header, footer)
        │   └── game/            # Game-related shared components
        │
        ├── 🎣 hooks/            # Custom React hooks
        │   ├── useGameConnection.ts  # Platform multiplayer integration
        │   ├── useOfflineSync.ts     # Offline synchronization
        │   └── [custom-hooks]        # Game-specific and utility hooks
        │
        ├── 🛠️ services/         # Core platform services
        │   ├── MultiplayerService.ts # WebRTC peer-to-peer communication
        │   ├── GameSaveService.ts    # Auto-save and progress management
        │   ├── UserService.ts        # User profiles and preferences
        │   ├── ThemeService.ts       # Theme system and customization
        │   ├── CoinService.ts        # Virtual currency system
        │   ├── OfflineService.ts     # Offline data management
        │   └── pwaService.ts         # Progressive Web App functionality
        │
        ├── 🎯 utils/            # Utility functions and helpers
        │   ├── gameUtils.ts          # Game-related utilities
        │   ├── validationUtils.ts    # Input validation helpers
        │   └── [other-utils]         # Various utility functions
        │
        ├── 📝 types/            # TypeScript type definitions
        │   ├── game.ts               # Core game type definitions
        │   ├── platform.ts           # Platform-specific types
        │   └── [domain-types]        # Domain-specific type definitions
        │
        └── 🎨 assets/           # Application assets
            ├── images/               # Image assets
            ├── icons/               # Icon files
            └── react.svg            # React logo
```

## 📁 Directory Breakdown

### 🏠 Root Configuration Files

#### `package.json`
- **Purpose**: Node.js project configuration
- **Contains**: Dependencies, scripts, metadata
- **Key Scripts**:
  - `dev`: Start development server
  - `build`: Build for production
  - `lint`: Run ESLint checks
  - `preview`: Preview production build

#### TypeScript Configuration
- **`tsconfig.json`**: Base TypeScript configuration
- **`tsconfig.app.json`**: Application-specific TypeScript settings
- **`tsconfig.node.json`**: Node.js-specific TypeScript settings

#### Build Configuration
- **`vite.config.ts`**: Vite bundler configuration
- **`eslint.config.js`**: Code quality and style rules

### 📚 Documentation Files

Each documentation file serves a specific purpose:

- **`README.md`**: Project overview, quick start, and user information
- **`GAMES.md`**: Detailed game descriptions, features, and specifications
- **`DEVELOPMENT.md`**: Technical guide for developers and contributors
- **`CONTRIBUTING.md`**: Guidelines for contributing to the project
- **`ROADMAP.md`**: Future plans, milestones, and development timeline
- **`PROJECT-STRUCTURE.md`**: This file - project organization guide

### 🌐 Static Assets (`public/`)

#### `public/sw.js`
- **Purpose**: Service Worker for PWA functionality and offline support
- **Functionality**:
  - Network request caching and offline strategy
  - Game data storage using IndexedDB
  - Background synchronization when online
  - Push notifications support
  - PWA installation and updates

#### Static Files
- Files in `public/` are served directly by Vite
- Used for assets that don't need processing
- Accessible at root URL (e.g., `/vite.svg`)

### 💻 Source Code (`src/`)

#### Application Entry Points

**`main.tsx`**
- React application bootstrap
- Root component mounting
- Global providers setup
- Initial configuration

**`App.tsx`**
- Root React component
- Global layout structure
- Route configuration (future)
- Top-level state management

#### Core Directories

### 🎮 Games Directory (`src/games/`)

Each game is organized as a self-contained module:

```
src/games/example-game/
├── components/              # Game-specific React components
│   ├── GameBoard.tsx       # Main game board component
│   ├── GameControls.tsx    # Game control interface
│   ├── GameStatus.tsx      # Game status display
│   └── [other-components]  # Additional UI components
│
├── hooks/                  # Game-specific React hooks
│   ├── useGameLogic.ts     # Core game logic hook
│   ├── useGameState.ts     # Game state management
│   └── [other-hooks]       # Additional game hooks
│
├── logic/                  # Pure TypeScript game logic
│   ├── GameEngine.ts       # Core game mechanics
│   ├── GameValidator.ts    # Move validation logic
│   ├── GameSolver.ts       # AI solver (if applicable)
│   └── [other-logic]       # Additional game logic
│
├── types/                  # Game-specific type definitions
│   ├── gameState.ts        # Game state types
│   ├── gameActions.ts      # Game action types
│   └── [other-types]       # Additional type definitions
│
├── utils/                  # Game-specific utility functions
│   ├── gameUtils.ts        # General game utilities
│   ├── scoreCalculator.ts  # Scoring logic
│   └── [other-utils]       # Additional utilities
│
├── styles/                 # Game-specific styles
│   ├── GameBoard.module.css # Component-specific styles
│   └── [other-styles]       # Additional style files
│
├── index.ts                # Game module exports
├── README.md               # Game-specific documentation
└── [config-files]          # Game configuration files
```

### 🧩 Components Directory (`src/components/`)

Shared React components organized by category:

```
src/components/
├── ui/                     # Basic UI building blocks
│   ├── Button/             # Reusable button components
│   ├── Input/              # Form input components
│   ├── Modal/              # Modal dialog components
│   ├── Loading/            # Loading indicators
│   └── [other-ui]          # Additional UI components
│
├── layout/                 # Layout and structure components
│   ├── Header/             # Application header
│   ├── Footer/             # Application footer
│   ├── Sidebar/            # Navigation sidebar
│   └── [other-layout]      # Additional layout components
│
├── game/                   # Game-related shared components
│   ├── PlayerList/         # Player list display
│   ├── GameLobby/          # Multiplayer game lobby
│   ├── ScoreBoard/         # Score display component
│   └── [other-game]        # Additional game components
│
└── common/                 # Common utility components
    ├── ErrorBoundary/      # Error handling component
    ├── LazyLoader/         # Lazy loading wrapper
    └── [other-common]      # Additional common components
```

### 🎣 Hooks Directory (`src/hooks/`)

Custom React hooks for reusable logic:

```
src/hooks/
├── platform/               # Platform-specific hooks
│   ├── useGameSession.ts     # Game session management
│   ├── useMultiplayer.ts     # WebRTC multiplayer connections
│   └── useGameSave.ts        # Auto-save and progress hooks
│
├── game/                   # Game-related hooks
│   ├── useGameTimer.ts     # Game timing functionality
│   ├── useScoreTracking.ts # Score management
│   └── useGameAudio.ts     # Audio management
│
└── utility/                # General utility hooks
    ├── useLocalStorage.ts  # Local storage management
    ├── useDebounce.ts      # Debouncing functionality
    └── useMediaQuery.ts    # Responsive design helper
```

### 🛠️ Services Directory (`src/services/`)

Core platform services for cross-cutting concerns:

```
src/services/
├── MultiplayerService.ts     # WebRTC peer-to-peer communication
├── GameSaveService.ts        # Auto-save and game progress management
├── UserService.ts            # User profiles and preferences
├── ThemeService.ts           # Theme system and customization
├── CoinService.ts            # Virtual currency tracking
├── OfflineService.ts         # Offline data management and sync
├── pwaService.ts             # PWA installation and updates
└── [additional-services]     # Future platform services
```

### 📝 Types Directory (`src/types/`)

TypeScript type definitions organized by domain:

```
src/types/
├── game.ts                 # Generic game types and interfaces
├── multiplayer.ts          # WebRTC and multiplayer types
├── coin.ts                 # Virtual currency system types  
├── user.ts                 # User profiles and preferences
└── [domain-types]          # Additional domain-specific types
```

### 🎯 Utils Directory (`src/utils/`)

Utility functions and helper modules:

```
src/utils/
├── gameUtils.ts            # Game-related utilities
├── validationUtils.ts      # Input validation helpers
├── formatUtils.ts          # Data formatting utilities
├── mathUtils.ts            # Mathematical calculations
├── dateUtils.ts            # Date/time utilities
└── [other-utils]           # Additional utility functions
```

## 🔧 Configuration Details

### Development Server Configuration

**Vite Configuration (`vite.config.ts`)**
```typescript
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/Mini-games/' : '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: true,
  }
}));
```

### TypeScript Configuration

**Base Configuration (`tsconfig.json`)**
- Extends Node.js and app-specific configurations
- Enables strict type checking
- Configures path mapping for clean imports

**Application Configuration (`tsconfig.app.json`)**
- App-specific compiler options
- JSX configuration for React
- Module resolution settings

### ESLint Configuration

**Code Quality Rules (`eslint.config.js`)**
- TypeScript-specific rules
- React and React Hooks rules
- Accessibility guidelines
- Code formatting standards

## 🚀 Build Process

### Development Build
1. **Vite Dev Server**: Fast HMR development server
2. **TypeScript Compilation**: Real-time type checking
3. **ESLint Integration**: Live code quality feedback
4. **Asset Processing**: Optimized asset loading

### Production Build
1. **TypeScript Compilation**: Full project type checking
2. **Vite Bundle**: Optimized production bundle
3. **Asset Optimization**: Minification and compression
4. **Source Maps**: Generated for debugging

### Deployment Process
1. **GitHub Actions**: Automated CI/CD pipeline
2. **Build Verification**: Tests and linting checks
3. **GitHub Pages**: Automated deployment
4. **Asset Optimization**: CDN-ready static files

## 📊 File Naming Conventions

### Components
- **PascalCase** for component files: `GameBoard.tsx`
- **camelCase** for utility files: `gameUtils.ts`
- **kebab-case** for CSS modules: `game-board.module.css`

### Directories
- **camelCase** for source directories: `src/gameLogic/`
- **kebab-case** for public directories: `public/game-assets/`

### Types and Interfaces
- **PascalCase** for type names: `GameState`, `PlayerAction`
- **SCREAMING_SNAKE_CASE** for constants: `MAX_PLAYERS`

## 🔍 Finding Your Way Around

### Common Developer Tasks

**Adding a new game:**
1. Create directory in `src/games/[game-name]/`
2. Follow the game template structure
3. Export from `src/games/[game-name]/index.ts`
4. Register in main application router

**Adding shared components:**
1. Create component in appropriate `src/components/` subdirectory
2. Include TypeScript interfaces
3. Add CSS modules if needed
4. Export from directory index file

**Adding platform features:**
1. Create service in `src/services/`
2. Add corresponding types in `src/types/`
3. Create React hook in `src/hooks/`
4. Add utilities in `src/utils/` if needed

### Quick Navigation Tips

- **Game implementations**: Start in `src/games/`
- **Shared UI components**: Check `src/components/`
- **Platform services**: Look in `src/services/`
- **Type definitions**: Find in `src/types/`
- **Documentation**: All `.md` files in root directory

## 🛠️ Development Tools Integration

### VS Code Configuration
- **Workspace settings** for consistent formatting
- **Extension recommendations** for optimal development
- **Debug configurations** for easy debugging
- **Task definitions** for common operations

### Git Workflow
- **Feature branches** for new development
- **Conventional commits** for clear history
- **Pre-commit hooks** for code quality
- **Automated testing** on pull requests

This structure provides a solid foundation for scalable game development while maintaining clear separation of concerns and enabling efficient collaboration among contributors.