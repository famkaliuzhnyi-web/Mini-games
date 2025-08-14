import './App.css'
import { HashRouter, Routes, Route, useParams } from 'react-router-dom'
import { useGameSession } from './hooks/useGameSession'
import { NameEntry, Profile, GameContainer, GamesList, Navigation, InstallPrompt, ErrorBoundary } from './components'
import { useEffect, useState, useMemo } from 'react'
import { ThemeService } from './services/ThemeService'
import { multiplayerService } from './services/MultiplayerService'
import { UserService } from './services/UserService'

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
        onNavigateToGame={navigation.playGame}
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
        onNavigateToGame={navigation.playGame}
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

// Component for multiplayer join page
function MultiplayerJoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const [forceUpdate, setForceUpdate] = useState(0)
  
  // Create a custom navigation that refreshes when forceUpdate changes
  const baseNavigation = useGameSession()
  const navigation = useMemo(() => {
    if (forceUpdate > 0) {
      const profile = UserService.getInstance().loadProfile()
      return {
        ...baseNavigation,
        playerName: profile?.playerName || '',
        playerId: profile?.playerId || baseNavigation.playerId
      }
    }
    return baseNavigation
  }, [baseNavigation, forceUpdate])
  
  const [isJoining, setIsJoining] = useState(true)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    const joinSession = async () => {
      if (!sessionId || !navigation.playerName) return

      try {
        await multiplayerService.joinSession({
          sessionId,
          playerName: navigation.playerName
        })
        setIsJoining(false)
        // Redirect to games list after successful join
        navigation.showGamesList()
      } catch (error) {
        console.error('Failed to join multiplayer session:', error)
        setJoinError('Failed to join multiplayer session')
        setIsJoining(false)
      }
    }

    if (navigation.playerName && sessionId) {
      joinSession()
    }
  }, [sessionId, navigation.playerName, navigation])

  // Show name entry if no player name
  if (!navigation.playerName) {
    const handleNameSubmit = (name: string) => {
      const trimmedName = name.trim();
      if (!trimmedName) return;
      
      // Use UserService directly to save the profile
      const userService = UserService.getInstance();
      userService.saveProfile({
        playerName: trimmedName,
        playerId: navigation.playerId
      });

      // Trigger re-evaluation of navigation state
      setForceUpdate(1);
    };

    return <NameEntry onNameSubmit={handleNameSubmit} />
  }

  if (isJoining) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div>🎮</div>
        <h2>Joining multiplayer session...</h2>
        <p>Please wait while we connect you to the game.</p>
      </div>
    )
  }

  if (joinError) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div>❌</div>
        <h2>Failed to join session</h2>
        <p>{joinError}</p>
        <button onClick={navigation.showGamesList}>Go to Games</button>
      </div>
    )
  }

  // This should not be reached as we redirect after successful join
  return <MainPage />
}

function App() {
  // Initialize theme service
  useEffect(() => {
    ThemeService.getInstance();
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/game/:gameId" element={<GamePage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/multiplayer/join/:sessionId" element={<MultiplayerJoinPage />} />
        </Routes>
        <InstallPrompt />
      </HashRouter>
    </ErrorBoundary>
  )
}

export default App
