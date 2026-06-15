import './App.css';
import { HashRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useGameSession } from './hooks/useGameSession';
import { NameEntry, Profile, GameContainer, GamesList, Navigation, InstallPrompt, ErrorBoundary, GameShell } from './components';
import { ThemeService } from './services/ThemeService';
import { UserService } from './services/UserService';
import { SessionContext, useNavigationSync } from './hooks/useSession';
import { createSessionManager } from './core';
import type { SessionManager } from './core/session/SessionManager';

// ── Session manager singleton ─────────────────────────────────────────────────

const managerCtx = createContext<SessionManager | null>(null);

function AppShell({ children }: { children: React.ReactNode }) {
  const manager = useContext(managerCtx)!;
  const navigate = useNavigate();

  // Follow the host's navigation commands
  useNavigationSync(route => navigate(route));

  return <SessionContext.Provider value={manager}>{children}</SessionContext.Provider>;
}

// ── Pages ─────────────────────────────────────────────────────────────────────

function MainPage() {
  const nav = useGameSession();
  if (!nav.playerName) return <NameEntry onNameSubmit={nav.setPlayerName} />;

  return (
    <div className="app">
      <Navigation
        playerName={nav.playerName}
        showHomeButton={false}
        onHomeClick={nav.goHome}
        onProfileClick={nav.showProfile}
        onNavigateToGame={nav.playGame}
      />
      <GamesList onGameSelect={nav.playGame} />
    </div>
  );
}

function GamePage() {
  const nav = useGameSession();
  if (!nav.playerName || !nav.currentGame) return <MainPage />;

  return (
    <div className="app">
      <Navigation
        playerName={nav.playerName}
        showHomeButton={true}
        onHomeClick={nav.goHome}
        onProfileClick={nav.showProfile}
        onNavigateToGame={nav.playGame}
      />
      <GameShell>
        <GameContainer
          gameId={nav.currentGame}
          playerId={nav.playerId}
          playerName={nav.playerName}
        />
      </GameShell>
    </div>
  );
}

function ProfilePage() {
  const nav = useGameSession();
  if (!nav.playerName) return <MainPage />;

  return (
    <Profile
      playerName={nav.playerName}
      onNameUpdate={nav.setPlayerName}
      onBack={nav.showGamesList}
    />
  );
}

/**
 * Handles QR code / link joins.
 * Shows name entry first if needed, then connects to the session.
 */
function JoinPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const userService = UserService.getInstance();
  const [playerName, setPlayerName] = useState(() => userService.loadProfile()?.playerName ?? '');
  const [playerId] = useState(() => userService.loadProfile()?.playerId ?? crypto.randomUUID());
  const manager = useContext(managerCtx)!;

  const [phase, setPhase] = useState<'name' | 'joining' | 'done' | 'error'>('name');
  const [error, setError] = useState('');

  const attemptJoin = async (name: string) => {
    if (!sessionId) return;
    setPhase('joining');
    try {
      await manager.joinSession(sessionId, { id: playerId, name, joinedAt: Date.now() });
      userService.saveProfile({ playerName: name, playerId });
      setPhase('done');
      // Navigate back to main — host will push us to the right game
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not join session');
      setPhase('error');
    }
  };

  if (!playerName) {
    return (
      <NameEntry
        onNameSubmit={name => {
          setPlayerName(name);
          attemptJoin(name);
        }}
      />
    );
  }

  if (phase === 'name') {
    // Name already known — proceed automatically
    useEffect(() => { attemptJoin(playerName); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  }

  if (phase === 'joining') {
    return (
      <div className="join-page">
        <div className="join-page-icon">🎮</div>
        <h2>Joining session…</h2>
        <p>Connecting to <strong>{sessionId}</strong></p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="join-page">
        <div className="join-page-icon">❌</div>
        <h2>Couldn't join</h2>
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Go home</button>
      </div>
    );
  }

  return null;
}

// ── Root ──────────────────────────────────────────────────────────────────────

function App() {
  const manager = useMemo(() => createSessionManager(), []);

  useEffect(() => { ThemeService.getInstance(); }, []);

  return (
    <managerCtx.Provider value={manager}>
      <ErrorBoundary>
        <HashRouter>
          <AppShell>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/game/:gameId" element={<GamePage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/join/:sessionId" element={<JoinPage />} />
            </Routes>
            <InstallPrompt />
          </AppShell>
        </HashRouter>
      </ErrorBoundary>
    </managerCtx.Provider>
  );
}

export default App;
