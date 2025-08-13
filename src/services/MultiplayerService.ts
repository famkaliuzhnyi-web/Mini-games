/**
 * WebRTC-based Multiplayer Service
 * Provides peer-to-peer multiplayer functionality for games
 */

import type {
  MultiplayerService,
  GameSession,
  MultiplayerPlayer,
  CreateSessionOptions,
  JoinSessionOptions,
  MultiplayerMessage,
  MultiplayerEvent,
  MultiplayerEventCallback
} from '../types/multiplayer';

// Default STUN servers for WebRTC (commented out for now as not used)
// const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
//   { urls: 'stun:stun.l.google.com:19302' },
//   { urls: 'stun:stun1.l.google.com:19302' }
// ];

export class WebRTCMultiplayerService implements MultiplayerService {
  private currentSession: GameSession | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private eventListeners: Map<MultiplayerEvent, MultiplayerEventCallback[]> = new Map();
  private isHostRole: boolean = false;
  private localPlayerId: string = '';

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners(): void {
    // Initialize event listener arrays
    const events: MultiplayerEvent[] = [
      'session-created', 'session-joined', 'player-connected', 'player-disconnected',
      'player-ready-changed', 'game-started', 'game-move-received', 'game-state-updated',
      'game-ended', 'connection-error'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  private emit<T>(event: MultiplayerEvent, data: T): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error in multiplayer event callback for ${event}:`, error);
      }
    });
  }

  // Session Management
  async createSession(options: CreateSessionOptions): Promise<GameSession> {
    if (this.currentSession) {
      throw new Error('Already in a session. Leave current session first.');
    }

    this.localPlayerId = this.generateId();
    const sessionId = this.generateId();
    
    const hostPlayer: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: options.hostName,
      role: 'host',
      connectionState: 'connected',
      isReady: false,
      joinedAt: new Date().toISOString()
    };

    this.currentSession = {
      id: sessionId,
      gameId: options.gameId,
      hostId: this.localPlayerId,
      players: [hostPlayer],
      maxPlayers: options.maxPlayers,
      state: 'waiting',
      createdAt: new Date().toISOString()
    };

    this.isHostRole = true;

    console.log(`Created multiplayer session: ${sessionId} for game: ${options.gameId}`);
    this.emit('session-created', this.currentSession);

    return this.currentSession;
  }

  async joinSession(options: JoinSessionOptions): Promise<GameSession> {
    if (this.currentSession) {
      throw new Error('Already in a session. Leave current session first.');
    }

    this.localPlayerId = this.generateId();
    this.isHostRole = false;

    // In a real implementation, this would connect to the host via WebRTC
    // For now, we'll simulate joining by creating a session structure
    const guestPlayer: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: options.playerName,
      role: 'guest',
      connectionState: 'connecting',
      isReady: false,
      joinedAt: new Date().toISOString()
    };

    // This is a simplified version - in reality, we'd need a signaling mechanism
    // to exchange WebRTC offer/answer with the host
    this.currentSession = {
      id: options.sessionId,
      gameId: 'unknown', // Would be received from host
      hostId: 'unknown', // Would be received from host
      players: [guestPlayer],
      maxPlayers: 4,
      state: 'waiting',
      createdAt: new Date().toISOString()
    };

    console.log(`Joined multiplayer session: ${options.sessionId}`);
    this.emit('session-joined', this.currentSession);

    return this.currentSession;
  }

  async leaveSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Close all peer connections
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();
    this.dataChannels.clear();

    const sessionId = this.currentSession.id;
    this.currentSession = null;
    this.isHostRole = false;
    this.localPlayerId = '';

    console.log(`Left multiplayer session: ${sessionId}`);
  }

  // Game Communication
  async sendGameMove(move: Record<string, unknown>): Promise<void> {
    if (!this.currentSession) {
      throw new Error('Not in a multiplayer session');
    }

    const message: MultiplayerMessage = {
      type: 'game-move',
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        gameId: this.currentSession.gameId,
        playerId: this.localPlayerId,
        move
      }
    };

    this.broadcastMessage(message);
  }

  async sendGameState(state: Record<string, unknown>): Promise<void> {
    if (!this.currentSession || !this.isHostRole) {
      throw new Error('Only host can send game state');
    }

    const message: MultiplayerMessage = {
      type: 'game-state',
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        gameId: this.currentSession.gameId,
        state
      }
    };

    this.broadcastMessage(message);
  }

  async setPlayerReady(isReady: boolean): Promise<void> {
    if (!this.currentSession) {
      throw new Error('Not in a multiplayer session');
    }

    // Update local player ready state
    const playerIndex = this.currentSession.players.findIndex(p => p.id === this.localPlayerId);
    if (playerIndex >= 0) {
      this.currentSession.players[playerIndex].isReady = isReady;
    }

    const message: MultiplayerMessage = {
      type: 'player-ready',
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        playerId: this.localPlayerId,
        isReady
      }
    };

    this.broadcastMessage(message);
    this.emit('player-ready-changed', { playerId: this.localPlayerId, isReady });
  }

  private broadcastMessage(message: MultiplayerMessage): void {
    // In a full WebRTC implementation, this would send the message through all data channels
    // For now, we'll just log it
    console.log('Broadcasting message:', message);

    // Simulate receiving the message for local testing
    setTimeout(() => {
      this.handleReceivedMessage(message);
    }, 50);
  }

  private handleReceivedMessage(message: MultiplayerMessage): void {
    console.log('Received multiplayer message:', message);

    switch (message.type) {
      case 'game-move':
        this.emit('game-move-received', message.data);
        break;
      case 'game-state':
        this.emit('game-state-updated', message.data);
        break;
      case 'player-ready':
        this.emit('player-ready-changed', message.data);
        break;
      // Handle other message types...
    }
  }

  // Event Management
  on<T>(event: MultiplayerEvent, callback: MultiplayerEventCallback<T>): void {
    const callbacks = this.eventListeners.get(event) || [];
    callbacks.push(callback as MultiplayerEventCallback);
    this.eventListeners.set(event, callbacks);
  }

  off<T>(event: MultiplayerEvent, callback: MultiplayerEventCallback<T>): void {
    const callbacks = this.eventListeners.get(event) || [];
    const filteredCallbacks = callbacks.filter(cb => cb !== callback);
    this.eventListeners.set(event, filteredCallbacks);
  }

  // State Access
  getCurrentSession(): GameSession | null {
    return this.currentSession;
  }

  isHost(): boolean {
    return this.isHostRole;
  }

  isConnected(): boolean {
    return this.currentSession !== null;
  }

  getSessionUrl(): string | null {
    if (!this.currentSession) {
      return null;
    }
    
    // Generate a shareable URL for the session
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}#/multiplayer/join/${this.currentSession.id}`;
  }

  // Cleanup
  destroy(): void {
    this.leaveSession();
    this.eventListeners.clear();
  }
}

// Singleton instance
export const multiplayerService = new WebRTCMultiplayerService();