/**
 * TetrisBoard component - renders the game grid and active piece
 */
import React from 'react';
import type { TetrisGrid, ActivePiece, CellValue } from '../types';
import { placePiece } from '../logic';

interface TetrisBoardProps {
  grid: TetrisGrid;
  activePiece: ActivePiece | null;
  gameOver: boolean;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({
  grid,
  activePiece,
  gameOver
}) => {
  // Create display grid with active piece overlaid
  const displayGrid = React.useMemo(() => {
    if (!activePiece) return grid;
    return placePiece(grid, activePiece);
  }, [grid, activePiece]);

  // Cell colors mapping
  const getCellClass = (cellValue: CellValue): string => {
    const baseClass = 'tetris-cell';
    if (cellValue === 0) return `${baseClass} empty`;
    
    const colorClasses = {
      1: 'cyan',    // I piece
      2: 'yellow',  // O piece  
      3: 'purple',  // T piece
      4: 'green',   // S piece
      5: 'red',     // Z piece
      6: 'blue',    // J piece
      7: 'orange'   // L piece
    };
    
    return `${baseClass} ${colorClasses[cellValue] || 'empty'}`;
  };

  return (
    <div className={`tetris-board ${gameOver ? 'game-over' : ''}`}>
      <div className="tetris-grid">
        {displayGrid.map((row, rowIndex) => (
          <div key={rowIndex} className="tetris-row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(cell)}
              />
            ))}
          </div>
        ))}
      </div>
      
      {gameOver && (
        <div className="game-over-overlay">
          <h2>Game Over!</h2>
          <p>Press Reset to play again</p>
        </div>
      )}
    </div>
  );
};

export default TetrisBoard;