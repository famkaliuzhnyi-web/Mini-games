# Mini Games Collection

A collection of classic and modern mini-games built with React + TypeScript, featuring real-time multiplayer support and offline capabilities. Play your favorite games solo or compete with friends online!

🌐 **Live Demo**: [https://famkaliuzhnyi-web.github.io/Mini-games/](https://famkaliuzhnyi-web.github.io/Mini-games/)  
📱 **Mobile-Friendly**: Fully responsive and optimized for mobile devices  
🎮 **Coming Soon**: Sudoku and more classic games!

## 🎯 Available Games

### 🔢 Sudoku *(Coming Soon)*
- **Classic 9x9 Sudoku puzzles** with multiple difficulty levels
- **Smart hints system** to help you learn and improve
- **Progress tracking** with statistics and achievements
- **Multiplayer mode** - compete to solve puzzles fastest
- **Offline play** - perfect for commuting or travel

### 🎮 More Games Planned
- Memory Match
- 2048
- Snake
- Tic-tac-toe
- Connect Four

*Vote for your favorite games or suggest new ones in the [Issues](https://github.com/famkaliuzhnyi-web/Mini-games/issues)!*

## ✨ Platform Features

✅ **WebRTC Multiplayer**: Real-time peer-to-peer gaming with QR code joining  
✅ **Offline Support**: Play anytime, anywhere with offline mode  
✅ **Cross-platform**: Works on desktop, tablet, and mobile devices  
✅ **No Installation**: Play directly in your browser  
✅ **Progress Sync**: Your achievements and progress saved across devices  
✅ **Auto-reconnect**: Seamless reconnection if connection is lost  

### 🌐 Multiplayer Features
- **QR Code Joining**: Host creates session, guests scan QR code to join instantly
- **Real-time Sync**: All game moves synchronized across players via WebRTC
- **Auto-navigation**: Host selects game, all players navigate automatically
- **Drop-in/Drop-out**: Players can connect and disconnect at any time
- **Cross-device**: Play on different devices seamlessly

📖 **[Full Multiplayer Documentation](docs/analysis/WEBRTC-MULTIPLAYER.md)** | **[Quick Reference](docs/analysis/MULTIPLAYER-QUICK-REFERENCE.md)**  

## 🚀 Getting Started

### For Players
1. Visit the [live demo](https://famkaliuzhnyi-web.github.io/Mini-games/)
2. Choose your game from the available options
3. Play solo or invite friends for multiplayer fun!
4. Works offline - no internet required for single player games

### For Developers
```bash
# Install dependencies
npm install

# Start development server  
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗️ Technical Architecture

### Core Platform Features
- **Real-time Communication**: WebSocket integration for multiplayer gaming
- **Offline-First Design**: Web Workers enable games to work without internet
- **State Management**: Automatic game state synchronization across devices
- **Progressive Web App**: Install on any device for native-like experience

### Game Development Framework
Each game is built as a self-contained module with:
- **Game Logic**: Pure TypeScript game mechanics
- **UI Components**: React components for game interface  
- **State Management**: Game-specific state with platform integration
- **Multiplayer Support**: Built-in networking for competitive play

## 🎮 Game Development Guide

### Adding New Games
1. **Create game directory**: `src/games/[game-name]/`
2. **Implement game logic**: Core game mechanics in TypeScript
3. **Build UI components**: React components for game interface
4. **Add multiplayer support**: Integrate with platform WebSocket system
5. **Test offline mode**: Ensure game works without internet connection

### Game Structure Template
```
src/games/example-game/
├── components/          # React UI components
├── hooks/              # Game-specific React hooks  
├── logic/              # Pure TypeScript game logic
├── types/              # TypeScript type definitions
├── utils/              # Helper functions
└── index.ts            # Game entry point
```

## 📚 Documentation

This project is organized with comprehensive documentation to help developers, contributors, and users:

### 🏠 Quick Access Documentation
- **[REPOSITORY-GUIDE.md](REPOSITORY-GUIDE.md)** - Guide to repository structure and how to work with it
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - How to contribute to the project
- **[QUICK-START.md](QUICK-START.md)** - Quick start guide for developers
- **[ROADMAP.md](ROADMAP.md)** - Project timeline and future plans

### 📊 Generic Analysis (`docs/analysis/`)
Project-wide documentation and architecture guides:
- **[Development Guide](docs/analysis/DEVELOPMENT.md)** - Technical development guide and best practices
- **[Project Structure](docs/analysis/PROJECT-STRUCTURE.md)** - Complete codebase organization guide
- **[Game Development](docs/analysis/GAME-DEVELOPMENT.md)** - General game development guidelines
- **[Shared Functionality](docs/analysis/SHARED-FUNCTIONALITY.md)** - Platform features and utilities

### 💡 Specific Ideas (`docs/ideas/`)
Detailed specifications for games, features, and components:
- **[Games](docs/ideas/games/)** - Individual game designs and specifications
- **[Features](docs/ideas/features/)** - Platform feature proposals and specs
- **[Components](docs/ideas/components/)** - Component design documentation

**See [REPOSITORY-GUIDE.md](REPOSITORY-GUIDE.md) for complete documentation navigation.**

## 🛠️ Development Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: CSS Modules + Responsive Design  
- **State**: React Hooks + Context API
- **Networking**: WebSocket with auto-reconnection
- **Offline**: Web Workers + IndexedDB
- **Testing**: (Testing framework to be added)
- **Deployment**: GitHub Actions → GitHub Pages

### Code Quality
- **TypeScript**: Strict type checking for reliability
- **ESLint**: Automated code quality and consistency checks
- **JSDoc**: Comprehensive inline documentation
- **Error Boundaries**: Graceful error handling and recovery

## 📝 Contributing

We welcome contributions! Here are some ways you can help:

1. **Report bugs** or request features in [Issues](https://github.com/famkaliuzhnyi-web/Mini-games/issues)
2. **Vote for games** you'd like to see added
3. **Submit game implementations** following our development guide
4. **Improve documentation** or fix typos
5. **Enhance the platform** with new features

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-game`
3. Make your changes and test thoroughly  
4. Submit a pull request with clear description

## 🚀 Deployment

The application automatically deploys to GitHub Pages when changes are pushed to the main branch. The live version is available at: [https://famkaliuzhnyi-web.github.io/Mini-games/](https://famkaliuzhnyi-web.github.io/Mini-games/)

### Manual Deployment
```bash
# Build for production
npm run build

# Preview locally (optional)  
npm run preview
```
