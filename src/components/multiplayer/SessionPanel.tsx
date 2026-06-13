import React, { useEffect, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import type { Player } from '../../core';
import QRCode from 'qrcode';
import './SessionPanel.css';

interface SessionPanelProps {
  playerName: string;
  playerId: string;
  onClose: () => void;
}

/**
 * Floating panel shown when the host has an active session.
 * Displays the QR code and the live peer list.
 */
export const SessionPanel: React.FC<SessionPanelProps> = ({ playerName, playerId, onClose }) => {
  const session = useSession();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const sessionUrl = session.sessionUrl;

  useEffect(() => {
    if (!sessionUrl) return;
    QRCode.toDataURL(sessionUrl, { width: 200, margin: 1, color: { dark: '#000000', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(console.error);
  }, [sessionUrl]);

  const copyLink = async () => {
    if (!sessionUrl) return;
    await navigator.clipboard.writeText(sessionUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startSession = async () => {
    if (session.isInSession) return;
    const player: Player = { id: playerId, name: playerName, joinedAt: Date.now() };
    await session.createSession(player);
  };

  useEffect(() => {
    if (!session.isInSession) {
      startSession();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allPlayers: Player[] = [
    ...(session.localPlayer ? [{ ...session.localPlayer, name: `${session.localPlayer.name} (you)` }] : []),
    ...session.peers,
  ];

  return (
    <div className="session-panel" role="dialog" aria-label="Multiplayer session">
      <div className="session-panel-header">
        <h3>Multiplayer Session</h3>
        <button className="session-panel-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {session.status === 'hosting' || session.status === 'connected' ? (
        <>
          <p className="session-panel-hint">
            Scan the QR code or share the link — everyone who joins will follow you.
          </p>

          {qrDataUrl && (
            <div className="session-panel-qr">
              <img src={qrDataUrl} alt="Session QR code" width={200} height={200} />
            </div>
          )}

          <div className="session-panel-link">
            <span className="session-panel-url">{sessionUrl}</span>
            <button onClick={copyLink} className="session-panel-copy">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          <div className="session-panel-peers">
            <h4>Connected ({allPlayers.length})</h4>
            <ul>
              {allPlayers.map(p => (
                <li key={p.id} className="session-panel-peer">
                  <span className="session-panel-peer-dot" />
                  {p.name}
                  {p.id === session.localPlayer?.id && (
                    <span className="session-panel-badge">host</span>
                  )}
                </li>
              ))}
            </ul>
            {allPlayers.length === 1 && (
              <p className="session-panel-waiting">Waiting for players to join…</p>
            )}
          </div>

          <button className="session-panel-end" onClick={() => { session.leaveSession(); onClose(); }}>
            End Session
          </button>
        </>
      ) : (
        <div className="session-panel-loading">Starting session…</div>
      )}
    </div>
  );
};
