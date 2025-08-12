export interface WebSocketMessage {
  type: string;
  payload: unknown;
  timestamp: string;
  id?: string;
}

export interface GameState {
  players: { [key: string]: unknown };
  gameData: unknown;
  lastUpdated: string;
}

export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: { [key: string]: ((data: unknown) => void)[] } = {};
  
  private readonly serverUrl: string;

  constructor(serverUrl = 'ws://localhost:8080') {
    this.serverUrl = serverUrl;
    this.connect();
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(this.serverUrl);
      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      this.handleReconnect();
    }
  }

  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.flushMessageQueue();
      this.emit('connection', { status: 'connected' });
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.ws.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.ws = null;
      this.emit('connection', { status: 'disconnected', code: event.code, reason: event.reason });
      
      if (event.code !== 1000) { // Not a normal closure
        this.handleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.emit('error', { error });
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    // Emit the message to all listeners
    this.emit('message', message);
    
    // Handle specific message types
    switch (message.type) {
      case 'GAME_STATE_UPDATE':
        this.emit('gameStateUpdate', message.payload);
        break;
      case 'PLAYER_JOIN':
        this.emit('playerJoin', message.payload);
        break;
      case 'PLAYER_LEAVE':
        this.emit('playerLeave', message.payload);
        break;
      case 'GAME_ACTION':
        this.emit('gameAction', message.payload);
        break;
      default:
        this.emit(message.type.toLowerCase(), message.payload);
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      this.emit('connectionFailed', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`Attempting to reconnect in ${delay}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  public sendMessage(message: Omit<WebSocketMessage, 'timestamp' | 'id'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      id: Math.random().toString(36).substr(2, 9)
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue the message for later sending
      this.messageQueue.push(fullMessage);
      console.warn('WebSocket not ready, message queued');
    }
  }

  public on<T = unknown>(event: string, callback: (data: T) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback as (data: unknown) => void);
  }

  public off<T = unknown>(event: string, callback: (data: T) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== (callback as (data: unknown) => void));
    }
  }

  private emit(event: string, data: unknown): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  public getConnectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'open';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }

  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Game-specific methods
  public updateGameState(gameState: Partial<GameState>): void {
    this.sendMessage({
      type: 'GAME_STATE_UPDATE',
      payload: gameState
    });
  }

  public joinGame(playerData: unknown): void {
    this.sendMessage({
      type: 'PLAYER_JOIN',
      payload: playerData
    });
  }

  public leaveGame(playerId: string): void {
    this.sendMessage({
      type: 'PLAYER_LEAVE',
      payload: { playerId }
    });
  }

  public sendGameAction(action: unknown): void {
    this.sendMessage({
      type: 'GAME_ACTION',
      payload: action
    });
  }
}