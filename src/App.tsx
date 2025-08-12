import { useState, useEffect } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'
import { useGameConnection } from './hooks/useGameConnection'
import { CounterGame } from './games/counter'
import { GameSaveService } from './services/GameSaveService'

function App() {
  const [count, setCount] = useState(0)
  const [playerId] = useState(() => `player_${Math.random().toString(36).substr(2, 9)}`)
  const [playerName, setPlayerName] = useState('')
  const [message, setMessage] = useState('')
  const [currentGame, setCurrentGame] = useState<string>('demo') // 'demo' or 'counter'
  const [savedGames, setSavedGames] = useState<Array<{ gameId: string; savedAt: string; autoSave: boolean }>>([])
  
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

  // Load saved games list
  useEffect(() => {
    if (playerName) {
      const saveService = GameSaveService.getInstance()
      const saves = saveService.getSavedGames(playerId)
      setSavedGames(saves)

      // Listen for save events to update the list
      const handleSaveEvent = () => {
        const updatedSaves = saveService.getSavedGames(playerId)
        setSavedGames(updatedSaves)
      }

      saveService.on('*', handleSaveEvent)

      return () => {
        saveService.off('*', handleSaveEvent)
      }
    }
  }, [playerId, playerName])

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

  // Render game selection
  if (!playerName) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <h1>Mini Games Platform</h1>
        <p>Enter your name to start playing and access save/load functionality</p>
        
        <div className="card" style={{ margin: '2rem 0' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoinGame()}
              style={{ padding: '0.75rem', borderRadius: '4px', border: '1px solid #ccc', fontSize: '1rem' }}
            />
            <button 
              onClick={handleJoinGame} 
              disabled={!playerName.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '1rem',
                backgroundColor: playerName.trim() ? '#4CAF50' : '#ccc',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: playerName.trim() ? 'pointer' : 'not-allowed'
              }}
            >
              Start Playing
            </button>
          </div>
        </div>

        <div className="card">
          <h3>✨ Platform Features</h3>
          <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
            <li>🎮 Multiple games to play</li>
            <li>💾 Automatic save/load functionality</li>
            <li>🗑️ Save management (drop saves)</li>
            <li>🌐 Online multiplayer support</li>
            <li>📱 Offline mode with web workers</li>
            <li>🔄 Automatic reconnection</li>
          </ul>
        </div>
      </div>
    )
  }

  // Render main game platform
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
      <h1>Mini Games Platform</h1>
      
      <div style={{ marginBottom: '1rem' }}>
        <strong>Welcome, {playerName}!</strong> (ID: {playerId})
      </div>
      
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

      {/* Game Selection */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Select a Game</h3>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={() => setCurrentGame('counter')}
            style={{ 
              padding: '0.75rem 1.5rem',
              backgroundColor: currentGame === 'counter' ? '#4CAF50' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🎯 Counter Game
          </button>
          <button 
            onClick={() => setCurrentGame('demo')}
            style={{ 
              padding: '0.75rem 1.5rem',
              backgroundColor: currentGame === 'demo' ? '#4CAF50' : '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔧 WebSocket Demo
          </button>
        </div>
      </div>

      {/* Saved Games Overview */}
      {savedGames.length > 0 && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Your Saved Games</h3>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {savedGames.map((save) => (
              <div key={save.gameId} style={{ 
                padding: '0.5rem', 
                background: '#f5f5f5', 
                borderRadius: '4px',
                border: '1px solid #ddd',
                textAlign: 'center',
                minWidth: '120px'
              }}>
                <strong>{save.gameId}</strong>
                <br />
                <small>{new Date(save.savedAt).toLocaleDateString()}</small>
                <br />
                <small style={{ color: save.autoSave ? '#4CAF50' : '#FF9800' }}>
                  {save.autoSave ? '🔄 Auto' : '📱 Manual'}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Render Current Game */}
      {currentGame === 'counter' && <CounterGame playerId={playerId} />}
      
      {currentGame === 'demo' && (
        <>
          {/* Game Actions */}
          <div className="card" style={{ marginBottom: '1rem' }}>
            <h3>WebSocket Demo Actions</h3>
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
        </>
      )}

      <p className="read-the-docs">
        Try the Counter Game to see automatic save/load functionality in action!
      </p>
    </>
  )
}

export default App
