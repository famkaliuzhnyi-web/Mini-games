# Mini Games - React + TypeScript with WebSocket & Offline Support

A modern React + TypeScript application with real-time WebSocket communication and offline mode capabilities using Web Workers.

## Features

✅ **React + TypeScript**: Built with Vite for fast development and modern tooling  
✅ **WebSocket Communication**: Real-time multiplayer updates with automatic reconnection  
✅ **Offline Mode**: Web Workers for offline data caching and state management  
✅ **Message Queuing**: Messages are queued when offline and sent when connection is restored  
✅ **Automatic Reconnection**: Exponential backoff reconnection strategy  
✅ **Multi-player Support**: Player join/leave notifications and state synchronization  

## Quick Start

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

## Architecture

### Services

- **WebSocketService**: Handles real-time communication with automatic reconnection
- **OfflineService**: Manages web worker for offline data caching and synchronization
- **useGameConnection**: React hook that integrates both services seamlessly

### Key Components

- **Web Worker** (`public/worker.js`): Handles offline data storage and sync operations
- **WebSocket Integration**: Ensures everyone gets updates right away as required
- **Offline-First Design**: App continues to work even when WebSocket server is unavailable

## Usage

1. **Enter your name** and click "Join Game" to connect as a player
2. **Local Count**: Click to increment counter (works offline)
3. **Chat**: Send messages to other players (queued when offline)
4. **Connection Status**: Shows online/offline and WebSocket connection state

## WebSocket Server

The app expects a WebSocket server on `ws://localhost:8080`. Messages are queued when the server is unavailable and sent when connection is restored.

## Offline Mode

- Data is cached using Web Workers for offline access
- Game state is synchronized when connection is restored
- All user actions continue to work in offline mode

## Development

Built with modern tools:
- **Vite** for fast development and building
- **TypeScript** for type safety
- **React 19** for the latest React features
- **Web Workers** for offline capabilities
- **WebSocket** for real-time communication
