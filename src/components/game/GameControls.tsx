/**
 * Game Controls Component - Shared UI controls for common game actions
 * 
 * Provides consistent UI components for save/load, new game, undo/redo,
 * and other common game controls across all games.
 */

import React from 'react';
import type { SaveEvent } from '../../types/game';

interface GameControlsProps {
  // Save/Load controls
  onSave?: () => Promise<void> | void;
  onLoad?: () => Promise<void> | void;
  onDropSave?: () => Promise<void> | void;
  hasSave?: boolean;
  isLoading?: boolean;
  autoSaveEnabled?: boolean;
  onToggleAutoSave?: () => void;
  lastSaveEvent?: SaveEvent | null;

  // Game controls
  onNewGame?: () => Promise<void> | void;
  onPause?: () => void;
  onResume?: () => void;
  isPaused?: boolean;

  // Undo/Redo controls
  onUndo?: () => Promise<void> | void;
  onRedo?: () => Promise<void> | void;
  canUndo?: boolean;
  canRedo?: boolean;

  // Display options
  showSaveControls?: boolean;
  showGameControls?: boolean;
  showUndoControls?: boolean;
  showAutoSaveToggle?: boolean;
  compact?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
}

export const GameControls: React.FC<GameControlsProps> = ({
  // Save/Load props
  onSave,
  onLoad,
  onDropSave,
  hasSave = false,
  isLoading = false,
  autoSaveEnabled = true,
  onToggleAutoSave,
  lastSaveEvent,

  // Game control props
  onNewGame,
  onPause,
  onResume,
  isPaused = false,

  // Undo/Redo props
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,

  // Display props
  showSaveControls = true,
  showGameControls = true,
  showUndoControls = false,
  showAutoSaveToggle = true,
  compact = false,
  expanded = false,
  onToggleExpanded
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    gap: compact ? '0.5rem' : '1rem',
    padding: compact ? '0.5rem' : '1rem',
    backgroundColor: '#f9f9f9',
    border: '1px solid #ddd',
    borderRadius: '8px',
    fontSize: compact ? '0.875rem' : '1rem'
  };

  const buttonStyle: React.CSSProperties = {
    padding: compact ? '0.25rem 0.5rem' : '0.5rem 1rem',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    cursor: 'pointer',
    fontSize: 'inherit',
    minWidth: compact ? 'auto' : '80px'
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: '#f5f5f5',
    color: '#999',
    cursor: 'not-allowed'
  };

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    gap: compact ? '0.25rem' : '0.5rem',
    alignItems: compact ? 'center' : 'stretch'
  };

  return (
    <div style={containerStyle}>
      {/* Collapsible header for expandable controls */}
      {onToggleExpanded && (
        <button
          onClick={onToggleExpanded}
          style={{
            ...buttonStyle,
            backgroundColor: '#e9ecef',
            fontWeight: 'bold'
          }}
        >
          {expanded ? '▼' : '▶'} Game Controls
        </button>
      )}

      {/* Only show controls if expanded (or if no expand toggle) */}
      {(expanded || !onToggleExpanded) && (
        <>
          {/* Game Controls Section */}
          {showGameControls && (onNewGame || onPause || onResume) && (
            <div style={sectionStyle}>
              {!compact && <label style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Game:</label>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {onNewGame && (
                  <button
                    onClick={onNewGame}
                    disabled={isLoading}
                    style={isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    🎮 New Game
                  </button>
                )}
                {onPause && !isPaused && (
                  <button
                    onClick={onPause}
                    style={buttonStyle}
                  >
                    ⏸️ Pause
                  </button>
                )}
                {onResume && isPaused && (
                  <button
                    onClick={onResume}
                    style={buttonStyle}
                  >
                    ▶️ Resume
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Undo/Redo Controls Section */}
          {showUndoControls && (onUndo || onRedo) && (
            <div style={sectionStyle}>
              {!compact && <label style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Actions:</label>}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {onUndo && (
                  <button
                    onClick={onUndo}
                    disabled={!canUndo || isLoading}
                    style={!canUndo || isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    ↶ Undo
                  </button>
                )}
                {onRedo && (
                  <button
                    onClick={onRedo}
                    disabled={!canRedo || isLoading}
                    style={!canRedo || isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    ↷ Redo
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Save/Load Controls Section */}
          {showSaveControls && (onSave || onLoad || onDropSave) && (
            <div style={sectionStyle}>
              {!compact && <label style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Save/Load:</label>}
              
              {/* Auto-save toggle */}
              {showAutoSaveToggle && onToggleAutoSave && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={onToggleAutoSave}
                    disabled={isLoading}
                  />
                  Auto-save enabled
                </label>
              )}

              {/* Save/Load buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {onSave && (
                  <button
                    onClick={onSave}
                    disabled={isLoading}
                    style={isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    💾 Save
                  </button>
                )}
                {onLoad && (
                  <button
                    onClick={onLoad}
                    disabled={!hasSave || isLoading}
                    style={!hasSave || isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    📁 Load
                  </button>
                )}
                {onDropSave && (
                  <button
                    onClick={onDropSave}
                    disabled={!hasSave || isLoading}
                    style={!hasSave || isLoading ? disabledButtonStyle : buttonStyle}
                  >
                    🗑️ Delete Save
                  </button>
                )}
              </div>

              {/* Save status indicator */}
              <div style={{ fontSize: '0.8rem', color: '#666' }}>
                {hasSave ? '💾 Save available' : '❌ No save data'}
              </div>

              {/* Last save event */}
              {lastSaveEvent && (
                <div style={{ fontSize: '0.75rem', color: '#888' }}>
                  Last {lastSaveEvent.action}: {new Date(lastSaveEvent.timestamp).toLocaleString()}
                  {lastSaveEvent.success ? ' ✅' : ' ❌'}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GameControls;