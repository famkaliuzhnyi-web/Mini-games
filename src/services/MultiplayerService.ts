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
  MultiplayerEventCallback,
  MessageType
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
  private communicationKey: string = 'multiplayer-session';
  private connectionType: 'local-tab' | 'webrtc' = 'local-tab'; // Track actual connection type

  constructor() {
    this.initializeEventListeners();
    this.initializeCrossTabCommunication();
    
    // Log warning about current implementation
    console.warn('⚠️ WebRTCMultiplayerService: Currently using localStorage for cross-tab communication only. Real WebRTC connections are not implemented yet.');
  }

  private initializeEventListeners(): void {
    // Initialize event listener arrays
    const events: MultiplayerEvent[] = [
      'session-created', 'session-joined', 'player-connected', 'player-disconnected',
      'player-ready-changed', 'game-selected', 'game-started', 'game-move-received', 'game-state-updated',
      'game-ended', 'connection-error'
    ];
    
    events.forEach(event => {
      this.eventListeners.set(event, []);
    });
  }

  private initializeCrossTabCommunication(): void {
    // Listen for storage events to simulate WebRTC communication across tabs/windows
    window.addEventListener('storage', (event) => {
      if (event.key === this.communicationKey && event.newValue) {
        try {
          const message: MultiplayerMessage = JSON.parse(event.newValue);
          // Only process messages not sent by ourselves
          if (message.playerId !== this.localPlayerId) {
            this.handleReceivedMessage(message);
          }
        } catch (error) {
          console.error('Error parsing cross-tab message:', error);
        }
      }
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

  /**
   * Start a game for all players in the current session
   * @param gameId - The ID of the game to start
   * @throws Error if not host or no active session
   */
  async startGame(gameId: string): Promise<void> {
    if (!this.currentSession || !this.isHostRole) {
      throw new Error('Only host can start a game');
    }

    // Update session state
    this.currentSession.state = 'playing';
    this.currentSession.gameId = gameId;

    const message: MultiplayerMessage = {
      type: 'game-start',
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        gameId
      }
    };

    this.broadcastMessage(message);
    this.emit('game-started', { gameId });
  }

  // Public method to select a game within the session
  async selectGame(gameId: string): Promise<void> {
    if (!this.currentSession || !this.isHostRole) {
      throw new Error('Only host can select a game');
    }

    // Update session with selected game
    this.currentSession.gameId = gameId;

    const message: MultiplayerMessage = {
      type: 'game-select',
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        gameId
      }
    };

    this.broadcastMessage(message);
    this.emit('game-selected', { gameId });
  }

  /**
   * Create a new multiplayer session as host
   * @param options - Configuration options for the session
   * @returns Promise resolving to the created session
   * @throws Error if already in a session
   */
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
      connectionType: this.connectionType, // Use actual connection type
      isReady: false,
      joinedAt: new Date().toISOString()
    };

    this.currentSession = {
      id: sessionId,
      gameId: options.gameId, // Optional - can be undefined
      hostId: this.localPlayerId,
      players: [hostPlayer],
      maxPlayers: options.maxPlayers,
      state: 'waiting',
      createdAt: new Date().toISOString()
    };

    this.isHostRole = true;

    console.log(`Created multiplayer session: ${sessionId}${options.gameId ? ` for game: ${options.gameId}` : ' without game selection'}`);
    console.log('🔗 Connection Type: Local Cross-Tab Only (localStorage events)');
    console.log('⚠️ Note: This session only works between tabs in the same browser, not across different devices/browsers');
    this.emit('session-created', this.currentSession);

    return this.currentSession;
  }

  async joinSession(options: JoinSessionOptions): Promise<GameSession> {
    if (this.currentSession) {
      throw new Error('Already in a session. Leave current session first.');
    }

    this.localPlayerId = this.generateId();
    this.isHostRole = false;

    // Create guest player
    const guestPlayer: MultiplayerPlayer = {
      id: this.localPlayerId,
      name: options.playerName,
      role: 'guest',
      connectionState: 'connecting',
      connectionType: this.connectionType, // Use actual connection type
      isReady: false,
      joinedAt: new Date().toISOString()
    };

    // Create local session (will be updated when host responds)
    this.currentSession = {
      id: options.sessionId,
      gameId: undefined, // No game selected yet - will be set by host
      hostId: 'unknown', // Would be received from host
      players: [guestPlayer],
      maxPlayers: 4,
      state: 'waiting',
      createdAt: new Date().toISOString()
    };

    // Send player-join message to notify host
    const joinMessage: MultiplayerMessage = {
      type: 'player-join',
      sessionId: options.sessionId,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        player: guestPlayer
      }
    };

    this.broadcastMessage(joinMessage);

    console.log(`Joined multiplayer session: ${options.sessionId}`);
    console.log('🔗 Connection Type: Local Cross-Tab Only (localStorage events)');
    console.log('⚠️ Note: This session only works between tabs in the same browser, not across different devices/browsers');
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
    // Use localStorage for cross-tab communication to simulate WebRTC
    try {
      localStorage.setItem(this.communicationKey, JSON.stringify(message));
      // Remove the item immediately to trigger storage event for other tabs
      localStorage.removeItem(this.communicationKey);
    } catch (error) {
      console.error('Error broadcasting message:', error);
    }
    
    console.log('📡 Broadcasting message via localStorage (cross-tab only):', message.type);
    console.log('📊 Message details:', message);

    // Also process locally for same-tab scenarios with a small delay
    setTimeout(() => {
      this.handleReceivedMessage(message);
    }, 50);
  }

  private handlePlayerJoinMessage(data: { player: MultiplayerPlayer }): void {
    if (!this.currentSession) {
      return;
    }

    const { player } = data;

    // Check if player is already in the session
    const existingPlayerIndex = this.currentSession.players.findIndex(p => p.id === player.id);
    if (existingPlayerIndex >= 0) {
      // Update existing player info
      this.currentSession.players[existingPlayerIndex] = {
        ...this.currentSession.players[existingPlayerIndex],
        ...player,
        connectionState: 'connected'
      };
    } else {
      // Add new player to session
      const newPlayer = {
        ...player,
        connectionState: 'connected' as const,
        connectionType: this.connectionType // Use actual connection type
      };
      this.currentSession.players.push(newPlayer);
    }

    console.log(`Player joined: ${player.name} (${player.id}) via ${this.connectionType} connection`);
    this.emit('player-connected', { player: { ...player, connectionState: 'connected', connectionType: this.connectionType } });

    // If we're the host, send session sync to the new player
    if (this.isHostRole) {
      this.sendSessionSync(player.id);
    }
  }

  private handleSessionSync(data: { session: GameSession; targetPlayerId: string }): void {
    const { session, targetPlayerId } = data;
    
    // Only process if this sync is meant for us
    if (targetPlayerId !== this.localPlayerId || !this.currentSession) {
      return;
    }

    // Update our session with the host's session data
    this.currentSession = {
      ...this.currentSession,
      ...session,
      // Keep our own player data accurate
      players: session.players.map(p => 
        p.id === this.localPlayerId ? { ...p, ...this.currentSession!.players.find(lp => lp.id === this.localPlayerId) } : p
      )
    };

    console.log('Session synchronized with host data');
  }

  private sendSessionSync(targetPlayerId: string): void {
    if (!this.currentSession) {
      return;
    }

    const syncMessage: MultiplayerMessage = {
      type: 'session-sync' as MessageType,
      sessionId: this.currentSession.id,
      playerId: this.localPlayerId,
      timestamp: new Date().toISOString(),
      data: {
        session: this.currentSession,
        targetPlayerId
      }
    };

    this.broadcastMessage(syncMessage);
  }

  private handleReceivedMessage(message: MultiplayerMessage): void {
    console.log('📨 Received message via localStorage:', message.type);

    // Only process messages for our current session
    if (!this.currentSession || message.sessionId !== this.currentSession.id) {
      console.log('🚫 Message ignored - not for current session');
      return;
    }

    switch (message.type) {
      case 'player-join':
        this.handlePlayerJoinMessage(message.data as { player: MultiplayerPlayer });
        break;
      case 'session-sync':
        this.handleSessionSync(message.data as { session: GameSession; targetPlayerId: string });
        break;
      case 'game-move':
        this.emit('game-move-received', message.data);
        break;
      case 'game-state':
        this.emit('game-state-updated', message.data);
        break;
      case 'player-ready':
        this.emit('player-ready-changed', message.data);
        break;
      case 'game-select':
        // Update session with selected game
        if (this.currentSession && message.data && typeof message.data === 'object' && 'gameId' in message.data) {
          this.currentSession.gameId = message.data.gameId as string;
        }
        this.emit('game-selected', message.data);
        break;
      case 'game-start':
        this.emit('game-started', message.data);
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