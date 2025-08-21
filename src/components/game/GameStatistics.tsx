/**
 * Game Statistics Component - Shared UI for displaying game statistics
 * 
 * Provides consistent display of game statistics including scores,
 * win rates, play time, and other common metrics across all games.
 */

import React from 'react';
import type { GameStats, GameTimer } from '../../utils/gameUtils';
import { getWinRate, getElapsedTime, formatTime } from '../../utils/gameUtils';

interface GameStatisticsProps {
  // Score information
  currentScore?: number;
  bestScore?: number;
  scoreLabel?: string;

  // Game statistics
  stats?: GameStats;

  // Timer information
  timer?: GameTimer;
  showTimer?: boolean;

  // Game status
  gameStatus?: string;
  isGameComplete?: boolean;
  gameResult?: 'won' | 'lost' | 'tie' | null;

  // Display options
  compact?: boolean;
  showWinRate?: boolean;
  showAverageScore?: boolean;
  showPlayTime?: boolean;
  customStats?: Array<{
    label: string;
    value: string | number;
    icon?: string;
  }>;
}

export const GameStatistics: React.FC<GameStatisticsProps> = ({
  currentScore,
  bestScore,
  scoreLabel = 'Score',
  stats,
  timer,
  showTimer = false,
  gameStatus,
  isGameComplete = false,
  gameResult,
  compact = false,
  showWinRate = true,
  showAverageScore = true,
  showPlayTime = true,
  customStats = []
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: compact ? 'row' : 'column',
    gap: compact ? '1rem' : '0.5rem',
    padding: compact ? '0.5rem' : '1rem',
    backgroundColor: '#f8f9fa',
    border: '1px solid #dee2e6',
    borderRadius: '8px',
    fontSize: compact ? '0.875rem' : '1rem'
  };

  const statItemStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: compact ? '0.25rem 0' : '0.5rem 0',
    borderBottom: compact ? 'none' : '1px solid #eee'
  };

  const labelStyle: React.CSSProperties = {
    fontWeight: '500',
    color: '#495057'
  };

  const valueStyle: React.CSSProperties = {
    fontWeight: 'bold',
    color: '#212529'
  };

  const highlightValueStyle: React.CSSProperties = {
    ...valueStyle,
    color: '#28a745'
  };

  const gameStatusStyle: React.CSSProperties = {
    ...valueStyle,
    color: gameResult === 'won' ? '#28a745' : 
          gameResult === 'lost' ? '#dc3545' : 
          gameResult === 'tie' ? '#ffc107' : '#6c757d',
    textTransform: 'capitalize'
  };

  const renderStatItem = (label: string, value: string | number, highlight: boolean = false, icon?: string) => (
    <div style={statItemStyle} key={label}>
      <span style={labelStyle}>
        {icon && `${icon} `}{label}:
      </span>
      <span style={highlight ? highlightValueStyle : valueStyle}>
        {value}
      </span>
    </div>
  );

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const formatPlayTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${totalSeconds}s`;
    }
  };

  return (
    <div style={containerStyle}>
      {/* Game Status */}
      {gameStatus && (
        <div style={statItemStyle}>
          <span style={labelStyle}>Status:</span>
          <span style={gameStatusStyle}>{gameStatus}</span>
        </div>
      )}

      {/* Current Score */}
      {currentScore !== undefined && (
        renderStatItem(scoreLabel, formatNumber(currentScore), isGameComplete)
      )}

      {/* Best Score */}
      {bestScore !== undefined && bestScore > 0 && (
        renderStatItem(`Best ${scoreLabel}`, formatNumber(bestScore), false, '🏆')
      )}

      {/* Timer */}
      {showTimer && timer && (
        renderStatItem(
          'Time', 
          formatTime(getElapsedTime(timer)),
          false,
          '⏱️'
        )
      )}

      {/* Game Statistics */}
      {stats && (
        <>
          {stats.gamesPlayed > 0 && (
            renderStatItem('Games Played', stats.gamesPlayed.toString(), false, '🎮')
          )}
          
          {stats.gamesPlayed > 0 && showWinRate && (
            renderStatItem(
              'Win Rate', 
              `${getWinRate(stats)}%`,
              false,
              '📊'
            )
          )}
          
          {stats.gamesPlayed > 0 && showAverageScore && stats.averageScore > 0 && (
            renderStatItem(
              'Average Score', 
              formatNumber(stats.averageScore),
              false,
              '📈'
            )
          )}
          
          {showPlayTime && stats.totalPlayTime > 0 && (
            renderStatItem(
              'Total Play Time', 
              formatPlayTime(stats.totalPlayTime),
              false,
              '🕐'
            )
          )}
        </>
      )}

      {/* Custom Statistics */}
      {customStats.map(stat => 
        renderStatItem(stat.label, stat.value, false, stat.icon)
      )}

      {/* Game Result Message */}
      {isGameComplete && gameResult && (
        <div style={{
          textAlign: 'center',
          padding: '0.75rem',
          marginTop: '0.5rem',
          backgroundColor: gameResult === 'won' ? '#d4edda' : 
                          gameResult === 'lost' ? '#f8d7da' : '#fff3cd',
          color: gameResult === 'won' ? '#155724' : 
                 gameResult === 'lost' ? '#721c24' : '#856404',
          borderRadius: '4px',
          fontWeight: 'bold'
        }}>
          {gameResult === 'won' && '🎉 Congratulations! You won!'}
          {gameResult === 'lost' && '😔 Game Over. Better luck next time!'}
          {gameResult === 'tie' && '🤝 It\'s a tie! Well played!'}
        </div>
      )}
    </div>
  );
};

export default GameStatistics;