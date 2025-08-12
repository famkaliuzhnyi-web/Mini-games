import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useGameConnection } from './hooks/useGameConnection'

function App() {
  const [count, setCount] = useState(0)
  const [playerId] = useState(() => `player_${Math.random().toString(36).substr(2, 9)}`)
  const [playerName, setPlayerName] = useState('')
  const [message, setMessage] = useState('')
  
  const {
    isOnline,
    isConnected,
    connectionState,
    gameState,
    updateGameState,
    joinGame,
    leaveGame,
    sendGameAction
  } = useGameConnection()

  // Join game when component mounts
  useEffect(() => {
    if (playerName) {
      joinGame({
        playerId,
        name: playerName,
        joinedAt: new Date().toISOString()
      })
    }

    // Cleanup: leave game when component unmounts
    return () => {
      if (playerName) {
        leaveGame(playerId)
      }
    }
  }, [playerName, playerId, joinGame, leaveGame])

  const handleJoinGame = () => {
    if (!playerName.trim()) {
      alert('Please enter your name first!')
      return
    }
    
    joinGame({
      playerId,
      name: playerName.trim(),
      joinedAt: new Date().toISOString()
    })
  }

  const handleSendMessage = () => {
    if (!message.trim()) return
    
    sendGameAction({
      type: 'CHAT_MESSAGE',
      playerId,
      playerName,
      message: message.trim(),
      timestamp: new Date().toISOString()
    })
    
    setMessage('')
  }

  const handleUpdateCount = () => {
    const newCount = count + 1
    setCount(newCount)
    
    // Send count update to all players
    sendGameAction({
      type: 'COUNT_UPDATE',
      playerId,
      playerName,
      count: newCount,
      timestamp: new Date().toISOString()
    })
  }

  const handleUpdateGameState = () => {
    updateGameState({
      gameData: {
        globalCount: count,
        lastUpdatedBy: playerName || playerId,
        timestamp: new Date().toISOString()
      },
      lastUpdated: new Date().toISOString()
    })
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Mini Games - WebSocket Demo</h1>
      
      {/* Connection Status */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: isOnline ? 'green' : 'red' }}>
            🌐 {isOnline ? 'Online' : 'Offline'}
          </span>
          <span style={{ color: isConnected ? 'green' : 'orange' }}>
            🔌 WebSocket: {connectionState}
          </span>
        </div>
      </div>

      {/* Player Setup */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Player Setup</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button onClick={handleJoinGame} disabled={!playerName.trim()}>
            Join Game
          </button>
        </div>
        {playerName && (
          <p style={{ marginTop: '0.5rem' }}>
            Playing as: <strong>{playerName}</strong> (ID: {playerId})
          </p>
        )}
      </div>

      {/* Game Actions */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Game Actions</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={handleUpdateCount}>
            Local Count: {count}
          </button>
          <button onClick={handleUpdateGameState} disabled={!isConnected && isOnline}>
            Sync Global State
          </button>
        </div>
        
        {gameState?.gameData && (
          <div style={{ marginTop: '1rem', padding: '1rem', background: '#f0f0f0', borderRadius: '4px' }}>
            <h4>Global Game State</h4>
            <p>Global Count: {gameState.gameData.globalCount || 0}</p>
            <p>Last Updated By: {gameState.gameData.lastUpdatedBy || 'Unknown'}</p>
            <p>Last Updated: {gameState.lastUpdated ? new Date(gameState.lastUpdated).toLocaleString() : 'Never'}</p>
          </div>
        )}
      </div>

      {/* Chat */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Chat / Messaging</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc', minWidth: '200px' }}
          />
          <button onClick={handleSendMessage} disabled={!message.trim()}>
            Send Message
          </button>
        </div>
      </div>

      {/* Players List */}
      {gameState?.players && Object.keys(gameState.players).length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Connected Players</h3>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {Object.entries(gameState.players).map(([id, player]: [string, any]) => (
              <div key={id} style={{ 
                padding: '0.5rem', 
                background: id === playerId ? '#e3f2fd' : '#f5f5f5', 
                borderRadius: '4px',
                border: id === playerId ? '2px solid #2196f3' : '1px solid #ddd'
              }}>
                <strong>{player.name}</strong>
                <br />
                <small>ID: {id}</small>
                {id === playerId && <div style={{ color: '#2196f3', fontSize: '0.8em' }}>You</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <p>
          This demo showcases:
        </p>
        <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
          <li>✅ Real-time WebSocket communication</li>
          <li>✅ Offline mode with web workers</li>
          <li>✅ Automatic reconnection</li>
          <li>✅ Data caching for offline use</li>
          <li>✅ Multi-player state synchronization</li>
        </ul>
      </div>

      <p className="read-the-docs">
        Try going offline (disconnect network) to see offline mode in action!
      </p>
    </>
  )
}

export default App
