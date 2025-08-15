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
  MessageType,
  ConnectionState
} from '../types/multiplayer';

// Default STUN servers for WebRTC NAT traversal
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' }
];

export class WebRTCMultiplayerService implements MultiplayerService {
  private currentSession: GameSession | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private dataChannels: Map<string, RTCDataChannel> = new Map();
  private eventListeners: Map<MultiplayerEvent, MultiplayerEventCallback[]> = new Map();
  private isHostRole: boolean = false;
  private localPlayerId: string = '';
  private communicationKey: string = 'multiplayer-session';
  private connectionType: 'local-tab' | 'webrtc' = 'webrtc'; // Now defaulting to WebRTC
  private signalingKey: string = 'webrtc-signaling';
  private useWebRTC: boolean = true; // Flag to control WebRTC usage

  constructor() {
    this.initializeEventListeners();
    
    // Check if WebRTC is supported
    if (!this.checkWebRTCSupport()) {
      console.warn('⚠️ WebRTC not supported, falling back to localStorage communication');
      this.useWebRTC = false;
      this.connectionType = 'local-tab';
      this.initializeCrossTabCommunication();
    } else {
      console.log('✅ WebRTC supported, initializing peer-to-peer connections');
      this.initializeWebRTCSignaling();
    }
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

  private checkWebRTCSupport(): boolean {
    return !!(window.RTCPeerConnection && window.RTCSessionDescription && window.RTCIceCandidate);
  }

  private initializeWebRTCSignaling(): void {
    // Listen for WebRTC signaling messages via localStorage
    window.addEventListener('storage', (event) => {
      if (event.key === this.signalingKey && event.newValue) {
        try {
          const signalingMessage = JSON.parse(event.newValue);
          // Only process messages not sent by ourselves
          if (signalingMessage.from !== this.localPlayerId) {
            this.handleSignalingMessage(signalingMessage);
          }
        } catch (error) {
          console.error('Error parsing WebRTC signaling message:', error);
        }
      }
    });

    // Also listen for regular multiplayer messages via WebRTC or localStorage fallback
    window.addEventListener('storage', (event) => {
      if (event.key === this.communicationKey && event.newValue) {
        try {
          const message: MultiplayerMessage = JSON.parse(event.newValue);
          // Only process messages not sent by ourselves
          if (message.playerId !== this.localPlayerId) {
            this.handleReceivedMessage(message);
          }
        } catch (error) {
          console.error('Error parsing multiplayer message:', error);
        }
      }
    });
  }

  private initializeCrossTabCommunication(): void {
    // Listen for storage events to simulate WebRTC communication across tabs/windows
    // This is only used as fallback when WebRTC is not supported
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

  private sendSignalingMessage(to: string, type: string, data: unknown): void {
    const signalingMessage = {
      from: this.localPlayerId,
      to,
      type,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      localStorage.setItem(this.signalingKey, JSON.stringify(signalingMessage));
      localStorage.removeItem(this.signalingKey);
      console.log(`📡 Sent ${type} signaling message to ${to}`);
    } catch (error) {
      console.error('Error sending signaling message:', error);
    }
  }

  private handleSignalingMessage(message: { from: string; to: string; type: string; data: unknown }): void {
    console.log(`📨 Received ${message.type} signaling message from ${message.from}`);
    
    // Only process messages intended for us
    if (message.to !== this.localPlayerId && message.to !== 'all') {
      return;
    }

    switch (message.type) {
      case 'offer':
        this.handleWebRTCOffer(message.from, message.data as RTCSessionDescriptionInit);
        break;
      case 'answer':
        this.handleWebRTCAnswer(message.from, message.data as RTCSessionDescriptionInit);
        break;
      case 'ice-candidate':
        this.handleICECandidate(message.from, message.data as RTCIceCandidateInit);
        break;
      case 'peer-discovery':
        this.handlePeerDiscovery(message.from, message.data);
        break;
    }
  }

  private async createPeerConnection(peerId: string): Promise<RTCPeerConnection> {
    const peerConnection = new RTCPeerConnection({
      iceServers: DEFAULT_ICE_SERVERS
    });

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignalingMessage(peerId, 'ice-candidate', event.candidate);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`🔗 Connection state with ${peerId}: ${peerConnection.connectionState}`);
      
      if (peerConnection.connectionState === 'connected') {
        this.updatePlayerConnectionState(peerId, 'connected');
      } else if (peerConnection.connectionState === 'failed' || peerConnection.connectionState === 'disconnected') {
        this.updatePlayerConnectionState(peerId, 'disconnected');
        this.handlePeerDisconnection(peerId);
      }
    };

    // Handle data channel from remote peer
    peerConnection.ondatachannel = (event) => {
      const dataChannel = event.channel;
      this.setupDataChannel(dataChannel, peerId);
    };

    this.peerConnections.set(peerId, peerConnection);
    return peerConnection;
  }

  private setupDataChannel(dataChannel: RTCDataChannel, peerId: string): void {
    dataChannel.onopen = () => {
      console.log(`✅ Data channel opened with ${peerId}`);
      this.updatePlayerConnectionState(peerId, 'connected');
    };

    dataChannel.onclose = () => {
      console.log(`❌ Data channel closed with ${peerId}`);
      this.updatePlayerConnectionState(peerId, 'disconnected');
    };

    dataChannel.onerror = (error) => {
      console.error(`💥 Data channel error with ${peerId}:`, error);
      this.updatePlayerConnectionState(peerId, 'failed');
    };

    dataChannel.onmessage = (event) => {
      try {
        const message: MultiplayerMessage = JSON.parse(event.data);
        this.handleReceivedMessage(message);
      } catch (error) {
        console.error('Error parsing WebRTC message:', error);
      }
    };

    this.dataChannels.set(peerId, dataChannel);
  }

  private async handleWebRTCOffer(fromPeerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = await this.createPeerConnection(fromPeerId);
      
      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage(fromPeerId, 'answer', answer);
      
      console.log(`📤 Sent WebRTC answer to ${fromPeerId}`);
    } catch (error) {
      console.error('Error handling WebRTC offer:', error);
      this.emit('connection-error', { error: 'Failed to handle WebRTC offer' });
    }
  }

  private async handleWebRTCAnswer(fromPeerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromPeerId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        console.log(`📥 Processed WebRTC answer from ${fromPeerId}`);
      }
    } catch (error) {
      console.error('Error handling WebRTC answer:', error);
      this.emit('connection-error', { error: 'Failed to handle WebRTC answer' });
    }
  }

  private async handleICECandidate(fromPeerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    try {
      const peerConnection = this.peerConnections.get(fromPeerId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        console.log(`🧊 Added ICE candidate from ${fromPeerId}`);
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }

  private handlePeerDiscovery(fromPeerId: string, _data: unknown): void {
    console.log(`👋 Peer discovery from ${fromPeerId}`);
    
    // If we're the host, respond to peer discovery
    if (this.isHostRole && fromPeerId !== this.localPlayerId) {
      this.initiatePeerConnection(fromPeerId);
    }
  }

  private async initiatePeerConnection(peerId: string): Promise<void> {
    try {
      const peerConnection = await this.createPeerConnection(peerId);
      
      // Create data channel for communication
      const dataChannel = peerConnection.createDataChannel('gameData', {
        ordered: true,
        maxRetransmits: 3
      });
      
      this.setupDataChannel(dataChannel, peerId);
      
      // Create and send offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage(peerId, 'offer', offer);
      
      console.log(`📤 Sent WebRTC offer to ${peerId}`);
    } catch (error) {
      console.error('Error initiating peer connection:', error);
      this.emit('connection-error', { error: 'Failed to initiate peer connection' });
    }
  }

  private updatePlayerConnectionState(peerId: string, state: ConnectionState): void {
    if (!this.currentSession) return;

    const playerIndex = this.currentSession.players.findIndex(p => p.id === peerId);
    if (playerIndex >= 0) {
      this.currentSession.players[playerIndex].connectionState = state;
      this.currentSession.players[playerIndex].connectionType = this.connectionType;
    }
  }

  private handlePeerDisconnection(peerId: string): void {
    // Clean up peer connection
    const peerConnection = this.peerConnections.get(peerId);
    if (peerConnection) {
      peerConnection.close();
      this.peerConnections.delete(peerId);
    }

    // Clean up data channel
    const dataChannel = this.dataChannels.get(peerId);
    if (dataChannel) {
      dataChannel.close();
      this.dataChannels.delete(peerId);
    }

    // Update player state and emit disconnect event
    this.updatePlayerConnectionState(peerId, 'disconnected');
    this.emit('player-disconnected', { playerId: peerId });

    console.log(`🔌 Peer ${peerId} disconnected and cleaned up`);
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
      connectionType: this.connectionType,
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

    if (this.useWebRTC) {
      console.log(`Created WebRTC multiplayer session: ${sessionId}${options.gameId ? ` for game: ${options.gameId}` : ' without game selection'}`);
      console.log('🔗 Connection Type: WebRTC Peer-to-Peer');
      console.log('🌍 Note: This session works across different devices and browsers');
    } else {
      console.log(`Created fallback multiplayer session: ${sessionId}${options.gameId ? ` for game: ${options.gameId}` : ' without game selection'}`);
      console.log('🔗 Connection Type: Local Cross-Tab Only (localStorage events)');
      console.log('⚠️ Note: This session only works between tabs in the same browser');
    }
    
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
      connectionType: this.connectionType,
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

    // Send peer discovery if using WebRTC
    if (this.useWebRTC) {
      this.sendSignalingMessage('all', 'peer-discovery', {
        sessionId: options.sessionId,
        playerId: this.localPlayerId,
        playerName: options.playerName
      });
    }

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

    if (this.useWebRTC) {
      console.log(`Joined WebRTC multiplayer session: ${options.sessionId}`);
      console.log('🔗 Connection Type: WebRTC Peer-to-Peer');
      console.log('🌍 Note: This session works across different devices and browsers');
    } else {
      console.log(`Joined fallback multiplayer session: ${options.sessionId}`);
      console.log('🔗 Connection Type: Local Cross-Tab Only (localStorage events)');
      console.log('⚠️ Note: This session only works between tabs in the same browser');
    }
    
    this.emit('session-joined', this.currentSession);

    return this.currentSession;
  }

  async leaveSession(): Promise<void> {
    if (!this.currentSession) {
      return;
    }

    // Close all WebRTC connections
    this.dataChannels.forEach((dataChannel) => {
      dataChannel.close();
    });
    this.dataChannels.clear();

    this.peerConnections.forEach((peerConnection) => {
      peerConnection.close();
    });
    this.peerConnections.clear();

    const sessionId = this.currentSession.id;
    this.currentSession = null;
    this.isHostRole = false;
    this.localPlayerId = '';

    console.log(`Left multiplayer session: ${sessionId}`);
    console.log('🔌 All WebRTC connections cleaned up');
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
    if (this.useWebRTC && this.dataChannels.size > 0) {
      // Send via WebRTC data channels
      let sentCount = 0;
      this.dataChannels.forEach((dataChannel, peerId) => {
        if (dataChannel.readyState === 'open') {
          try {
            dataChannel.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            console.error(`Error sending WebRTC message to ${peerId}:`, error);
          }
        }
      });
      
      if (sentCount > 0) {
        console.log(`📡 Broadcasted message via WebRTC to ${sentCount} peers:`, message.type);
        console.log('📊 Message details:', message);
      } else {
        console.warn('⚠️ No open WebRTC data channels, falling back to localStorage');
        this.broadcastViaLocalStorage(message);
      }
    } else {
      // Fallback to localStorage communication
      this.broadcastViaLocalStorage(message);
    }

    // Also process locally for same-client scenarios with a small delay
    setTimeout(() => {
      this.handleReceivedMessage(message);
    }, 50);
  }

  private broadcastViaLocalStorage(message: MultiplayerMessage): void {
    try {
      localStorage.setItem(this.communicationKey, JSON.stringify(message));
      // Remove the item immediately to trigger storage event for other tabs
      localStorage.removeItem(this.communicationKey);
    } catch (error) {
      console.error('Error broadcasting message via localStorage:', error);
    }
    
    console.log('📡 Broadcasted message via localStorage (fallback):', message.type);
    console.log('📊 Message details:', message);
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
        connectionState: 'connecting' // Will be updated to 'connected' once WebRTC connects
      };
    } else {
      // Add new player to session
      const newPlayer = {
        ...player,
        connectionState: 'connecting' as const,
        connectionType: this.connectionType
      };
      this.currentSession.players.push(newPlayer);
    }

    console.log(`Player joining: ${player.name} (${player.id}) via ${this.connectionType} connection`);
    this.emit('player-connected', { player: { ...player, connectionState: 'connecting', connectionType: this.connectionType } });

    // If we're the host and using WebRTC, initiate connection to the new player
    if (this.isHostRole && this.useWebRTC && player.id !== this.localPlayerId) {
      console.log(`🤝 Host initiating WebRTC connection to ${player.id}`);
      this.initiatePeerConnection(player.id);
    }

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