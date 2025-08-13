/**
 * Sudoku Game Slot Components - Components that work with the GameLayout slots system
 */
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useTheme } from '../../hooks/useTheme';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { SudokuGameData, Difficulty, CellValue, SudokuGrid } from './types';
import {
  createEmptyGrid,
  createEmptyUIGrid,
  generateCompleteGrid,
  createPuzzle,
  gridToUIGrid,
  updateValidation,
  isSolved,
  getDifficultySettings,
  getHint
} from './logic';

// Sudoku game configuration
const SUDOKU_CONFIG: GameConfig = {
  id: 'sudoku',
  name: 'Sudoku',
  description: 'Classic number placement puzzle with multiple difficulty levels',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 5000
};

// Sudoku game controller
class SudokuGameController implements GameController<SudokuGameData> {
  config = SUDOKU_CONFIG;

  getInitialState(): GameState<SudokuGameData> {
    const now = new Date().toISOString();
    const difficulty: Difficulty = 'easy';
    const settings = getDifficultySettings(difficulty);
    
    return {
      gameId: 'sudoku',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        initialGrid: createEmptyGrid(),
        currentGrid: createEmptyGrid(),
        uiGrid: createEmptyUIGrid(),
        difficulty,
        hintsUsed: 0,
        mistakes: 0,
        timeSpent: 0,
        isComplete: false,
        maxHints: settings.maxHints,
        maxMistakes: settings.maxMistakes
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<SudokuGameData>): boolean {
    return !!(
      state &&
      state.data &&
      Array.isArray(state.data.initialGrid) &&
      Array.isArray(state.data.currentGrid) &&
      Array.isArray(state.data.uiGrid) &&
      typeof state.data.difficulty === 'string' &&
      typeof state.data.hintsUsed === 'number' &&
      typeof state.data.mistakes === 'number' &&
      typeof state.data.timeSpent === 'number' &&
      typeof state.data.isComplete === 'boolean' &&
      typeof state.data.maxHints === 'number' &&
      typeof state.data.maxMistakes === 'number'
    );
  }

  onSaveLoad(state: GameState<SudokuGameData>): void {
    console.log('Sudoku game loaded:', {
      difficulty: state.data.difficulty,
      progress: `${state.data.hintsUsed}/${state.data.maxHints} hints used`,
      timeSpent: `${Math.floor(state.data.timeSpent / 60)}:${(state.data.timeSpent % 60).toString().padStart(2, '0')}`
    });
  }

  onSaveDropped(): void {
    console.log('Sudoku game save dropped');
  }
}

interface SlotComponentProps {
  playerId: string;
}

// Shared state hook for sudoku game
const useSudokuState = (playerId: string) => {
  const controller = useMemo(() => new SudokuGameController(), []);
  const { currentTheme } = useTheme();
  
  const [solutionGrid, setSolutionGrid] = useState<SudokuGrid>(createEmptyGrid());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    triggerAutoSave,
    hasSave,
    isLoading,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave
  } = useGameSave<SudokuGameData>({
    gameId: 'sudoku',
    playerId,
    gameConfig: SUDOKU_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Timer effect
  useEffect(() => {
    if (gameState.data.isComplete) return;

    const interval = setInterval(() => {
      const currentTime = Math.floor((Date.now() - gameStartTime) / 1000);
      if (currentTime !== gameState.data.timeSpent) {
        setGameState({
          ...gameState,
          data: {
            ...gameState.data,
            timeSpent: currentTime
          },
          lastModified: new Date().toISOString()
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState.data.isComplete, gameState.data.timeSpent, gameStartTime, setGameState]);

  const startNewGame = useCallback((difficulty: Difficulty) => {
    const completeGrid = generateCompleteGrid();
    const puzzleGrid = createPuzzle(completeGrid, difficulty);
    const uiGrid = gridToUIGrid(puzzleGrid, puzzleGrid);
    const settings = getDifficultySettings(difficulty);
    
    setSolutionGrid(completeGrid);
    setGameStartTime(Date.now());
    setSelectedCell(null);
    
    setGameState({
      ...gameState,
      data: {
        initialGrid: puzzleGrid.map(row => [...row]) as SudokuGrid,
        currentGrid: puzzleGrid.map(row => [...row]) as SudokuGrid,
        uiGrid,
        difficulty,
        hintsUsed: 0,
        mistakes: 0,
        timeSpent: 0,
        isComplete: false,
        maxHints: settings.maxHints,
        maxMistakes: settings.maxMistakes
      },
      isComplete: false,
      score: 0,
      lastModified: new Date().toISOString()
    });
  }, [gameState, setGameState]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.data.uiGrid[row][col].isInitial) return;
    setSelectedCell({ row, col });
  }, [gameState.data.uiGrid]);

  const handleNumberInput = useCallback(async (number: CellValue) => {
    if (!selectedCell || gameState.data.isComplete) return;
    
    const { row, col } = selectedCell;
    if (gameState.data.uiGrid[row][col].isInitial) return;

    const newGrid = gameState.data.currentGrid.map(r => [...r]) as SudokuGrid;
    newGrid[row][col] = number;

    let newMistakes = gameState.data.mistakes;
    if (number !== 0 && solutionGrid[row][col] !== number) {
      newMistakes++;
    }

    const newUIGrid = updateValidation(gameState.data.uiGrid, newGrid);
    const isGameComplete = isSolved(newGrid);
    let score = 0;
    
    if (isGameComplete) {
      const difficultyMultiplier = { easy: 100, medium: 200, hard: 400, expert: 800 }[gameState.data.difficulty];
      const timeBonus = Math.max(0, 3600 - gameState.data.timeSpent);
      const hintPenalty = gameState.data.hintsUsed * 50;
      const mistakePenalty = newMistakes * 25;
      score = Math.max(0, difficultyMultiplier + timeBonus - hintPenalty - mistakePenalty);
    }

    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        currentGrid: newGrid,
        uiGrid: newUIGrid,
        mistakes: newMistakes,
        isComplete: isGameComplete
      },
      isComplete: isGameComplete,
      score,
      lastModified: new Date().toISOString()
    });

    if (number !== 0 || isGameComplete) {
      await triggerAutoSave();
    }

    if (newMistakes >= gameState.data.maxMistakes && !isGameComplete) {
      alert(`Game Over! Too many mistakes. The puzzle will be revealed.`);
      const solutionUIGrid = gridToUIGrid(solutionGrid, gameState.data.initialGrid);
      setGameState({
        ...gameState,
        data: {
          ...gameState.data,
          currentGrid: solutionGrid,
          uiGrid: solutionUIGrid,
          isComplete: true
        },
        isComplete: true,
        lastModified: new Date().toISOString()
      });
      await triggerAutoSave();
    }
  }, [selectedCell, gameState, solutionGrid, setGameState, triggerAutoSave]);

  const handleHint = useCallback(async () => {
    if (gameState.data.hintsUsed >= gameState.data.maxHints || gameState.data.isComplete) return;
    
    const hint = getHint(gameState.data.currentGrid, solutionGrid);
    if (!hint) return;
    
    const newGrid = gameState.data.currentGrid.map(r => [...r]) as SudokuGrid;
    newGrid[hint.row][hint.col] = hint.value;
    
    const newUIGrid = updateValidation(gameState.data.uiGrid, newGrid);
    const isGameComplete = isSolved(newGrid);
    
    setGameState({
      ...gameState,
      data: {
        ...gameState.data,
        currentGrid: newGrid,
        uiGrid: newUIGrid,
        hintsUsed: gameState.data.hintsUsed + 1,
        isComplete: isGameComplete
      },
      isComplete: isGameComplete,
      lastModified: new Date().toISOString()
    });
    
    setSelectedCell({ row: hint.row, col: hint.col });
    await triggerAutoSave();
  }, [gameState, solutionGrid, setGameState, triggerAutoSave]);

  const handleClearCell = useCallback(() => {
    handleNumberInput(0);
  }, [handleNumberInput]);

  return {
    gameState,
    isLoading,
    selectedCell,
    currentTheme,
    startNewGame,
    handleCellClick,
    handleNumberInput,
    handleHint,
    handleClearCell,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    lastSaveEvent,
    autoSaveEnabled,
    toggleAutoSave,
    setGameStartTime
  };
};

// Game Field Component (the sudoku board)
export const SudokuGameField: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    selectedCell,
    handleCellClick
  } = useSudokuState(playerId);

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading game...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '1rem',
      backgroundColor: `var(--color-gameBackground)`,
      color: `var(--color-text)`
    }}>
      {/* Game Status */}
      <div style={{
        fontSize: '1.2rem',
        fontWeight: 'bold',
        marginBottom: '1rem',
        textAlign: 'center'
      }}>
        {gameState.data.isComplete ? '🎉 Puzzle Complete!' : `${gameState.data.difficulty.charAt(0).toUpperCase() + gameState.data.difficulty.slice(1)} Sudoku`}
      </div>

      {/* Sudoku Board */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(9, 1fr)',
          gridTemplateRows: 'repeat(9, 1fr)',
          gap: '1px',
          backgroundColor: `var(--color-border)`,
          padding: '2px',
          borderRadius: '8px',
          maxWidth: 'min(80vw, 400px)',
          maxHeight: 'min(80vw, 400px)',
          aspectRatio: '1'
        }}
      >
        {gameState.data.uiGrid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <button
              key={`${rowIndex}-${colIndex}`}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              style={{
                backgroundColor: selectedCell && selectedCell.row === rowIndex && selectedCell.col === colIndex 
                  ? `var(--color-accent)` 
                  : cell.isInitial 
                    ? `var(--color-surface)` 
                    : `var(--color-gameSurface)`,
                border: cell.isInvalid ? `2px solid var(--color-error)` : 'none',
                color: cell.isInitial 
                  ? `var(--color-text)` 
                  : cell.value === 0 
                    ? 'transparent' 
                    : `var(--color-accent)`,
                fontSize: 'min(4vw, 1.2rem)',
                fontWeight: cell.isInitial ? 'bold' : 'normal',
                cursor: cell.isInitial ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '32px',
                aspectRatio: '1',
                touchAction: 'manipulation',
                // Add stronger borders for 3x3 boxes
                borderRight: (colIndex + 1) % 3 === 0 && colIndex < 8 ? `2px solid var(--color-border)` : undefined,
                borderBottom: (rowIndex + 1) % 3 === 0 && rowIndex < 8 ? `2px solid var(--color-border)` : undefined
              }}
            >
              {cell.value === 0 ? '' : cell.value}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// Stats Component
export const SudokuStats: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    lastSaveEvent
  } = useSudokuState(playerId);

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading stats...</div>;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px',
      color: `var(--color-text)`,
      fontSize: '0.9rem'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Stats</div>
      <div style={{ fontSize: '0.8rem', color: `var(--color-textSecondary)`, display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
        <div>Difficulty: {gameState.data.difficulty}</div>
        <div>Time: {formatTime(gameState.data.timeSpent)}</div>
        <div>Hints: {gameState.data.hintsUsed}/{gameState.data.maxHints}</div>
        <div>Mistakes: {gameState.data.mistakes}/{gameState.data.maxMistakes}</div>
        {(gameState.score ?? 0) > 0 && <div>Score: {gameState.score}</div>}
      </div>
      {lastSaveEvent && lastSaveEvent.success && (
        <div style={{ 
          marginTop: '0.25rem',
          fontSize: '0.7rem',
          color: `var(--color-success)`,
          textAlign: 'center'
        }}>
          ✅ Saved
        </div>
      )}
    </div>
  );
};

// Controls Component
export const SudokuControls: React.FC<SlotComponentProps> = ({ playerId }) => {
  const {
    gameState,
    isLoading,
    startNewGame,
    handleNumberInput,
    handleHint,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    autoSaveEnabled,
    toggleAutoSave
  } = useSudokuState(playerId);

  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [showDifficultyMenu, setShowDifficultyMenu] = useState(false);

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
    } else {
      alert(`Load failed: ${result.error}`);
    }
    setShowSaveMenu(false);
  };

  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game?')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
    setShowSaveMenu(false);
  };

  if (isLoading) {
    return <div style={{ color: `var(--color-text)` }}>Loading controls...</div>;
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      padding: '0.5rem',
      backgroundColor: `var(--color-surface)`,
      borderRadius: '8px'
    }}>
      {/* Number Input Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '0.25rem' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
          <button
            key={num}
            onClick={() => handleNumberInput(num as CellValue)}
            style={{
              padding: '0.3rem',
              backgroundColor: `var(--color-accent)`,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              minHeight: '36px',
              touchAction: 'manipulation'
            }}
          >
            {num === 0 ? '✕' : num}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button 
          onClick={handleHint}
          disabled={gameState.data.hintsUsed >= gameState.data.maxHints || gameState.data.isComplete}
          style={{ 
            padding: '0.4rem 0.8rem',
            backgroundColor: gameState.data.hintsUsed >= gameState.data.maxHints || gameState.data.isComplete 
              ? `var(--color-surface)` 
              : `var(--color-warning)`,
            color: gameState.data.hintsUsed >= gameState.data.maxHints || gameState.data.isComplete 
              ? `var(--color-textMuted)` 
              : 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: gameState.data.hintsUsed >= gameState.data.maxHints || gameState.data.isComplete 
              ? 'not-allowed' 
              : 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            touchAction: 'manipulation'
          }}
        >
          💡 Hint
        </button>

        <button 
          onClick={() => setShowDifficultyMenu(!showDifficultyMenu)}
          style={{ 
            padding: '0.4rem 0.8rem',
            backgroundColor: `var(--color-accent)`,
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            touchAction: 'manipulation'
          }}
        >
          New Game
        </button>

        <button 
          onClick={() => setShowSaveMenu(!showSaveMenu)}
          style={{ 
            padding: '0.4rem 0.8rem',
            backgroundColor: `var(--color-secondary)`,
            color: `var(--color-text)`,
            border: `1px solid var(--color-border)`,
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
            minHeight: '36px',
            touchAction: 'manipulation'
          }}
        >
          Save/Load
        </button>
      </div>

      {/* Difficulty Selection Menu */}
      {showDifficultyMenu && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: `var(--color-gameBackground)`,
          borderRadius: '6px',
          border: `1px solid var(--color-border)`
        }}>
          <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>Select Difficulty:</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
            {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(difficulty => (
              <button
                key={difficulty}
                onClick={() => {
                  startNewGame(difficulty);
                  setShowDifficultyMenu(false);
                }}
                style={{
                  padding: '0.4rem',
                  backgroundColor: gameState.data.difficulty === difficulty 
                    ? `var(--color-accent)` 
                    : `var(--color-surface)`,
                  color: gameState.data.difficulty === difficulty 
                    ? 'white' 
                    : `var(--color-text)`,
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  textTransform: 'capitalize'
                }}
              >
                {difficulty}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Save Menu */}
      {showSaveMenu && (
        <div style={{
          padding: '0.5rem',
          backgroundColor: `var(--color-gameBackground)`,
          borderRadius: '6px',
          border: `1px solid var(--color-border)`
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              fontSize: '0.8rem',
              color: `var(--color-textSecondary)`
            }}>
              <input
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={toggleAutoSave}
                style={{ accentColor: `var(--color-accent)` }}
              />
              Auto-save
            </label>
          </div>
          
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            <button 
              onClick={handleManualSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: `var(--color-accent)`,
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Save
            </button>
            
            <button 
              onClick={handleManualLoad}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-success)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Load
            </button>
            
            <button 
              onClick={handleDropSave}
              disabled={!hasSave}
              style={{ 
                padding: '0.25rem 0.5rem',
                backgroundColor: hasSave ? `var(--color-error)` : `var(--color-surface)`,
                color: hasSave ? 'white' : `var(--color-textMuted)`,
                border: 'none',
                borderRadius: '4px',
                cursor: hasSave ? 'pointer' : 'not-allowed',
                fontSize: '0.8rem',
                minHeight: '32px'
              }}
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};