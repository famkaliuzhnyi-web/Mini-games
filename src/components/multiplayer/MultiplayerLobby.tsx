/**
 * Multiplayer Lobby Component
 * Shows players in session, ready states, and session controls
 */

import React from 'react';
import type { GameSession } from '../../types/multiplayer';
import { QRCodeDisplay } from './QRCodeDisplay';

interface MultiplayerLobbyProps {
  session: GameSession;
  isHost: boolean;
  currentPlayerId: string;
  sessionUrl?: string | null;
  onPlayerReady: (isReady: boolean) => void;
  onStartGame?: () => void;
  onLeaveSession: () => void;
}

export const MultiplayerLobby: React.FC<MultiplayerLobbyProps> = ({
  session,
  isHost,
  currentPlayerId,
  sessionUrl,
  onPlayerReady,
  onStartGame,
  onLeaveSession
}) => {
  const currentPlayer = session.players.find(p => p.id === currentPlayerId);
  const canStartGame = isHost && session.players.length >= 2 && session.players.every(p => p.isReady);

  const getConnectionStatusColor = (state: string): string => {
    switch (state) {
      case 'connected': return '#4CAF50';
      case 'connecting': return '#FF9800';
      case 'reconnecting': return '#FF9800';
      case 'failed': return '#f44336';
      default: return '#666';
    }
  };

  const getConnectionStatusIcon = (state: string): string => {
    switch (state) {
      case 'connected': return '🟢';
      case 'connecting': return '🟡';
      case 'reconnecting': return '🔄';
      case 'failed': return '🔴';
      default: return '⚫';
    }
  };

  return (
    <div style={{
      padding: '2rem',
      maxWidth: '800px',
      margin: '0 auto'
    }}>
      <div style={{
        textAlign: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: '0 0 0.5rem 0' }}>
          🎮 Multiplayer Lobby
        </h2>
        <p style={{ 
          margin: '0 0 1rem 0',
          color: '#666'
        }}>
          Session: {session.id}
        </p>
        <div style={{
          fontSize: '0.9rem',
          color: '#666'
        }}>
          {session.players.length} / {session.maxPlayers} players
        </div>
      </div>

      {/* QR Code for joining (host only) */}
      {isHost && sessionUrl && (
        <div style={{ marginBottom: '2rem' }}>
          <QRCodeDisplay 
            url={sessionUrl}
            title="Share this QR code for others to join"
            size={180}
          />
        </div>
      )}

      {/* Players List */}
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h3 style={{ margin: '0 0 1rem 0' }}>Players</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {session.players.map((player) => (
            <div
              key={player.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1rem',
                backgroundColor: player.id === currentPlayerId ? '#e3f2fd' : '#f9f9f9',
                border: `1px solid ${player.id === currentPlayerId ? '#2196F3' : '#eee'}`,
                borderRadius: '6px'
              }}
            >
              <div style={{ 
                fontSize: '1.5rem',
                marginRight: '1rem'
              }}>
                {getConnectionStatusIcon(player.connectionState)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  {player.name}
                  {player.role === 'host' && (
                    <span style={{
                      fontSize: '0.8rem',
                      backgroundColor: '#4CAF50',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px'
                    }}>
                      HOST
                    </span>
                  )}
                  {player.id === currentPlayerId && (
                    <span style={{
                      fontSize: '0.8rem',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '12px'
                    }}>
                      YOU
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.9rem',
                  color: getConnectionStatusColor(player.connectionState)
                }}>
                  {player.connectionState}
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontSize: '1.2rem',
                  marginBottom: '0.25rem'
                }}>
                  {player.isReady ? '✅' : '⏳'}
                </div>
                <div style={{
                  fontSize: '0.8rem',
                  color: player.isReady ? '#4CAF50' : '#FF9800'
                }}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Ready Toggle */}
        <button
          onClick={() => onPlayerReady(!currentPlayer?.isReady)}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: currentPlayer?.isReady ? '#4CAF50' : '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {currentPlayer?.isReady ? '✅ Ready' : '⏳ Not Ready'}
        </button>

        {/* Start Game (Host only) */}
        {isHost && onStartGame && (
          <button
            onClick={onStartGame}
            disabled={!canStartGame}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: canStartGame ? '#2196F3' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              cursor: canStartGame ? 'pointer' : 'not-allowed',
              fontWeight: 'bold'
            }}
          >
            🚀 Start Game
          </button>
        )}

        {/* Leave Session */}
        <button
          onClick={onLeaveSession}
          style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          🚪 Leave
        </button>
      </div>

      {/* Game Start Info */}
      {isHost && session.players.length < 2 && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          ℹ️ Waiting for at least one more player to join...
        </div>
      )}

      {isHost && session.players.length >= 2 && !canStartGame && (
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          backgroundColor: '#fff3cd',
          border: '1px solid #ffeaa7',
          borderRadius: '6px',
          textAlign: 'center'
        }}>
          ℹ️ Waiting for all players to be ready...
        </div>
      )}
    </div>
  );
};