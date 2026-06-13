// ─── Identity ────────────────────────────────────────────────────────────────

export type PlayerId = string;

export interface Player {
  id: PlayerId;
  name: string;
  joinedAt: number;
}

// ─── Session snapshot (sent to late joiners) ─────────────────────────────────

export interface SessionSnapshot {
  id: string;
  hostId: PlayerId;
  peers: Player[];           // all connected peers excluding host
  currentRoute: string;
}

// ─── Wire messages (travel over WebRTC data channels) ────────────────────────

export type Message =
  // Guest → Host: introduce yourself after data channel opens
  | { type: 'peer:hello'; player: Player }

  // Host → All: someone left (used when host relays a departure to remaining peers)
  | { type: 'peer:bye'; playerId: PlayerId }

  // Host → new Guest: full current state so they can catch up
  | { type: 'session:sync'; snapshot: SessionSnapshot }

  // Host → All: follow me to this route right now
  | { type: 'navigate'; route: string }

  // Any → Host → All: a game action from a player.
  // fromId is the original sender; host stamps it before relaying.
  | { type: 'game:action'; gameId: string; action: unknown; fromId: PlayerId; seq: number }

  // Host → requesting Guest: current game state for a late joiner
  | { type: 'game:snapshot'; gameId: string; state: unknown }

  // Guest → Host: I just joined mid-game, please send me a snapshot
  | { type: 'game:request-snapshot'; gameId: string };
