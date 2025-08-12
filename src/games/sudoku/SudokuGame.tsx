/**
 * Sudoku Game Component - Main game implementation
 */
import React, { useState, useEffect, useCallback } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
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
import { SudokuBoard } from './components/SudokuBoard';
import { SudokuControls } from './components/SudokuControls';
import { GameStats } from './components/GameStats';

// Sudoku game configuration
const SUDOKU_CONFIG: GameConfig = {
  id: 'sudoku',
  name: 'Sudoku',
  description: 'Classic number placement puzzle with multiple difficulty levels',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 30000 // Save every 30 seconds
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

interface SudokuGameProps {
  playerId: string;
}

export const SudokuGame: React.FC<SudokuGameProps> = ({ playerId }) => {
  const controller = new SudokuGameController();
  const [solutionGrid, setSolutionGrid] = useState<SudokuGrid>(createEmptyGrid());
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [gameStartTime, setGameStartTime] = useState<number>(Date.now());
  
  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
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

  // Simple timer update without complex dependency management
  useEffect(() => {
    if (gameState.data.isComplete) return;

    const interval = setInterval(() => {
      const currentTime = Math.floor((Date.now() - gameStartTime) / 1000);
      // Only update if time actually changed to avoid excessive updates
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
  }, [gameState, gameStartTime, setGameState]);

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
    if (gameState.data.uiGrid[row][col].isInitial) return; // Can't select initial cells
    setSelectedCell({ row, col });
  }, [gameState.data.uiGrid]);

  const handleNumberInput = useCallback((number: CellValue) => {
    if (!selectedCell || gameState.data.isComplete) return;
    
    const { row, col } = selectedCell;
    if (gameState.data.uiGrid[row][col].isInitial) return;

    const newGrid = gameState.data.currentGrid.map(r => [...r]) as SudokuGrid;
    newGrid[row][col] = number;

    // Check for mistakes if placing a non-zero number
    let newMistakes = gameState.data.mistakes;
    if (number !== 0 && solutionGrid[row][col] !== number) {
      newMistakes++;
    }

    // Update UI grid with validation
    const newUIGrid = updateValidation(gameState.data.uiGrid, newGrid);
    
    // Check if puzzle is solved
    const isGameComplete = isSolved(newGrid);
    let score = 0;
    
    if (isGameComplete) {
      // Calculate score based on difficulty, time, hints used, and mistakes
      const difficultyMultiplier = { easy: 100, medium: 200, hard: 400, expert: 800 }[gameState.data.difficulty];
      const timeBonus = Math.max(0, 3600 - gameState.data.timeSpent); // Bonus for completing quickly
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

    // Game over if too many mistakes
    if (newMistakes >= gameState.data.maxMistakes && !isGameComplete) {
      alert(`Game Over! Too many mistakes. The puzzle will be revealed.`);
      // Show solution
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
    }
  }, [selectedCell, gameState, solutionGrid, setGameState]);

  const handleHint = useCallback(() => {
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
  }, [gameState, solutionGrid, setGameState]);

  const handleClearCell = useCallback(() => {
    handleNumberInput(0);
  }, [handleNumberInput]);

  const handleManualSave = async () => {
    const result = await saveGame();
    if (result.success) {
      alert('Game saved successfully!');
    } else {
      alert(`Save failed: ${result.error}`);
    }
  };

  const handleManualLoad = async () => {
    const result = await loadGame();
    if (result.success) {
      alert('Game loaded successfully!');
      setGameStartTime(Date.now() - (result.gameState?.data.timeSpent || 0) * 1000);
    } else {
      alert(`Load failed: ${result.error}`);
    }
  };

  const handleDropSave = async () => {
    if (window.confirm('Are you sure you want to delete your saved game? This cannot be undone.')) {
      const result = await dropSave();
      if (result.success) {
        alert('Save deleted successfully!');
      } else {
        alert(`Failed to delete save: ${result.error}`);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Loading Sudoku...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      padding: '1rem', 
      maxWidth: '800px', 
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>{SUDOKU_CONFIG.name}</h2>
        <p>{SUDOKU_CONFIG.description}</p>
      </div>

      {/* Game Stats */}
      <GameStats 
        difficulty={gameState.data.difficulty}
        timeSpent={gameState.data.timeSpent}
        hintsUsed={gameState.data.hintsUsed}
        maxHints={gameState.data.maxHints}
        mistakes={gameState.data.mistakes}
        maxMistakes={gameState.data.maxMistakes}
        isComplete={gameState.data.isComplete}
        score={gameState.score || 0}
      />

      {/* Sudoku Board */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <SudokuBoard
          uiGrid={gameState.data.uiGrid}
          selectedCell={selectedCell}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Game Controls */}
      <SudokuControls
        onNumberInput={handleNumberInput}
        onClearCell={handleClearCell}
        onHint={handleHint}
        onNewGame={startNewGame}
        canHint={gameState.data.hintsUsed < gameState.data.maxHints && !gameState.data.isComplete}
        currentDifficulty={gameState.data.difficulty}
        isComplete={gameState.data.isComplete}
      />

      {/* Save/Load Controls */}
      <div style={{ 
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3 style={{ margin: '0 0 1rem 0', textAlign: 'center' }}>Save Management</h3>
        
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              checked={autoSaveEnabled}
              onChange={toggleAutoSave}
            />
            Auto-save enabled (saves every {SUDOKU_CONFIG.autoSaveIntervalMs / 1000}s)
          </label>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={handleManualSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Manual Save
          </button>
          
          <button 
            onClick={handleManualLoad}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
            }}
          >
            Load Game
          </button>
          
          <button 
            onClick={handleDropSave}
            disabled={!hasSave}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: hasSave ? '#f44336' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: hasSave ? 'pointer' : 'not-allowed'
            }}
          >
            Delete Save
          </button>
        </div>

        <div style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
          {hasSave ? '💾 Save available' : '❌ No save data'}
        </div>
      </div>

      {/* Save Event Status */}
      {lastSaveEvent && (
        <div style={{ 
          padding: '0.5rem',
          backgroundColor: lastSaveEvent.success ? '#e8f5e8' : '#fde8e8',
          border: `1px solid ${lastSaveEvent.success ? '#4CAF50' : '#f44336'}`,
          borderRadius: '4px',
          fontSize: '0.9rem',
          textAlign: 'center'
        }}>
          {lastSaveEvent.success ? '✅' : '❌'} 
          {lastSaveEvent.action === 'auto-save' ? 'Auto-saved' : 
           lastSaveEvent.action === 'save' ? 'Saved' : 
           lastSaveEvent.action === 'load' ? 'Loaded' : 
           lastSaveEvent.action === 'drop' ? 'Save deleted' : lastSaveEvent.action}
          {lastSaveEvent.error && ` (${lastSaveEvent.error})`}
          <br />
          <small>{new Date(lastSaveEvent.timestamp).toLocaleString()}</small>
        </div>
      )}
    </div>
  );
};

export default SudokuGame;