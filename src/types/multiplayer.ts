/**
 * Multiplayer type definitions for WebRTC-based multiplayer gaming
 */

// Player connection states
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

// Player role in multiplayer session
export type PlayerRole = 'host' | 'guest';

// Multiplayer player information
export interface MultiplayerPlayer {
  id: string;
  name: string;
  role: PlayerRole;
  connectionState: ConnectionState;
  isReady: boolean;
  joinedAt: string;
}

// Game session states
export type SessionState = 'creating' | 'waiting' | 'ready' | 'playing' | 'finished' | 'error';

// Multiplayer game session
export interface GameSession {
  id: string;
  gameId?: string; // Optional - set when a game is selected
  hostId: string;
  players: MultiplayerPlayer[];
  maxPlayers: number;
  state: SessionState;
  createdAt: string;
  gameData?: Record<string, unknown>;
}

// WebRTC message types
export type MessageType = 
  | 'player-join' 
  | 'player-leave' 
  | 'player-ready' 
  | 'game-select'
  | 'game-start' 
  | 'game-move' 
  | 'game-state' 
  | 'game-end'
  | 'ping'
  | 'pong';

// Base message structure
export interface MultiplayerMessage<T = unknown> {
  type: MessageType;
  sessionId: string;
  playerId: string;
  timestamp: string;
  data: T;
}

// Specific message payloads
export interface PlayerJoinData {
  player: MultiplayerPlayer;
}

export interface PlayerLeaveData {
  playerId: string;
  reason?: string;
}

export interface PlayerReadyData {
  playerId: string;
  isReady: boolean;
}

export interface GameMoveData {
  gameId: string;
  playerId: string;
  move: Record<string, unknown>;
  gameState?: Record<string, unknown>;
}

export interface GameStateData {
  gameId: string;
  state: Record<string, unknown>;
  currentPlayerId?: string;
}

// WebRTC connection configuration
export interface RTCConfiguration {
  iceServers: RTCIceServer[];
}

// Session creation options
export interface CreateSessionOptions {
  gameId?: string; // Optional - can be set later when selecting a game
  maxPlayers: number;
  hostName: string;
}

// Session join options
export interface JoinSessionOptions {
  sessionId: string;
  playerName: string;
}

// Multiplayer service events
export type MultiplayerEvent = 
  | 'session-created'
  | 'session-joined'
  | 'player-connected'
  | 'player-disconnected'
  | 'player-ready-changed'
  | 'game-selected'
  | 'game-started'
  | 'game-move-received'
  | 'game-state-updated'
  | 'game-ended'
  | 'connection-error';

// Event callback type
export type MultiplayerEventCallback<T = unknown> = (data: T) => void;

// Multiplayer service interface
export interface MultiplayerService {
  // Session management
  createSession(options: CreateSessionOptions): Promise<GameSession>;
  joinSession(options: JoinSessionOptions): Promise<GameSession>;
  leaveSession(): Promise<void>;
  
  // Game state management
  sendGameMove(move: Record<string, unknown>): Promise<void>;
  sendGameState(state: Record<string, unknown>): Promise<void>;
  startGame(gameId: string): Promise<void>;
  selectGame(gameId: string): Promise<void>; // New method for selecting games within session
  
  // Player management
  setPlayerReady(isReady: boolean): Promise<void>;
  
  // Event handling
  on<T>(event: MultiplayerEvent, callback: MultiplayerEventCallback<T>): void;
  off<T>(event: MultiplayerEvent, callback: MultiplayerEventCallback<T>): void;
  
  // State access
  getCurrentSession(): GameSession | null;
  isHost(): boolean;
  isConnected(): boolean;
  getSessionUrl(): string | null;
  
  // Cleanup
  destroy(): void;
}