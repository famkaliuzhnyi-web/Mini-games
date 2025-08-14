/**
 * 2048 Game - Classic number puzzle game  
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { useCoinService } from '../../hooks/useCoinService';
import { UserService } from '../../services/UserService';
import type { GameController, GameState, GameConfig } from '../../types/game';
import type { Game2048Data, Direction, Game2048Theme, TileValue } from './types';
import { THEME_DATA, UNDO_COST } from './themes';
import {
  createInitialGrid,
  moveGrid,
  addRandomTile,
  copyGrid,
  canMove,
  getHighestTile
} from './logic';
import './Game2048.css';

// 2048 game configuration
const GAME2048_CONFIG: GameConfig = {
  id: 'game2048',
  name: '2048',
  description: 'Classic number puzzle - combine tiles to reach 2048!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000 // Save every 10 seconds or on significant moves
};

// 2048 game controller
class Game2048Controller implements GameController<Game2048Data> {
  config = GAME2048_CONFIG;

  getInitialState(): GameState<Game2048Data> {
    const now = new Date().toISOString();
    return {
      gameId: 'game2048',
      playerId: '',
      version: this.config.version,
      createdAt: now,
      lastModified: now,
      data: {
        grid: createInitialGrid(),
        score: 0,
        bestScore: 0,
        gameOver: false,
        gameWon: false,
        canUndo: false,
        moves: 0
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<Game2048Data>): boolean {
    return !!(
      state &&
      state.data &&
      Array.isArray(state.data.grid) &&
      state.data.grid.length === 4 &&
      state.data.grid.every(row => Array.isArray(row) && row.length === 4) &&
      typeof state.data.score === 'number' &&
      typeof state.data.bestScore === 'number' &&
      typeof state.data.gameOver === 'boolean' &&
      typeof state.data.gameWon === 'boolean' &&
      typeof state.data.moves === 'number'
    );
  }

  onSaveLoad(state: GameState<Game2048Data>): void {
    console.log('2048 game loaded:', {
      score: state.data.score,
      bestScore: state.data.bestScore,
      moves: state.data.moves,
      highestTile: getHighestTile(state.data.grid)
    });
  }

  onSaveDropped(): void {
    console.log('2048 game save dropped');
  }
}

interface Game2048Props {
  playerId: string;
}

export const Game2048: React.FC<Game2048Props> = ({ playerId }) => {
  const controller = useMemo(() => new Game2048Controller(), []);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const gameGridRef = useRef<HTMLDivElement>(null);
  const { earnCoins, awardGameCompletion, spendCoins, canSpend, balance } = useCoinService();
  const userService = useMemo(() => UserService.getInstance(), []);
  
  // Animation state for tiles
  const [animatingTiles, setAnimatingTiles] = useState<Set<string>>(new Set());
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());
  const [scoreAnimated, setScoreAnimated] = useState(false);
  
  // Theme management
  const [currentTheme, setCurrentTheme] = useState<Game2048Theme>('classic');
  const [purchasedThemes, setPurchasedThemes] = useState<string[]>(['classic']);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  const {
    gameState,
    setGameState,
    triggerAutoSave,
    isLoading,
    lastSaveEvent
  } = useGameSave<Game2048Data>({
    gameId: 'game2048',
    playerId,
    gameConfig: GAME2048_CONFIG,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped
  });

  // Load user's purchased themes and current theme on component mount
  useEffect(() => {
    const profile = userService.loadProfile();
    if (profile?.purchasedThemes?.game2048) {
      setPurchasedThemes(profile.purchasedThemes.game2048);
    }
    // Load saved theme from game state or default to classic
    const savedTheme = ((gameState.data as Game2048Data & { currentTheme?: Game2048Theme })?.currentTheme) || 'classic';
    setCurrentTheme(savedTheme);
  }, [userService, gameState.data]);

  // Theme management functions
  const purchaseTheme = useCallback(async (themeId: Game2048Theme) => {
    const theme = THEME_DATA[themeId];
    if (!theme || purchasedThemes.includes(themeId)) return;

    if (!canSpend(theme.cost)) {
      alert(`Insufficient coins! You need ${theme.cost} coins to purchase this theme.`);
      return;
    }

    const transaction = spendCoins(theme.cost, 'theme', `Purchased ${theme.name} theme for 2048`);
    if (transaction) {
      const updatedThemes = [...purchasedThemes, themeId];
      setPurchasedThemes(updatedThemes);
      
      // Update user profile
      const profile = userService.loadProfile();
      if (profile) {
        const updatedProfile = {
          ...profile,
          purchasedThemes: {
            ...profile.purchasedThemes,
            game2048: updatedThemes
          }
        };
        userService.saveProfile(updatedProfile);
      }
      
      // Auto-select the purchased theme
      setCurrentTheme(themeId);
      alert(`Successfully purchased ${theme.name} theme!`);
    }
  }, [canSpend, spendCoins, purchasedThemes, userService]);

  const selectTheme = useCallback((themeId: Game2048Theme) => {
    if (!purchasedThemes.includes(themeId)) return;
    setCurrentTheme(themeId);
    
    // Save theme to game state
    const newGameState = {
      ...gameState,
      data: {
        ...gameState.data,
        currentTheme: themeId
      }
    };
    setGameState(newGameState);
  }, [purchasedThemes, gameState, setGameState]);

  // Handle keyboard input
  const handleMove = useCallback(async (direction: Direction) => {
    if (gameState.data.gameOver) return;

    // Store current state for undo and comparison
    const previousGrid = copyGrid(gameState.data.grid);
    const previousScore = gameState.data.score;

    // Attempt the move
    const moveResult = moveGrid(gameState.data.grid, direction);
    
    if (!moveResult.moved) {
      return; // No valid move
    }

    // Clear previous animation states
    setAnimatingTiles(new Set());
    setMergedTiles(new Set());
    setNewTiles(new Set());

    // Detect merged tiles by comparing grids and finding score increase sources
    const mergedPositions = new Set<string>();
    if (moveResult.scoreIncrease > 0) {
      // Find positions where tiles likely merged
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          const currentTile = moveResult.newGrid[row][col];
          const previousTile = previousGrid[row][col];
          
          // If a tile value increased compared to previous position, it likely merged
          if (currentTile > 0 && currentTile > previousTile) {
            mergedPositions.add(`${row}-${col}`);
          }
        }
      }
      setMergedTiles(mergedPositions);
    }

    // Add a new random tile after successful move
    const newGrid = copyGrid(moveResult.newGrid);
    const newTileAdded = addRandomTile(newGrid);

    // Track new tile position for animation
    if (newTileAdded) {
      const newTilePositions = new Set<string>();
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (newGrid[row][col] !== 0 && moveResult.newGrid[row][col] === 0) {
            newTilePositions.add(`${row}-${col}`);
          }
        }
      }
      setNewTiles(newTilePositions);
    }

    const newScore = gameState.data.score + moveResult.scoreIncrease;
    const newBestScore = Math.max(gameState.data.bestScore, newScore);
    const newMoves = gameState.data.moves + 1;

    // Award coins for scoring (every merge awards coins equal to merged value)
    if (moveResult.scoreIncrease > 0) {
      earnCoins(
        Math.floor(moveResult.scoreIncrease / 4), // Convert score to coins (4 points = 1 coin)
        'game_play',
        'game2048',
        `2048 merge: ${moveResult.scoreIncrease} points`
      );
      setScoreAnimated(true);
      setTimeout(() => setScoreAnimated(false), 400);
    }

    // Check if game is over after adding new tile
    const finalGameOver = moveResult.gameOver || !canMove(newGrid);

    const newGameState: GameState<Game2048Data> = {
      ...gameState,
      data: {
        ...gameState.data,
        grid: newGrid,
        score: newScore,
        bestScore: newBestScore,
        gameOver: finalGameOver,
        gameWon: gameState.data.gameWon || moveResult.gameWon,
        canUndo: true,
        previousGrid,
        previousScore,
        moves: newMoves
      },
      score: newScore,
      isComplete: moveResult.gameWon,
      lastModified: new Date().toISOString()
    };

    setGameState(newGameState);

    // Award coins for game completion (reaching 2048)
    if (moveResult.gameWon && !gameState.data.gameWon) {
      awardGameCompletion('game2048', 50, newScore); // Base reward + score bonus
    }

    // Clear animations after delays
    setTimeout(() => {
      setMergedTiles(new Set());
    }, 200);
    
    setTimeout(() => {
      setNewTiles(new Set());
    }, 300);

    // Trigger auto-save on significant moves (every 5 moves or high score)
    if (newMoves % 5 === 0 || newScore > gameState.data.bestScore) {
      await triggerAutoSave();
    }
  }, [gameState, setGameState, triggerAutoSave, earnCoins, awardGameCompletion]);

  const handleKeyPress = useCallback(async (event: KeyboardEvent) => {
    if (gameState.data.gameOver) return;

    let direction: Direction | null = null;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        direction = 'up';
        break;
      case 'ArrowDown':  
      case 's':
      case 'S':
        direction = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        direction = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        direction = 'right';
        break;
      default:
        return;
    }

    event.preventDefault();
    if (direction) {
      await handleMove(direction);
    }
  }, [gameState.data.gameOver, handleMove]);

  // Handle undo with coin cost
  const handleUndo = useCallback(async () => {
    if (!gameState.data.canUndo || !gameState.data.previousGrid) return;
    
    // Check if user has enough coins for undo
    if (!canSpend(UNDO_COST)) {
      alert(`Insufficient coins! You need ${UNDO_COST} coins to undo your last move.`);
      return;
    }

    // Spend coins for undo
    const transaction = spendCoins(UNDO_COST, 'undo', `Undid last move in 2048 game`);
    if (!transaction) {
      alert(`Failed to spend coins for undo. Please try again.`);
      return;
    }

    const newGameState: GameState<Game2048Data> = {
      ...gameState,
      data: {
        ...gameState.data,
        grid: gameState.data.previousGrid,
        score: gameState.data.previousScore || 0,
        gameOver: false,
        canUndo: false,
        previousGrid: undefined,
        previousScore: undefined,
        moves: Math.max(0, gameState.data.moves - 1) // Decrement moves counter
      },
      score: gameState.data.previousScore || 0,
      lastModified: new Date().toISOString()
    };

    setGameState(newGameState);
    await triggerAutoSave();
  }, [gameState, setGameState, triggerAutoSave, canSpend, spendCoins]);

  // Handle new game
  const handleNewGame = useCallback(async () => {
    const newState = controller.getInitialState();
    const newGameState: GameState<Game2048Data> = {
      ...newState,
      playerId,
      data: {
        ...newState.data,
        bestScore: gameState.data.bestScore // Keep best score
      }
    };

    setGameState(newGameState);
    await triggerAutoSave();
  }, [controller, playerId, gameState.data.bestScore, setGameState, triggerAutoSave]);

  // Keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // Swipe gesture support - only on game grid, not entire container
  useSwipeGestures(gameGridRef, {
    onSwipeLeft: () => handleMove('left'),
    onSwipeRight: () => handleMove('right'),
    onSwipeUp: () => handleMove('up'),
    onSwipeDown: () => handleMove('down'),
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });



  // Get CSS class for tile value with animation states
  const getTileClass = useCallback((value: number, row: number, col: number) => {
    const tileKey = `${row}-${col}`;
    let className = 'game2048-cell';
    
    if (value === 0) return className;
    
    className += ` game2048-tile-${value}`;
    
    // Add animation classes
    if (newTiles.has(tileKey)) {
      className += ' game2048-cell-new';
    }
    
    if (mergedTiles.has(tileKey)) {
      className += ' game2048-cell-merged';
    }
    
    if (animatingTiles.has(tileKey)) {
      className += ' game2048-cell-moving';
    }
    
    return className;
  }, [newTiles, mergedTiles, animatingTiles]);

  if (isLoading) {
    return (
      <div className="game2048-container">
        <h2>Loading 2048 Game...</h2>
      </div>
    );
  }

  // Get current theme data
  const themeData = THEME_DATA[currentTheme];

  return (
    <div 
      className="game2048-container" 
      ref={gameContainerRef}
      style={{
        background: themeData.colors.container,
        color: themeData.colors.text
      }}
    >
      <div className="game2048-header">
        <h1 
          className="game2048-title"
          style={{
            background: themeData.colors.title,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          2048
        </h1>
      </div>

      <div className="game2048-score-container">
        <div className="game2048-score-box">
          <div className="game2048-score-label">Score</div>
          <div className={`game2048-score-value ${scoreAnimated ? 'game2048-score-animated' : ''}`}>
            {gameState.data.score}
          </div>
        </div>
        <div className="game2048-score-box">
          <div className="game2048-score-label">Best</div>
          <div className="game2048-score-value">{gameState.data.bestScore}</div>
        </div>
        <div className="game2048-score-box">
          <div className="game2048-score-label">Coins</div>
          <div className="game2048-score-value">🪙 {balance}</div>
        </div>
      </div>

      <div className="game2048-controls">
        <button 
          className="game2048-btn game2048-btn-primary"
          onClick={handleNewGame}
        >
          New Game
        </button>
        <button 
          className="game2048-btn game2048-btn-secondary"
          onClick={handleUndo}
          disabled={!gameState.data.canUndo || !canSpend(UNDO_COST)}
          title={!canSpend(UNDO_COST) ? `Need ${UNDO_COST} coins to undo` : `Undo last move (${UNDO_COST} coins)`}
        >
          Undo ({UNDO_COST} 🪙)
        </button>
        <button 
          className="game2048-btn game2048-btn-theme"
          onClick={() => setShowThemeSelector(!showThemeSelector)}
        >
          🎨 Themes
        </button>
      </div>

      {/* Game Status Messages */}
      {gameState.data.gameWon && (
        <div className="game2048-status game2048-status-won">
          🎉 You Win! You reached 2048! 🎉
        </div>
      )}
      
      {gameState.data.gameOver && (
        <div className="game2048-status game2048-status-over">
          💀 Game Over! No more moves available.
        </div>
      )}

      {/* Theme Selector */}
      {showThemeSelector && (
        <div className="game2048-theme-selector">
          <h3>Choose Your Theme</h3>
          <div className="game2048-themes-grid">
            {Object.entries(THEME_DATA).map(([themeId, theme]) => {
              const isOwned = purchasedThemes.includes(themeId);
              const isCurrent = currentTheme === themeId;
              const canAfford = canSpend(theme.cost);
              
              return (
                <div 
                  key={themeId}
                  className={`game2048-theme-card ${isCurrent ? 'current' : ''} ${!isOwned ? 'locked' : ''}`}
                  onClick={() => {
                    if (isOwned) {
                      selectTheme(themeId as Game2048Theme);
                    } else if (canAfford) {
                      purchaseTheme(themeId as Game2048Theme);
                    }
                  }}
                  style={{ 
                    background: theme.colors.container,
                    borderColor: isCurrent ? theme.colors.text : 'transparent'
                  }}
                >
                  <div className="theme-preview" style={{ background: theme.colors.gridBackground }}>
                    {/* Mini tile preview */}
                    <div className="theme-tile" style={{ background: theme.colors.tiles[2].background, color: theme.colors.tiles[2].color }}>2</div>
                    <div className="theme-tile" style={{ background: theme.colors.tiles[4].background, color: theme.colors.tiles[4].color }}>4</div>
                    <div className="theme-tile" style={{ background: theme.colors.tiles[8].background, color: theme.colors.tiles[8].color }}>8</div>
                  </div>
                  <div className="theme-info">
                    <h4 style={{ color: theme.colors.text }}>{theme.name}</h4>
                    <p style={{ color: theme.colors.text, opacity: 0.7 }}>{theme.description}</p>
                    {!isOwned && (
                      <div className={`theme-cost ${!canAfford ? 'insufficient' : ''}`}>
                        {canAfford ? `🪙 ${theme.cost}` : `🚫 ${theme.cost} coins needed`}
                      </div>
                    )}
                    {isCurrent && <div className="current-badge">✓ Active</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="game2048-grid-container" ref={gameGridRef}>
        <div 
          className="game2048-grid"
          style={{
            background: themeData.colors.gridBackground
          }}
        >
          {gameState.data.grid.map((row, rowIndex) =>
            row.map((tile, colIndex) => (
              <div 
                key={`${rowIndex}-${colIndex}`}
                className={getTileClass(tile, rowIndex, colIndex)}
                style={tile > 0 ? {
                  background: themeData.colors.tiles[tile as TileValue]?.background || themeData.colors.emptyCell,
                  color: themeData.colors.tiles[tile as TileValue]?.color || themeData.colors.text
                } : {
                  background: themeData.colors.emptyCell
                }}
              >
                {tile > 0 ? tile : ''}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="game2048-instructions">
        <p>
          <small>Moves: {gameState.data.moves}</small>
        </p>
      </div>

      {/* Save Status */}
      {lastSaveEvent && lastSaveEvent.success && (
        <div style={{ 
          marginTop: '0.5rem',
          padding: '0.25rem',
          backgroundColor: '#e8f5e8',
          border: '1px solid #4CAF50',
          borderRadius: '4px',
          fontSize: '0.7rem',
          textAlign: 'center'
        }}>
          ✅ Saved
        </div>
      )}
    </div>
  );
};

export default Game2048;