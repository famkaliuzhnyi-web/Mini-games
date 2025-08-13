import './App.css'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { useGameSession } from './hooks/useGameSession'
import { NameEntry, Profile, GameContainer, GamesList, Navigation, InstallPrompt, ErrorBoundary } from './components'

// Component for the main games list/name entry page
function MainPage() {
  const navigation = useGameSession()

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
  const navigation = useGameSession()

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
  const navigation = useGameSession()

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
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
        <InstallPrompt />
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
