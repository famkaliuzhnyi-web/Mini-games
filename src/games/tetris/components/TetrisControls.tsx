/**
 * TetrisControls component - game stats, controls info, and action buttons
 */
import React from 'react';
import type { GameStats, PieceType } from '../types';

interface TetrisControlsProps {
  stats: GameStats;
  nextPiece: PieceType;
  paused: boolean;
  gameOver: boolean;
  onPause: () => void;
  onReset: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  onMoveDown?: () => void;
  onRotate?: () => void;
  onHardDrop?: () => void;
}

export const TetrisControls: React.FC<TetrisControlsProps> = ({
  stats,
  nextPiece,
  paused,
  gameOver,
  onPause,
  onReset,
  onMoveLeft,
  onMoveRight,
  onMoveDown,
  onRotate,
  onHardDrop
}) => {
  const nextPieceEmojis: Record<PieceType, string> = {
    I: '🟦', // Cyan bar
    O: '🟨', // Yellow square
    T: '🟪', // Purple T
    S: '🟩', // Green S
    Z: '🟥', // Red Z  
    J: '🔵', // Blue J
    L: '🟠'  // Orange L
  };

  return (
    <div className="tetris-controls">
      {/* Game Statistics */}
      <div className="game-stats">
        <h3>Statistics</h3>
        <div className="stat-row">
          <span className="stat-label">Score:</span>
          <span className="stat-value">{stats.score.toLocaleString()}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Level:</span>
          <span className="stat-value">{stats.level}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Lines:</span>
          <span className="stat-value">{stats.lines}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Pieces:</span>
          <span className="stat-value">{stats.pieces}</span>
        </div>
      </div>

      {/* Next Piece Preview */}
      <div className="next-piece">
        <h3>Next Piece</h3>
        <div className="next-piece-display">
          <span className="next-piece-emoji">{nextPieceEmojis[nextPiece]}</span>
          <span className="next-piece-type">{nextPiece}</span>
        </div>
      </div>



      {/* Action Buttons */}
      <div className="action-buttons">
        <button
          onClick={onPause}
          disabled={gameOver}
          className={`action-btn ${paused ? 'resume' : 'pause'}`}
        >
          {paused ? '▶️ Resume' : '⏸️ Pause'}
        </button>
        
        <button
          onClick={onReset}
          className="action-btn reset"
        >
          🔄 Reset
        </button>
      </div>

      {/* Mobile Touch Controls */}
      <div className="mobile-controls">
        <div className="mobile-control-grid">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onMoveLeft?.();
            }}
            onClick={onMoveLeft}
            disabled={gameOver || paused}
            className="mobile-control-btn move-left"
            type="button"
          >
            ⬅️
          </button>
          
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onRotate?.();
            }}
            onClick={onRotate}
            disabled={gameOver || paused}
            className="mobile-control-btn rotate"
            type="button"
          >
            🔄
          </button>
          
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onMoveRight?.();
            }}
            onClick={onMoveRight}
            disabled={gameOver || paused}
            className="mobile-control-btn move-right"
            type="button"
          >
            ➡️
          </button>
          
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onMoveDown?.();
            }}
            onClick={onMoveDown}
            disabled={gameOver || paused}
            className="mobile-control-btn move-down"
            type="button"
          >
            ⬇️
          </button>
          
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onHardDrop?.();
            }}
            onClick={onHardDrop}
            disabled={gameOver || paused}
            className="mobile-control-btn hard-drop"
            type="button"
          >
            ⏬
          </button>
        </div>
      </div>

      {/* Game Status */}
      {paused && !gameOver && (
        <div className="game-status paused">
          <h3>⏸️ Game Paused</h3>
          <p>Press Resume or 'P' to continue</p>
        </div>
      )}

      {gameOver && (
        <div className="game-status game-over">
          <h3>💀 Game Over</h3>
          <p>Final Score: {stats.score.toLocaleString()}</p>
          <p>Lines Cleared: {stats.lines}</p>
        </div>
      )}

      {/* Tips */}
      <div className="tips">
        <ul className="tips-list">
          <li>Fill rows to clear lines</li>
          <li>Multiple lines = bonus points</li>
        </ul>
      </div>
    </div>
  );
};

export default TetrisControls;