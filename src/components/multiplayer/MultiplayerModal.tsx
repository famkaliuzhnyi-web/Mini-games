/**
 * Multiplayer Modal Component
 * Modal overlay for multiplayer functionality in the platform header
 */

import React, { useState, useEffect } from 'react';
import { multiplayerService } from '../../services/MultiplayerService';
import { MultiplayerLobby } from './MultiplayerLobby';
import type { GameSession } from '../../types/multiplayer';
import './MultiplayerModal.css';

interface MultiplayerModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerName: string;
  onNavigateToGame?: (gameId: string) => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  isOpen,
  onClose,
  playerName,
  onNavigateToGame
}) => {
  const [session, setSession] = useState<GameSession | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [sessionUrl, setSessionUrl] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [joinSessionId, setJoinSessionId] = useState('');

  // Generate a unique player ID
  const [playerId] = useState(() => Math.random().toString(36).substring(2, 15));

  useEffect(() => {
    if (!isOpen) return;

    // Set up event listeners first
    const handleSessionCreated = (newSession: GameSession) => {
      setSession(newSession);
      setIsHost(true);
      setSessionUrl(multiplayerService.getSessionUrl());
      setIsCreatingSession(false);
    };

    const handleSessionJoined = (newSession: GameSession) => {
      setSession(newSession);
      setIsHost(false);
      setSessionUrl(null);
    };

    const handleGameSelected = (data: { gameId: string }) => {
      // Update session in state when host selects a game
      setSession(prevSession => {
        if (prevSession) {
          return {
            ...prevSession,
            gameId: data.gameId
          };
        }
        return prevSession;
      });
    };

    const handleGameStarted = (data: { gameId: string }) => {
      if (onNavigateToGame) {
        onNavigateToGame(data.gameId);
        onClose(); // Close modal when game starts
      }
    };

    multiplayerService.on('session-created', handleSessionCreated);
    multiplayerService.on('session-joined', handleSessionJoined);
    multiplayerService.on('game-selected', handleGameSelected);
    multiplayerService.on('game-started', handleGameStarted);

    // Now check if already in a session or create one
    const currentSession = multiplayerService.getCurrentSession();
    if (currentSession) {
      setSession(currentSession);
      setIsHost(multiplayerService.isHost());
      setSessionUrl(multiplayerService.getSessionUrl());
    } else {
      // Create a session immediately when modal opens
      handleCreateSession();
    }

    return () => {
      multiplayerService.off('session-created', handleSessionCreated);
      multiplayerService.off('session-joined', handleSessionJoined);
      multiplayerService.off('game-selected', handleGameSelected);
      multiplayerService.off('game-started', handleGameStarted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, onNavigateToGame, onClose]);

  const handleCreateSession = async () => {
    try {
      console.log('Starting to create session...');
      setIsCreatingSession(true);
      console.log('About to call multiplayerService.createSession');
      const session = await multiplayerService.createSession({
        maxPlayers: 4, // Default max players
        hostName: playerName
        // No gameId - will be selected later
      });
      console.log('Session created successfully:', session);
    } catch (error) {
      console.error('Failed to create multiplayer session:', error);
      setIsCreatingSession(false);
    }
  };

  const handleJoinSession = async () => {
    if (!joinSessionId.trim()) return;

    try {
      await multiplayerService.joinSession({
        sessionId: joinSessionId.trim(),
        playerName
      });
      setJoinSessionId('');
    } catch (error) {
      console.error('Failed to join multiplayer session:', error);
    }
  };

  const handleLeaveSession = async () => {
    await multiplayerService.leaveSession();
    setSession(null);
    setIsHost(false);
    setSessionUrl(null);
  };

  const handlePlayerReady = async (isReady: boolean) => {
    await multiplayerService.setPlayerReady(isReady);
  };

  const handleStartGame = async () => {
    if (!session || !isHost || !session.gameId) return;

    try {
      // Use the service's startGame method which will broadcast to all players
      await multiplayerService.startGame(session.gameId);
    } catch (error) {
      console.error('Failed to start multiplayer game:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="multiplayer-modal-overlay" onClick={onClose}>
      <div className="multiplayer-modal" onClick={(e) => e.stopPropagation()}>
        <div className="multiplayer-modal-header">
          <h2>🎮 Multiplayer</h2>
          <button className="multiplayer-modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="multiplayer-modal-content">
          {session ? (
            <MultiplayerLobby
              session={session}
              isHost={isHost}
              currentPlayerId={playerId}
              sessionUrl={sessionUrl}
              onPlayerReady={handlePlayerReady}
              onStartGame={handleStartGame}
              onLeaveSession={handleLeaveSession}
            />
          ) : isCreatingSession ? (
            <div className="multiplayer-session-setup">
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                <p>Creating multiplayer session...</p>
              </div>
            </div>
          ) : (
            <div className="multiplayer-session-setup">
              <div className="multiplayer-section">
                <h3>🔗 Join Game Session</h3>
                <p>Enter a session ID to join an existing game:</p>
                <div className="join-session-form">
                  <input
                    type="text"
                    placeholder="Session ID"
                    value={joinSessionId}
                    onChange={(e) => setJoinSessionId(e.target.value)}
                    className="session-id-input"
                  />
                  <button 
                    onClick={handleJoinSession}
                    disabled={!joinSessionId.trim()}
                    className="join-btn"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};