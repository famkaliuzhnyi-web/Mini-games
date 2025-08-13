/**
 * Sudoku Board Component - Displays the 9x9 grid
 */
import React from 'react';
import type { SudokuUIGrid } from '../types';

interface SudokuBoardProps {
  uiGrid: SudokuUIGrid;
  selectedCell: { row: number; col: number } | null;
  onCellClick: (row: number, col: number) => void;
}

export const SudokuBoard: React.FC<SudokuBoardProps> = ({
  uiGrid,
  selectedCell,
  onCellClick
}) => {
  return (
    <div className="modern-sudoku-board">
      {uiGrid.map((row, r) =>
        row.map((cell, c) => {
          const isSelected = selectedCell?.row === r && selectedCell?.col === c;
          const isRelated = selectedCell && (
            selectedCell.row === r || 
            selectedCell.col === c || 
            (Math.floor(selectedCell.row / 3) === Math.floor(r / 3) && 
             Math.floor(selectedCell.col / 3) === Math.floor(c / 3))
          );
          const isSameNumber = selectedCell && cell.value !== 0 && 
            uiGrid[selectedCell.row][selectedCell.col].value === cell.value;
          
          return (
            <button
              key={`${r}-${c}`}
              onClick={() => onCellClick(r, c)}
              className={`
                modern-sudoku-cell
                ${cell.isInitial ? 'given' : 'user-entry'}
                ${isSelected ? 'selected' : ''}
                ${isRelated && !isSelected ? 'related' : ''}
                ${isSameNumber && !isSelected ? 'same-number' : ''}
                ${cell.isInvalid ? 'invalid' : ''}
                ${r % 3 === 2 && r < 8 ? 'bottom-box-border' : ''}
                ${c % 3 === 2 && c < 8 ? 'right-box-border' : ''}
              `}
              aria-label={`Row ${r + 1}, Column ${c + 1}, ${cell.value === 0 ? 'empty' : `value ${cell.value}`}`}
              tabIndex={0}
            >
              <span className="cell-value">
                {cell.value !== 0 ? cell.value : ''}
              </span>
              {cell.value === 0 && cell.notes && cell.notes.length > 0 && (
                <div className="cell-notes">
                  {cell.notes.slice(0, 9).map(note => (
                    <span key={note} className="note">{note}</span>
                  ))}
                </div>
              )}
            </button>
          );
        })
      )}
    </div>
  );
};