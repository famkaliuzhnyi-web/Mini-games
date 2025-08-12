import './App.css'
import { useNavigation } from './hooks/useNavigation'
import { useGameConnection } from './hooks/useGameConnection'
import { NameEntry } from './components/NameEntry'
import { GamesList } from './components/GamesList'
import { GameContainer } from './components/GameContainer'
import { Navigation } from './components/Navigation'
import { useEffect } from 'react'

function App() {
  const navigation = useNavigation()
  const {
    joinGame,
    leaveGame
  } = useGameConnection()

  // Join/leave game when player name changes
  useEffect(() => {
    if (navigation.playerName) {
      joinGame({
        playerId: navigation.playerId,
        name: navigation.playerName,
        joinedAt: new Date().toISOString()
      })
    }

    return () => {
      if (navigation.playerName) {
        leaveGame(navigation.playerId)
      }
    }
  }, [navigation.playerName, navigation.playerId, joinGame, leaveGame])

  const renderCurrentView = () => {
    switch (navigation.currentView) {
      case 'name-entry':
        return <NameEntry onNameSubmit={navigation.setPlayerName} />
      
      case 'games-list':
        return <GamesList onGameSelect={navigation.playGame} />
      
      case 'game-playing':
        return (
          <GameContainer
            gameId={navigation.currentGame!}
            playerId={navigation.playerId}
            playerName={navigation.playerName}
          />
        )
      
      default:
        return <NameEntry onNameSubmit={navigation.setPlayerName} />
    }
  }

  return (
    <div className="app">
      {/* Show navigation bar only when user has entered name */}
      {navigation.playerName && (
        <Navigation
          playerName={navigation.playerName}
          showHomeButton={navigation.currentView === 'game-playing'}
          onHomeClick={navigation.goHome}
        />
      )}
      
      {/* Render current view */}
      {renderCurrentView()}
    </div>
  )
  )
}

export default App
