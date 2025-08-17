/**
 * Multiplayer WIP Component
 * Shows "Work in Progress" message for games that don't support multiplayer yet
 */
import React from 'react';

interface MultiplayerWIPProps {
  gameId: string;
  gameName: string;
}

export const MultiplayerWIP: React.FC<MultiplayerWIPProps> = ({ gameName }) => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '400px',
      backgroundColor: '#f5f5f5',
      border: '2px dashed #ccc',
      borderRadius: '8px',
      padding: '2rem',
      textAlign: 'center',
      margin: '2rem'
    }}>
      <h3 style={{ color: '#666', marginBottom: '1rem', fontSize: '1.5rem' }}>
        🚧 Multiplayer Development
      </h3>
      <p style={{ color: '#888', fontSize: '1.1rem', marginBottom: '1rem' }}>
        Multiplayer is WIP for this game
      </p>
      <p style={{ color: '#999', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
        {gameName} will support multiplayer in a future update
      </p>
      <div style={{
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '1rem',
        maxWidth: '300px'
      }}>
        <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>
          You're currently in a multiplayer session, but {gameName} doesn't support 
          multiplayer gameplay yet. Please select a different game or leave the multiplayer session.
        </p>
      </div>
    </div>
  );
};