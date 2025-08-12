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
    backgroundColor: '#2196F3',
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
    backgroundColor: difficulty === currentDifficulty ? '#4CAF50' : '#E0E0E0',
    color: difficulty === currentDifficulty ? 'white' : '#333'
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
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Number Pad</h4>
        
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
                e.currentTarget.style.backgroundColor = '#1976D2';
                e.currentTarget.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2196F3';
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
              backgroundColor: '#FF9800',
              color: 'white'
            }}
            onClick={onClearCell}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F57C00';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#FF9800';
            }}
          >
            🧹 Clear
          </button>
          
          <button
            style={{
              ...controlButtonStyle,
              backgroundColor: canHint ? '#4CAF50' : '#BDBDBD',
              color: 'white'
            }}
            onClick={onHint}
            disabled={!canHint}
            onMouseEnter={(e) => {
              if (canHint) {
                e.currentTarget.style.backgroundColor = '#388E3C';
              }
            }}
            onMouseLeave={(e) => {
              if (canHint) {
                e.currentTarget.style.backgroundColor = '#4CAF50';
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
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd',
        width: '100%',
        maxWidth: '400px'
      }}>
        <h4 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>
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
                  e.currentTarget.style.backgroundColor = '#BDBDBD';
                }
              }}
              onMouseLeave={(e) => {
                if (difficulty !== currentDifficulty) {
                  e.currentTarget.style.backgroundColor = '#E0E0E0';
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
          color: '#666',
          textAlign: 'center'
        }}>
          Current: {getDifficultyIcon(currentDifficulty)} {currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}
        </div>
      </div>

      {/* Instructions */}
      <div style={{
        padding: '1rem',
        backgroundColor: '#E3F2FD',
        borderRadius: '8px',
        border: '1px solid #2196F3',
        maxWidth: '400px',
        fontSize: '0.9rem',
        color: '#1565C0'
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