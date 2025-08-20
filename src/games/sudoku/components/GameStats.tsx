/**
 * Game Stats Component - Shows game statistics
 */
import React from 'react';
import type { Difficulty } from '../types';

interface GameStatsProps {
  difficulty: Difficulty;
  timeSpent: number;
  hintsUsed: number;
  maxHints: number;
  mistakes: number;
  maxMistakes: number;
  isComplete: boolean;
  score: number;
}

export const GameStats: React.FC<GameStatsProps> = ({
  difficulty,
  timeSpent,
  hintsUsed,
  maxHints,
  mistakes,
  maxMistakes,
  isComplete,
  score
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'hard': return '#F44336';
      case 'expert': return '#9C27B0';
      default: return '#666';
    }
  };

  const getDifficultyIcon = (difficulty: Difficulty): string => {
    switch (difficulty) {
      case 'easy': return '🟢';
      case 'medium': return '🟡';
      case 'hard': return '🔴';
      case 'expert': return '🟣';
      default: return '⚪';
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f9f9f9',
      borderRadius: '8px',
      border: '1px solid #ddd'
    }}>
      {/* Difficulty */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#666', 
          marginBottom: '0.25rem' 
        }}>
          Difficulty
        </div>
        <div style={{ 
          fontWeight: 'bold', 
          color: getDifficultyColor(difficulty),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.25rem'
        }}>
          {getDifficultyIcon(difficulty)} {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
        </div>
      </div>

      {/* Time */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#666', 
          marginBottom: '0.25rem' 
        }}>
          Time
        </div>
        <div style={{ 
          fontWeight: 'bold', 
          color: '#2196F3',
          fontFamily: 'monospace'
        }}>
          ⏱️ {formatTime(timeSpent)}
        </div>
      </div>

      {/* Hints */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#666', 
          marginBottom: '0.25rem' 
        }}>
          Hints Used
        </div>
        <div style={{ 
          fontWeight: 'bold', 
          color: hintsUsed >= maxHints ? '#F44336' : '#4CAF50'
        }}>
          💡 {hintsUsed}/{maxHints}
        </div>
      </div>

      {/* Mistakes */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          fontSize: '0.8rem', 
          color: '#666', 
          marginBottom: '0.25rem' 
        }}>
          Mistakes
        </div>
        <div style={{ 
          fontWeight: 'bold', 
          color: mistakes >= maxMistakes ? '#F44336' : mistakes > 0 ? '#FF9800' : '#4CAF50'
        }}>
          ❌ {mistakes}/{maxMistakes}
        </div>
      </div>

      {/* Score (only show if game is complete) */}
      {isComplete && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '0.8rem', 
            color: '#666', 
            marginBottom: '0.25rem' 
          }}>
            Score
          </div>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#FFD700',
            fontSize: '1.1rem'
          }}>
            🏆 {(score ?? 0).toLocaleString()}
          </div>
        </div>
      )}

      {/* Status */}
      {isComplete && (
        <div style={{ 
          textAlign: 'center',
          gridColumn: '1 / -1',
          padding: '0.5rem',
          backgroundColor: '#E8F5E9',
          borderRadius: '4px',
          border: '2px solid #4CAF50',
          marginTop: '0.5rem'
        }}>
          <div style={{ 
            fontSize: '1.2rem', 
            fontWeight: 'bold', 
            color: '#2E7D32' 
          }}>
            🎉 Puzzle Completed! 🎉
          </div>
        </div>
      )}
    </div>
  );
};