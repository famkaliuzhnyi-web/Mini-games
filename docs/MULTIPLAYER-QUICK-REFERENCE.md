# 🎮 Multiplayer Quick Reference Guide

## Quick Start Flow

### For Players
1. **Host**: Create session → Share QR code
2. **Guests**: Scan QR code → Auto-join session  
3. **Host**: Select any game → All players auto-navigate
4. **All**: Play together in real-time

### For Developers
1. Import `multiplayerService` from `src/services/MultiplayerService`
2. Add multiplayer event listeners to your game component
3. Implement `sendGameMove()` and handle `game-move` events
4. Add `MultiplayerLobby` component for session management

## 🔧 Essential Code Snippets

### Basic Game Integration
```typescript
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerLobby } from '../../components/multiplayer';

// Listen for moves from other players
useEffect(() => {
  const handleGameMove = (data: GameMoveData) => {
    if (data.gameId === 'your-game-id') {
      applyMove(data.move);
    }
  };
  
  multiplayerService.on('game-move', handleGameMove);
  return () => multiplayerService.off('game-move', handleGameMove);
}, []);

// Send move to other players
const makeMove = async (moveData) => {
  updateLocalState(moveData);
  
  if (multiplayerService.getCurrentSession()) {
    await multiplayerService.sendGameMove({
      gameId: 'your-game-id',
      playerId: currentPlayerId,
      move: moveData
    });
  }
};
```

### WIP Message for Unsupported Games
```typescript
export const UnsupportedMultiplayerSlot: React.FC = () => (
  <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '400px', backgroundColor: '#f5f5f5',
    border: '2px dashed #ccc', borderRadius: '8px', padding: '2rem',
    textAlign: 'center'
  }}>
    <h3 style={{ color: '#666', marginBottom: '1rem' }}>🚧 Multiplayer Development</h3>
    <p style={{ color: '#888', fontSize: '1.1rem' }}>Multiplayer is WIP for this game</p>
  </div>
);
```

## 📊 Implementation Status

| Game | Status | Features |
|------|--------|----------|
| Tic-Tac-Toe | ✅ Complete | Real-time moves, turn validation, winner detection |
| Snake | 🚧 Partial | Multi-snake logic, needs WebRTC integration |
| Drawing | 🚧 Partial | Multiplayer types, needs message handling |
| 2048 | ❌ None | Shows "WIP" message |
| Tetris | ❌ None | Shows "WIP" message |
| Sudoku | ❌ None | Shows "WIP" message |
| Ping Pong | ❌ None | Shows "WIP" message |

## 🛠️ Key Components

### Services
- `WebRTCMultiplayerService` - Core multiplayer functionality
- `QRCodeDisplay` - Session sharing via QR codes
- `MultiplayerLobby` - Player management and session controls

### Message Types
- `player-join/leave` - Session management
- `game-select/start` - Game coordination  
- `game-move/state` - Real-time gameplay
- `session-sync` - State synchronization

### Connection States
- `connecting` → `connected` → `playing`
- Auto-reconnection for dropped connections
- Fallback to localStorage for local testing

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| QR codes not working | Ensure HTTPS deployment |
| Connections failing | Check STUN server access |
| Games not syncing | Verify WebRTC data channels |
| Players can't join | Confirm session URL format |

## 📱 Browser Requirements

- **Minimum**: Chrome 56+, Firefox 50+, Safari 11+, Edge 79+
- **Required**: HTTPS (except localhost)
- **Optimal**: Modern browser with full WebRTC support

## 🔗 Quick Links

- **Full Documentation**: [`docs/WEBRTC-MULTIPLAYER.md`](./WEBRTC-MULTIPLAYER.md)
- **Working Example**: [`src/games/tic-tac-toe/SlotComponents.tsx`](../src/games/tic-tac-toe/SlotComponents.tsx)
- **Demo Page**: [`public/test-multiplayer.html`](../public/test-multiplayer.html)
- **Service Implementation**: [`src/services/MultiplayerService.ts`](../src/services/MultiplayerService.ts)

---
*Need help? Check the full documentation or examine the tic-tac-toe implementation for a working example.*