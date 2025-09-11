# Mini Games Collection

A comprehensive collection of 8 classic and modern mini-games built with React + TypeScript, featuring real-time multiplayer support, offline capabilities, and PWA installation. Play your favorite games solo or compete with friends online!

🌐 **Live Demo**: [https://famkaliuzhnyi-web.github.io/Mini-games/](https://famkaliuzhnyi-web.github.io/Mini-games/)  
📱 **Mobile-Friendly**: Fully responsive and optimized for mobile devices  
🎮 **8 Games Available**: 2048, Tic-Tac-Toe, Ping Pong, Sudoku, Snake, Drawing, Tetris, IoT Scanner

## 🎯 Available Games

### 🔢 2048
- **Classic number puzzle** - combine tiles to reach 2048
- **Smooth animations** and intuitive touch controls
- **Auto-save functionality** to continue your progress
- **Multiple grid themes** for personalized experience

### ⭕ Tic-Tac-Toe
- **Classic 3x3 strategy game** - get three in a row to win
- **AI opponent** with adjustable difficulty
- **Real-time multiplayer** via WebRTC peer-to-peer connections
- **Tournament-style gameplay** for competitive matches

### 🏓 Ping Pong
- **Classic Pong experience** with modern physics
- **Responsive paddle controls** optimized for all devices
- **AI opponent** with progressive difficulty
- **Full multiplayer support** for head-to-head matches

### 🧩 Sudoku
- **Classic 9x9 number placement puzzle** with four difficulty levels
- **Smart hint system** with strategic suggestions (Easy: 10 hints, Expert: 3 hints)
- **Comprehensive statistics** tracking time, mistakes, and completion rate
- **Auto-save and manual save/load** functionality
- **Multiple puzzle difficulties**: Easy, Medium, Hard, Expert

### 🐍 Snake
- **Classic arcade gameplay** - eat food, grow longer, avoid collisions
- **Smooth controls** optimized for keyboard and touch
- **Progressive difficulty** with increasing speed
- **High score tracking** and auto-save progress

### 🎨 Drawing
- **32x32 pixel canvas** for creative expression
- **Full color palette** with drawing tools
- **Save and load artwork** with persistent storage
- **Multiplayer collaboration** (coming soon)

### 🧱 Tetris
- **Classic block puzzle gameplay** - arrange falling pieces to clear lines
- **Traditional Tetris mechanics** with line clearing and scoring
- **Progressive difficulty** with increasing speed
- **Modern responsive controls** for all devices

### 🌐 IoT Scanner
- **Network device discovery** - scan for IoT devices on your local network
- **Device management interface** with detailed information
- **Real-time network monitoring** and device status
- **Utility tool** for network administrators and tech enthusiasts

*More games in development! Vote for your favorites or suggest new ones in the [Issues](https://github.com/famkaliuzhnyi-web/Mini-games/issues)!*

## ✨ Platform Features

✅ **8 Fully Implemented Games**: 2048, Tic-Tac-Toe, Ping Pong, Sudoku, Snake, Drawing, Tetris, IoT Scanner  
✅ **WebRTC Multiplayer**: Real-time peer-to-peer gaming with QR code joining  
✅ **Progressive Web App**: Install on any device with offline support and native-like experience  
✅ **Auto-Save System**: Your progress is automatically saved and synced across devices  
✅ **Cross-Platform**: Optimized for desktop, tablet, and mobile devices  
✅ **Multiple Themes**: Dark and light themes with system preference detection  
✅ **Coin System**: Earn and track coins across games with persistent storage  
✅ **User Profiles**: Personalized experience with saved preferences and statistics  

### 🌐 Multiplayer Features
- **QR Code Joining**: Host creates session, guests scan QR code to join instantly
- **Real-time Sync**: All game moves synchronized across players via WebRTC
- **Auto-navigation**: Host selects game, all players navigate automatically
- **Drop-in/Drop-out**: Players can connect and disconnect at any time
- **Cross-device**: Play on different devices seamlessly
- **Currently Available**: Tic-Tac-Toe and Ping Pong support full multiplayer, Snake and Drawing have partial support

📖 **[Full Multiplayer Documentation](docs/WEBRTC-MULTIPLAYER.md)** | **[Quick Reference](docs/MULTIPLAYER-QUICK-REFERENCE.md)**  

## 🚀 Getting Started

### For Players
1. Visit the [live demo](https://famkaliuzhnyi-web.github.io/Mini-games/)
2. Enter your name to create your player profile
3. Choose from 8 available games: 2048, Tic-Tac-Toe, Ping Pong, Sudoku, Snake, Drawing, Tetris, or IoT Scanner
4. Enjoy solo play with auto-save, or invite friends for multiplayer matches!
5. Install as a PWA for offline access and native app-like experience

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
- **Real-time Communication**: WebRTC peer-to-peer connections for multiplayer gaming
- **Offline-First Design**: Service Workers and IndexedDB enable games to work without internet
- **State Management**: Automatic game state synchronization and persistence across devices
- **Progressive Web App**: Install on any device for native-like experience with offline support
- **Auto-Save System**: Comprehensive save/load functionality for all games
- **Theme System**: Dynamic theming with dark/light modes and system preference detection

### Game Development Framework
Each game is built as a self-contained module with:
- **Game Logic**: Pure TypeScript game mechanics and algorithms
- **UI Components**: React components for responsive game interfaces  
- **State Management**: Game-specific state with platform integration and persistence
- **Multiplayer Support**: Built-in WebRTC networking for competitive and cooperative play
- **Auto-Save Integration**: Seamless progress saving and restoration

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

## 🛠️ Development Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: CSS Modules + Responsive Design  
- **State**: React Hooks + Context API + IndexedDB persistence
- **Networking**: WebRTC peer-to-peer connections with auto-reconnection
- **Offline**: Service Workers + IndexedDB for PWA functionality
- **Build**: Vite bundler with TypeScript compilation and asset optimization
- **Deployment**: GitHub Actions → GitHub Pages with automated PWA asset management

### Code Quality
- **TypeScript**: Strict type checking for reliability and developer experience
- **ESLint**: Automated code quality and consistency checks with React-specific rules
- **Modular Architecture**: Self-contained game modules with clean interfaces
- **Error Boundaries**: Graceful error handling and recovery throughout the application

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
