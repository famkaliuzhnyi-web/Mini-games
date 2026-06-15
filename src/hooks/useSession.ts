import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { SessionManager } from '../core/session/SessionManager';
import type { Player, PlayerId } from '../core';

// ─── Context ─────────────────────────────────────────────────────────────────

export const SessionContext = createContext<SessionManager | null>(null);

// ─── State shape ──────────────────────────────────────────────────────────────

export interface SessionState {
  status: 'idle' | 'hosting' | 'joining' | 'connected' | 'error';
  sessionId: string | null;
  role: 'host' | 'guest' | null;
  localPlayer: Player | null;
  peers: Player[];
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Provides reactive session state and all session actions.
 *
 * Must be used inside a component tree wrapped with SessionContext.Provider.
 */
export function useSession() {
  const manager = useContext(SessionContext);
  if (!manager) throw new Error('useSession must be used inside <SessionContext.Provider>');

  const [state, setState] = useState<SessionState>({
    status: 'idle',
    sessionId: null,
    role: null,
    localPlayer: null,
    peers: [],
    error: null,
  });

  // Sync reactive peers list from manager events
  useEffect(() => {
    const offJoined = manager.on('peer-joined', player => {
      setState(s => ({ ...s, peers: [...s.peers.filter(p => p.id !== player.id), player] }));
    });

    const offLeft = manager.on('peer-left', (id: PlayerId) => {
      setState(s => ({ ...s, peers: s.peers.filter(p => p.id !== id) }));
    });

    const offConnected = manager.on('connected', () => {
      setState(s => ({ ...s, status: 'connected', error: null }));
    });

    const offDisconnected = manager.on('disconnected', () => {
      setState({
        status: 'idle',
        sessionId: null,
        role: null,
        localPlayer: null,
        peers: [],
        error: null,
      });
    });

    return () => { offJoined(); offLeft(); offConnected(); offDisconnected(); };
  }, [manager]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const createSession = useCallback(async (player: Player) => {
    setState(s => ({ ...s, status: 'hosting', error: null }));
    try {
      const sessionId = await manager.createSession(player);
      setState(s => ({
        ...s,
        status: 'hosting',
        sessionId,
        role: 'host',
        localPlayer: player,
      }));
      return sessionId;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to create session';
      setState(s => ({ ...s, status: 'error', error }));
      throw err;
    }
  }, [manager]);

  const joinSession = useCallback(async (sessionId: string, player: Player) => {
    setState(s => ({ ...s, status: 'joining', error: null }));
    try {
      await manager.joinSession(sessionId, player);
      setState(s => ({
        ...s,
        status: 'joining', // moves to 'connected' when data channel opens
        sessionId,
        role: 'guest',
        localPlayer: player,
      }));
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to join session';
      setState(s => ({ ...s, status: 'error', error }));
      throw err;
    }
  }, [manager]);

  const leaveSession = useCallback(() => {
    manager.leave();
  }, [manager]);

  const navigateTo = useCallback((route: string) => {
    manager.navigateTo(route);
  }, [manager]);

  const sendAction = useCallback((gameId: string, action: unknown) => {
    manager.sendAction(gameId, action);
  }, [manager]);

  const requestSnapshot = useCallback((gameId: string) => {
    manager.requestSnapshot(gameId);
  }, [manager]);

  const sendSnapshot = useCallback((gameId: string, state: unknown, toPeerId: PlayerId) => {
    manager.sendSnapshot(gameId, state, toPeerId);
  }, [manager]);

  const broadcastSnapshot = useCallback((gameId: string, state: unknown) => {
    manager.broadcastSnapshot(gameId, state);
  }, [manager]);

  return {
    ...state,
    isInSession: state.status !== 'idle' && state.status !== 'error',
    sessionUrl: manager.sessionId ? manager.getSessionUrl() : null,
    manager, // escape hatch for direct event subscription in game components
    createSession,
    joinSession,
    leaveSession,
    navigateTo,
    sendAction,
    requestSnapshot,
    sendSnapshot,
    broadcastSnapshot,
  };
}

// ─── Utility: subscribe to game events inside a component ────────────────────

/**
 * Subscribe to game:action events for a specific game ID.
 * Callback is stable across renders (uses ref internally).
 */
export function useGameAction<TAction>(
  gameId: string,
  handler: (action: TAction, from: Player, seq: number) => void,
) {
  const manager = useContext(SessionContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!manager) return;
    return manager.on('game-action', ({ gameId: id, action, from, seq }) => {
      if (id === gameId) handlerRef.current(action as TAction, from, seq);
    });
  }, [manager, gameId]);
}

/**
 * Subscribe to game:snapshot events for a specific game ID.
 */
export function useGameSnapshot<TState>(
  gameId: string,
  handler: (state: TState) => void,
) {
  const manager = useContext(SessionContext);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!manager) return;
    return manager.on('game-snapshot', ({ gameId: id, state }) => {
      if (id === gameId) handlerRef.current(state as TState);
    });
  }, [manager, gameId]);
}

/**
 * Subscribe to navigate events so the app router can follow the host.
 */
export function useNavigationSync(onNavigate: (route: string) => void) {
  const manager = useContext(SessionContext);
  const handlerRef = useRef(onNavigate);
  handlerRef.current = onNavigate;

  useEffect(() => {
    if (!manager) return;
    return manager.on('navigate', route => handlerRef.current(route));
  }, [manager]);
}
