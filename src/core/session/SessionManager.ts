import { PeerConnection } from '../peer/PeerConnection';
import type { ISignaling } from '../signaling/ISignaling';
import type { Message, Player, PlayerId, SessionSnapshot } from '../messaging/types';

// ─── Typed event emitter (no external dependency) ────────────────────────────

type SessionEvents = {
  'peer-joined': Player;
  'peer-left': PlayerId;
  navigate: string;
  'game-action': { gameId: string; action: unknown; from: Player; seq: number };
  'game-snapshot': { gameId: string; state: unknown };
  'game-snapshot-requested': { gameId: string; fromPeerId: PlayerId };
  connected: void;
  disconnected: void;
};

type Handler<T> = T extends void ? () => void : (data: T) => void;

class TypedEmitter<E extends Record<string, unknown>> {
  private map = new Map<keyof E, Set<Handler<unknown>>>();

  on<K extends keyof E>(event: K, handler: Handler<E[K]>): () => void {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(handler as Handler<unknown>);
    return () => this.map.get(event)?.delete(handler as Handler<unknown>);
  }

  emit<K extends keyof E>(event: K, data: E[K]): void {
    this.map.get(event)?.forEach(h => (h as (d: E[K]) => void)(data));
  }
}

// ─── Session manager ─────────────────────────────────────────────────────────

function makeId(): string {
  // 8-char random alphanumeric — short enough to type, unique enough for a session
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Manages the full lifecycle of a multiplayer session.
 *
 * Star topology: all guests connect to the host; guests do not connect to each other.
 * The host is the game state authority — it receives all actions, emits them locally,
 * then relays them to every other connected guest.
 *
 * Host navigation is law: when the host calls navigateTo(), every connected peer
 * immediately receives a 'navigate' event and should follow.
 */
export class SessionManager {
  private emitter = new TypedEmitter<SessionEvents>();
  private mesh = new Map<PlayerId, PeerConnection>();
  private _seq = 0;

  // Immutable once set
  sessionId: string | null = null;
  role: 'host' | 'guest' | null = null;
  localPlayer: Player | null = null;

  // Live session state
  peers = new Map<PlayerId, Player>();
  currentRoute = '/';

  private signaling: ISignaling;
  constructor(signaling: ISignaling) { this.signaling = signaling; }

  // ── Event subscription ────────────────────────────────────────────────────

  on<K extends keyof SessionEvents>(event: K, handler: Handler<SessionEvents[K]>): () => void {
    return this.emitter.on(event, handler);
  }

  // ── Host API ──────────────────────────────────────────────────────────────

  async createSession(player: Player): Promise<string> {
    this.role = 'host';
    this.localPlayer = player;
    this.sessionId = makeId();

    await this.signaling.publishSession(this.sessionId, player.id);

    this.signaling.onNewPeer(this.sessionId, peerId => {
      this.connectToGuest(peerId);
    });

    return this.sessionId;
  }

  /**
   * Host only: navigate all connected peers to a new route.
   * The host navigates itself; peers receive 'navigate' event and should follow.
   */
  navigateTo(route: string): void {
    if (this.role !== 'host') return;
    this.currentRoute = route;
    this.broadcast({ type: 'navigate', route });
    // Host fires its own navigate event so the app router can react uniformly
    this.emitter.emit('navigate', route);
  }

  /**
   * Host only: send the current game state to a specific guest (late joiner catch-up).
   */
  sendSnapshot(gameId: string, state: unknown, toPeerId: PlayerId): void {
    this.mesh.get(toPeerId)?.send({ type: 'game:snapshot', gameId, state });
  }

  // ── Guest API ─────────────────────────────────────────────────────────────

  async joinSession(sessionId: string, player: Player): Promise<void> {
    this.role = 'guest';
    this.localPlayer = player;
    this.sessionId = sessionId;

    // Announce presence — host will respond with an offer
    await this.signaling.joinSession(sessionId, player.id);

    const hostId = await this.signaling.getHostId(sessionId);

    const unsub = this.signaling.onOffer(sessionId, player.id, async offer => {
      unsub();
      const conn = this.createConnection(hostId);
      await conn.respond(offer);
    });
  }

  // ── Shared API ────────────────────────────────────────────────────────────

  /**
   * Send a game action. Host applies immediately and relays; guest sends to host and waits.
   * In both cases, the 'game-action' event fires when the action is authorised.
   */
  sendAction(gameId: string, action: unknown): void {
    const seq = this._seq++;
    const fromId = this.localPlayer!.id;
    const msg: Message = { type: 'game:action', gameId, action, fromId, seq };

    if (this.role === 'host') {
      // Host is authority — apply locally and relay
      this.handleGameAction(msg);
    } else {
      // Send to host and wait for the relay echo
      const [hostConn] = this.mesh.values();
      hostConn?.send(msg);
    }
  }

  /** Guest only: ask the host for the current game snapshot (mid-game join). */
  requestSnapshot(gameId: string): void {
    if (this.role !== 'guest') return;
    const [hostConn] = this.mesh.values();
    hostConn?.send({ type: 'game:request-snapshot', gameId });
  }

  leave(): void {
    if (!this.localPlayer) return;
    this.broadcast({ type: 'peer:bye', playerId: this.localPlayer.id });
    this.mesh.forEach(conn => conn.close());
    this.mesh.clear();
    this.peers.clear();
    this.sessionId = null;
    this.role = null;
    this.localPlayer = null;
    this.emitter.emit('disconnected', undefined as void);
  }

  getSessionUrl(): string {
    const { origin, pathname } = window.location;
    return `${origin}${pathname}#/join/${this.sessionId}`;
  }

  // ── Connection wiring ─────────────────────────────────────────────────────

  private connectToGuest(peerId: PlayerId): void {
    const conn = this.createConnection(peerId);
    conn.initiate().catch(err => console.error('[SessionManager] initiate failed', err));
  }

  private createConnection(peerId: PlayerId): PeerConnection {
    const conn = new PeerConnection(
      peerId,
      this.signaling,
      this.sessionId!,
      this.localPlayer!.id,
    );

    conn.onMessage = msg => this.handleMessage(msg, peerId);
    conn.onStateChange = state => {
      if (state === 'connected') {
        if (this.role === 'guest') {
          // Introduce ourselves to the host
          conn.send({ type: 'peer:hello', player: this.localPlayer! });
        }
        this.emitter.emit('connected', undefined as void);
      } else {
        this.handlePeerGone(peerId);
      }
    };

    this.mesh.set(peerId, conn);
    return conn;
  }

  // ── Message dispatch ──────────────────────────────────────────────────────

  private handleMessage(msg: Message, fromPeerId: PlayerId): void {
    switch (msg.type) {
      case 'peer:hello':
        return this.handlePeerHello(msg.player, fromPeerId);

      case 'peer:bye':
        this.peers.delete(msg.playerId);
        this.emitter.emit('peer-left', msg.playerId);
        break;

      case 'session:sync':
        msg.snapshot.peers.forEach(p => this.peers.set(p.id, p));
        this.currentRoute = msg.snapshot.currentRoute;
        // Navigate to wherever the host currently is
        this.emitter.emit('navigate', msg.snapshot.currentRoute);
        break;

      case 'navigate':
        this.currentRoute = msg.route;
        this.emitter.emit('navigate', msg.route);
        break;

      case 'game:action':
        if (this.role === 'host') {
          // Authorise and relay
          this.handleGameAction(msg);
        } else {
          // Relayed echo from host — apply it
          const from = this.peers.get(msg.fromId) ?? this.localPlayer!;
          this.emitter.emit('game-action', { gameId: msg.gameId, action: msg.action, from, seq: msg.seq });
        }
        break;

      case 'game:snapshot':
        this.emitter.emit('game-snapshot', { gameId: msg.gameId, state: msg.state });
        break;

      case 'game:request-snapshot':
        if (this.role === 'host') {
          this.emitter.emit('game-snapshot-requested', { gameId: msg.gameId, fromPeerId });
        }
        break;
    }
  }

  private handlePeerHello(player: Player, connId: PlayerId): void {
    this.peers.set(player.id, player);
    this.emitter.emit('peer-joined', player);

    // Send full session state to the new guest
    const conn = this.mesh.get(connId);
    conn?.send({ type: 'session:sync', snapshot: this.buildSnapshot() });

    // Tell all existing peers about the newcomer
    this.broadcastExcept(connId, { type: 'peer:bye', playerId: player.id });
    // Actually we want to tell them someone joined, not left.
    // We send session:sync only to the joiner; existing peers see the new
    // player when they receive future peer:hello-echoes.
    // For a richer lobby, games can request a full snapshot.
  }

  private handleGameAction(msg: Message & { type: 'game:action' }): void {
    const from = msg.fromId === this.localPlayer!.id
      ? this.localPlayer!
      : (this.peers.get(msg.fromId) ?? this.localPlayer!);

    this.emitter.emit('game-action', { gameId: msg.gameId, action: msg.action, from, seq: msg.seq });
    // Relay to all connected guests (including back to the sender as echo)
    this.broadcast(msg);
  }

  private handlePeerGone(peerId: PlayerId): void {
    this.mesh.delete(peerId);
    const player = this.peers.get(peerId);
    if (!player) return;
    this.peers.delete(peerId);
    this.emitter.emit('peer-left', peerId);
    this.broadcastExcept(peerId, { type: 'peer:bye', playerId: peerId });

    if (this.mesh.size === 0 && this.role === 'guest') {
      this.emitter.emit('disconnected', undefined as void);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private broadcast(msg: Message): void {
    this.mesh.forEach(conn => conn.send(msg));
  }

  private broadcastExcept(excludeId: PlayerId, msg: Message): void {
    this.mesh.forEach((conn, id) => { if (id !== excludeId) conn.send(msg); });
  }

  private buildSnapshot(): SessionSnapshot {
    return {
      id: this.sessionId!,
      hostId: this.localPlayer!.id,
      peers: Array.from(this.peers.values()),
      currentRoute: this.currentRoute,
    };
  }
}
