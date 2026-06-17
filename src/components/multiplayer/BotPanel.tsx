import React, { useState } from 'react';
import { useBots } from '../../hooks/useBots';
import { botService } from '../../services/BotService';
import { getProfileInitials } from '../../utils/nameUtils';
import type { BotDifficulty } from '../../games/_contract/IBot';
import './BotPanel.css';

interface BotPanelProps {
  onClose: () => void;
}

export const BotPanel: React.FC<BotPanelProps> = ({ onClose }) => {
  const { bots, removeBot } = useBots();
  const [selectedDifficulty, setSelectedDifficulty] = useState<BotDifficulty>('easy');

  const difficulties: BotDifficulty[] = ['easy', 'medium', 'hard'];

  return (
    <>
      <div className="bot-panel-overlay" onClick={onClose} />
      <div className="bot-panel" role="dialog" aria-label="Bot opponents">
        <div className="bot-panel-header">
          <h3>Bot Opponents</h3>
          <button className="bot-panel-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="bot-difficulty-selector">
          {difficulties.map(d => (
            <button
              key={d}
              className={`bot-difficulty-btn ${selectedDifficulty === d ? 'active' : ''}`}
              onClick={() => setSelectedDifficulty(d)}
            >
              {d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>

        <div className="bot-add-row">
          <button
            className="bot-add-btn"
            onClick={() => botService.addBot(selectedDifficulty)}
            disabled={bots.length >= 5}
          >
            Add Bot
          </button>
        </div>

        {bots.length === 0 ? (
          <p className="bot-empty">
            No bots added yet. Add bots to play against AI opponents.
          </p>
        ) : (
          <div className="bot-list">
            {bots.map(bot => (
              <div key={bot.id} className="bot-item">
                <div className="bot-avatar">{getProfileInitials(bot.name)}</div>
                <div className="bot-info">
                  <span className="bot-name">{bot.name}</span>
                  <span className="bot-difficulty-badge" data-difficulty={bot.difficulty}>
                    {bot.difficulty}
                  </span>
                </div>
                <button
                  className="bot-remove-btn"
                  onClick={() => removeBot(bot.id)}
                  aria-label={`Remove ${bot.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <p className="bot-footer-note">
          Bots are controlled by the host and only active during your turn.
        </p>
      </div>
    </>
  );
};
