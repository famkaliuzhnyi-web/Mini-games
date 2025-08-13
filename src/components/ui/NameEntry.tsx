import React, { useState } from 'react';
import './NameEntry.css';

interface NameEntryProps {
  onNameSubmit: (name: string) => void;
}

export const NameEntry: React.FC<NameEntryProps> = ({ onNameSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (trimmedName) {
      onNameSubmit(trimmedName);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="name-entry">
      <div className="name-entry-content">
        <div className="name-entry-header">
          <div className="logo-section">
            <div className="logo-emoji">🎮</div>
            <h1>Mini Games</h1>
          </div>
          <p>Enter your name to start your gaming journey!</p>
        </div>

        <div className="name-entry-form">
          <div className="input-group">
            <input
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              className="name-input"
              maxLength={20}
              autoFocus
            />
            <button 
              onClick={handleSubmit}
              disabled={!name.trim()}
              className="start-btn"
            >
              Start Playing
            </button>
          </div>
        </div>

        <div className="features-preview">
          <h3>✨ What awaits you</h3>
          <div className="features-grid">
            <div className="feature-item">
              <span className="feature-emoji">🎯</span>
              <span>Multiple games</span>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">💾</span>
              <span>Auto-save progress</span>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">📱</span>
              <span>Mobile optimized</span>
            </div>
            <div className="feature-item">
              <span className="feature-emoji">🌐</span>
              <span>Online features</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NameEntry;