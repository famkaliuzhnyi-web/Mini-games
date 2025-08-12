import './App.css'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useNavigation } from './hooks/useNavigation'
import { useGameConnection } from './hooks/useGameConnection'
import { NameEntry } from './components/NameEntry'
import { GamesList } from './components/GamesList'
import { GameContainer } from './components/GameContainer'
import { Navigation } from './components/Navigation'
import { Profile } from './components/Profile'
import { useEffect } from 'react'

// Component for the main games list/name entry page
function MainPage() {
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

  // Show name entry if no player name, otherwise show games list
  if (!navigation.playerName) {
    return <NameEntry onNameSubmit={navigation.setPlayerName} />
  }

  return (
    <div className="app">
      <Navigation
        playerName={navigation.playerName}
        showHomeButton={false}
        onHomeClick={navigation.goHome}
        onProfileClick={navigation.showProfile}
      />
      <GamesList onGameSelect={navigation.playGame} />
    </div>
  )
}

// Component for playing a specific game
function GamePage() {
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

  // Redirect to main page if no player name or no game selected
  if (!navigation.playerName || !navigation.currentGame) {
    return <MainPage />
  }

  return (
    <div className="app">
      <Navigation
        playerName={navigation.playerName}
        showHomeButton={true}
        onHomeClick={navigation.goHome}
        onProfileClick={navigation.showProfile}
      />
      <GameContainer
        gameId={navigation.currentGame}
        playerId={navigation.playerId}
        playerName={navigation.playerName}
      />
    </div>
  )
}

// Component for the profile page
function ProfilePage() {
  const navigation = useNavigation()

  // Redirect to main page if no player name
  if (!navigation.playerName) {
    return <MainPage />
  }

  return (
    <Profile
      playerName={navigation.playerName}
      onNameUpdate={navigation.setPlayerName}
      onBack={navigation.showGamesList}
    />
  )
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/game/:gameId" element={<GamePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Routes>
    </HashRouter>
  )
}

export default App
