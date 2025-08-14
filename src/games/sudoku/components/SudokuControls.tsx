/**
 * Sudoku Controls Component - Number pad and game controls
 */
import React from 'react';
import type { CellValue, Difficulty } from '../types';

interface SudokuControlsProps {
  onNumberInput: (number: CellValue) => void;
  onClearCell: () => void;
  onHint: () => void;
  onNewGame: (difficulty: Difficulty) => void;
  canHint: boolean;
  currentDifficulty: Difficulty;
  isComplete: boolean;
}

export const SudokuControls: React.FC<SudokuControlsProps> = ({
  onNumberInput,
  onClearCell,
  onHint,
  onNewGame,
  canHint,
  currentDifficulty,
  isComplete
}) => {
  const numberButtonStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    fontSize: '18px',
    fontWeight: 'bold',
    backgroundColor: 'var(--color-accent)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const controlButtonStyle: React.CSSProperties = {
    padding: '0.75rem 1.5rem',
    fontSize: '14px',
    fontWeight: 'bold',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  };

  const difficultyButtonStyle = (difficulty: Difficulty): React.CSSProperties => ({
    ...controlButtonStyle,
    backgroundColor: difficulty === currentDifficulty ? 'var(--color-success)' : 'var(--color-surface)',
    color: difficulty === currentDifficulty ? 'white' : 'var(--color-text)'
  });

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
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      alignItems: 'center'
    }}>
      {/* Number Pad */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: `1px solid var(--color-border)`
      }}>
        <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center', color: 'var(--color-text)' }}>Number Pad</h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          marginBottom: '1rem'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              style={numberButtonStyle}
              onClick={() => onNumberInput(num as CellValue)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accentHover)';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {num}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'center'
        }}>
          <button
            style={{
              ...controlButtonStyle,
              backgroundColor: 'var(--color-warning)',
              color: 'white'
            }}
            onClick={onClearCell}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-warningLight)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-warning)';
            }}
          >
            🧹 Clear
          </button>
          
          <button
            style={{
              ...controlButtonStyle,
              backgroundColor: canHint ? 'var(--color-success)' : 'var(--color-surfaceDarker)',
              color: canHint ? 'white' : 'var(--color-textMuted)'
            }}
            onClick={onHint}
            disabled={!canHint}
            onMouseEnter={(e) => {
              if (canHint) {
                e.currentTarget.style.backgroundColor = 'var(--color-successLight)';
              }
            }}
            onMouseLeave={(e) => {
              if (canHint) {
                e.currentTarget.style.backgroundColor = 'var(--color-success)';
              }
            }}
          >
            💡 Hint
          </button>
        </div>
      </div>

      {/* New Game Section */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--color-surface)',
        borderRadius: '8px',
        border: `1px solid var(--color-border)`,
        width: '100%',
        maxWidth: '400px'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center', color: 'var(--color-text)' }}>
          {isComplete ? '🎉 Start New Game' : '🎮 New Game'}
        </h4>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '0.5rem'
        }}>
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(difficulty => (
            <button
              key={difficulty}
              style={difficultyButtonStyle(difficulty)}
              onClick={() => onNewGame(difficulty)}
              onMouseEnter={(e) => {
                if (difficulty !== currentDifficulty) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surfaceHover)';
                }
              }}
              onMouseLeave={(e) => {
                if (difficulty !== currentDifficulty) {
                  e.currentTarget.style.backgroundColor = 'var(--color-surface)';
                }
              }}
            >
              {getDifficultyIcon(difficulty)} {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </button>
          ))}
        </div>
        
        <div style={{
          marginTop: '0.5rem',
          fontSize: '0.8rem',
          color: 'var(--color-textSecondary)',
          textAlign: 'center'
        }}>
          Current: {getDifficultyIcon(currentDifficulty)} {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '1rem',
        backgroundColor: 'var(--color-accentLight)',
        borderRadius: '8px',
        border: `1px solid var(--color-accent)`,
        maxWidth: '400px',
        fontSize: '0.9rem',
        color: 'var(--color-text)'
      }}>
        <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>How to Play:</div>
        <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
          <li>Click a cell to select it</li>
          <li>Click a number to place it</li>
          <li>Fill each row, column, and 3×3 box with digits 1-9</li>
          <li>Use hints sparingly - they reduce your score</li>
          <li>Avoid mistakes - too many will end the game</li>
        </ul>
      </div>
    </div>
  );
};