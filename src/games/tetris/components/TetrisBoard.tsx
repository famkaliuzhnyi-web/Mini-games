/**
 * TetrisBoard component - renders the game grid and active piece(s)
 */
import React from 'react';
import type { TetrisGrid, ActivePiece, CellValue, MultiplayerGameState } from '../types';
import { placePiece } from '../logic';

interface TetrisBoardProps {
  grid: TetrisGrid;
  activePiece: ActivePiece | null;
  ghostPiece: ActivePiece | null;
  gameOver: boolean;
  dangerZoneActive: boolean;
  multiplayer?: MultiplayerGameState;
}

export const TetrisBoard: React.FC<TetrisBoardProps> = ({
  grid,
  activePiece,
  ghostPiece,
  gameOver,
  dangerZoneActive,
  multiplayer
}) => {
  // Create display grid with active piece(s) and ghost piece(s) overlaid
  const displayGrid = React.useMemo(() => {
    let newGrid = grid.map(row => [...row]);
    const gridWidth = grid[0]?.length || 10;
    
    if (multiplayer?.isMultiplayer) {
      // Handle multiple players
      multiplayer.players.forEach(player => {
        // Overlay ghost pieces first
        if (player.ghostPiece && player.activePiece) {
          const { shape, position } = player.ghostPiece;
          
          // Only show ghost if it's below the active piece
          if (position.y > player.activePiece.position.y) {
            for (let row = 0; row < shape.length; row++) {
              for (let col = 0; col < shape[row].length; col++) {
                if (shape[row][col] !== 0) {
                  const gridX = position.x + col;
                  const gridY = position.y + row;
                  
                  if (gridY >= 0 && gridY < newGrid.length && gridX >= 0 && gridX < gridWidth) {
                    // Only show ghost if cell is empty
                    if (newGrid[gridY][gridX] === 0) {
                      newGrid[gridY][gridX] = -1; // Special value for ghost piece
                    }
                  }
                }
              }
            }
          }
        }
        
        // Overlay active pieces (takes precedence over ghost)
        if (player.activePiece) {
          newGrid = placePiece(newGrid, player.activePiece);
        }
      });
    } else {
      // Single player mode - original logic
      // First overlay ghost piece (if exists and different from active piece position)
      if (ghostPiece && activePiece) {
        const { shape, position } = ghostPiece;
        
        // Only show ghost if it's below the active piece
        if (position.y > activePiece.position.y) {
          for (let row = 0; row < shape.length; row++) {
            for (let col = 0; col < shape[row].length; col++) {
              if (shape[row][col] !== 0) {
                const gridX = position.x + col;
                const gridY = position.y + row;
                
                if (gridY >= 0 && gridY < newGrid.length && gridX >= 0 && gridX < gridWidth) {
                  // Only show ghost if cell is empty
                  if (newGrid[gridY][gridX] === 0) {
                    newGrid[gridY][gridX] = -1; // Special value for ghost piece
                  }
                }
              }
            }
          }
        }
      }
      
      // Then overlay active piece (takes precedence over ghost)
      if (activePiece) {
        newGrid = placePiece(newGrid, activePiece);
      }
    }
    
    return newGrid;
  }, [grid, activePiece, ghostPiece, multiplayer]);

  // Cell colors mapping
  const getCellClass = (cellValue: CellValue | -1, rowIndex: number, colIndex: number): string => {
    const baseClass = 'tetris-cell';
    
    // Ghost piece
    if (cellValue === -1) {
      return `${baseClass} ghost`;
    }
    
    if (cellValue === 0) {
      // Add danger zone class to empty cells in top 4 rows
      const isDangerRow = rowIndex < 4 && dangerZoneActive;
      
      // Add player section indicators for multiplayer
      let playerSection = '';
      if (multiplayer?.isMultiplayer) {
        multiplayer.players.forEach((player, index) => {
          if (colIndex >= player.columnStart && colIndex < player.columnEnd) {
            playerSection = `player-section-${index}`;
          }
        });
      }
      
      return `${baseClass} empty ${isDangerRow ? 'danger-zone' : ''} ${playerSection}`;
    }
    
    const colorClasses: Record<number, string> = {
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
    <div className={`tetris-board ${gameOver ? 'game-over' : ''} ${dangerZoneActive ? 'danger-zone-active' : ''} ${multiplayer?.isMultiplayer ? 'multiplayer' : ''}`}>
      {/* Player indicators for multiplayer */}
      {multiplayer?.isMultiplayer && (
        <div className="player-indicators">
          {multiplayer.players.map((player, index) => (
            <div key={player.id} className={`player-indicator player-${index}`}>
              <span className="player-name">{player.name}</span>
              <span className="player-score">Score: {player.stats.score}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="tetris-grid" style={{
        maxWidth: multiplayer?.isMultiplayer ? `${multiplayer.gridWidth * 25}px` : '250px'
      }}>
        {displayGrid.map((row, rowIndex) => (
          <div key={rowIndex} className="tetris-row">
            {row.map((cell, colIndex) => (
              <div
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(cell, rowIndex, colIndex)}
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