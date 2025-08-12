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
  const getCellStyle = (row: number, col: number) => {
    const cell = uiGrid[row][col];
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    
    // Highlight related cells (same row, column, or 3x3 box)
    const isRelated = selectedCell && (
      selectedCell.row === row || 
      selectedCell.col === col || 
      (Math.floor(selectedCell.row / 3) === Math.floor(row / 3) && 
       Math.floor(selectedCell.col / 3) === Math.floor(col / 3))
    );

    const baseStyle: React.CSSProperties = {
      width: '40px',
      height: '40px',
      border: '1px solid #999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: cell.isInitial ? 'default' : 'pointer',
      fontSize: '18px',
      fontWeight: cell.isInitial ? 'bold' : 'normal',
      position: 'relative',
      userSelect: 'none'
    };

    // Background color based on state
    if (isSelected) {
      baseStyle.backgroundColor = '#81C784';
    } else if (isRelated) {
      baseStyle.backgroundColor = '#E8F5E9';
    } else if (cell.isInitial) {
      baseStyle.backgroundColor = '#F5F5F5';
    } else {
      baseStyle.backgroundColor = '#FFFFFF';
    }

    // Text color
    if (cell.isInvalid) {
      baseStyle.color = '#F44336';
    } else if (cell.isInitial) {
      baseStyle.color = '#000000';
    } else {
      baseStyle.color = '#2196F3';
    }

    // Borders for 3x3 box separation
    if (row % 3 === 0) baseStyle.borderTop = '3px solid #333';
    if (col % 3 === 0) baseStyle.borderLeft = '3px solid #333';
    if (row === 8) baseStyle.borderBottom = '3px solid #333';
    if (col === 8) baseStyle.borderRight = '3px solid #333';

    return baseStyle;
  };

  const renderNotes = (notes: number[]) => {
    if (notes.length === 0) return null;
    
    return (
      <div style={{
        position: 'absolute',
        top: '2px',
        left: '2px',
        fontSize: '8px',
        color: '#666',
        lineHeight: '8px'
      }}>
        {notes.slice(0, 4).join('')}
      </div>
    );
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(9, 40px)',
      gridTemplateRows: 'repeat(9, 40px)',
      border: '3px solid #333',
      backgroundColor: '#333',
      gap: '0'
    }}>
      {uiGrid.map((row, r) =>
        row.map((cell, c) => (
          <div
            key={`${r}-${c}`}
            style={getCellStyle(r, c)}
            onClick={() => onCellClick(r, c)}
          >
            {cell.value !== 0 ? cell.value : ''}
            {cell.value === 0 && renderNotes(cell.notes)}
          </div>
        ))
      )}
    </div>
  );
};