/**
 * Snake Game Board Component - Renders the game grid and game elements
 */

import React from 'react';
import type { SnakeGameData, Snake } from '../types';

interface SnakeGameBoardProps {
  gameData: SnakeGameData;
  className?: string;
}

export const SnakeGameBoard: React.FC<SnakeGameBoardProps> = ({
  gameData,
  className = ''
}) => {
  const { grid, snakes, config } = gameData;

  // Get snake by ID for color mapping
  const getSnakeById = (id: string): Snake | undefined => {
    return snakes.find(snake => snake.id === id);
  };

  // Render individual grid cell
  const renderCell = (row: number, col: number) => {
    const cell = grid[row][col];
    let cellClass = 'snake-cell';
    let cellContent = '';

    switch (cell.type) {
      case 'food': {
        cellClass += ' snake-cell--food';
        cellContent = '🍎';
        break;
      }
      case 'snake': {
        const snake = getSnakeById(cell.snakeId!);
        if (snake) {
          cellClass += ' snake-cell--snake';
          if (row === snake.segments[0]?.y && col === snake.segments[0]?.x) {
            cellClass += ' snake-cell--head';
            cellContent = '🐍';
          } else {
            cellContent = '■';
          }
        }
        break;
      }
      default:
        cellClass += ' snake-cell--empty';
    }

    // Apply snake color as CSS custom property
    const snake = cell.snakeId ? getSnakeById(cell.snakeId) : null;
    const style = snake ? { '--snake-color': snake.color } as React.CSSProperties : {};

    return (
      <div
        key={`${row}-${col}`}
        className={cellClass}
        style={style}
        data-x={col}
        data-y={row}
      >
        {cellContent}
      </div>
    );
  };

  return (
    <div className={`snake-game-board ${className}`}>
      <div 
        className="snake-grid"
        style={{
          '--grid-width': config.gridWidth,
          '--grid-height': config.gridHeight
        } as React.CSSProperties}
      >
        {Array.from({ length: config.gridHeight }, (_, row) =>
          Array.from({ length: config.gridWidth }, (_, col) => renderCell(row, col))
        )}
      </div>

      {/* Game Over Overlay */}
      {gameData.gameOver && (
        <div className="snake-game-overlay">
          <div className="snake-game-over">
            <h3>🐍 Game Over!</h3>
            {gameData.winner && (
              <p>Winner: {gameData.winner}</p>
            )}
            <div className="final-scores">
              {snakes.map(snake => (
                <div key={snake.id} className="player-score">
                  <span 
                    className="score-color" 
                    style={{ backgroundColor: snake.color }}
                  />
                  {snake.id}: {snake.score} points
                  {!snake.alive && ' 💀'}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Paused Overlay */}
      {gameData.isPaused && !gameData.gameOver && (
        <div className="snake-game-overlay">
          <div className="snake-paused">
            <h3>⏸️ Game Paused</h3>
            <p>Press Resume to continue</p>
          </div>
        </div>
      )}
    </div>
  );
};