/**
 * 2048 Game - Chaos multiplayer mode: everyone swipes, host controls access
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { useCoinService } from '../../hooks/useCoinService';
import { UserService } from '../../services/UserService';
import { useGameAction, useGameSnapshot, useSession } from '../../hooks/useSession';
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
import { game2048Game, pickRandomTile, type Game2048Action } from './Game2048.game';
import type { Player } from '../../core';
import './Game2048.css';

const GAME2048_CONFIG: GameConfig = {
  id: 'game2048',
  name: '2048',
  description: 'Classic number puzzle - combine tiles to reach 2048!',
  version: '1.0.0',
  autoSaveEnabled: true,
  autoSaveIntervalMs: 10000
};

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
        moves: 0,
        guestsCanPlay: true,
      },
      isComplete: false,
      score: 0
    };
  }

  validateState(state: GameState<Game2048Data>): boolean {
    return !!(
      state?.data &&
      Array.isArray(state.data.grid) &&
      state.data.grid.length === 4 &&
      state.data.grid.every(row => Array.isArray(row) && row.length === 4) &&
      typeof state.data.score === 'number' &&
      typeof state.data.gameOver === 'boolean'
    );
  }

  onSaveLoad(state: GameState<Game2048Data>): void {
    console.log('2048 loaded', { score: state.data.score, moves: state.data.moves, highest: getHighestTile(state.data.grid) });
  }

  onSaveDropped(): void {
    console.log('2048 save dropped');
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
  const session = useSession();

  const isInSession = session.isInSession;
  const isHost = session.role === 'host';
  const localPeer = session.localPlayer;

  // Animation state
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

  // Keep a ref so callbacks always see the latest state
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  // Load theme on mount
  useEffect(() => {
    const profile = userService.loadProfile();
    if (profile?.purchasedThemes?.game2048) {
      setPurchasedThemes(profile.purchasedThemes.game2048);
    }
    const savedTheme = ((gameState.data as Game2048Data & { currentTheme?: Game2048Theme })?.currentTheme) || 'classic';
    setCurrentTheme(savedTheme);
  }, [userService, gameState.data]);

  // ── Apply an action to local state ────────────────────────────────────────

  const applyAction = useCallback((action: Game2048Action, from: Player) => {
    const prev = gameStateRef.current;
    const next = game2048Game.reduce(prev.data, action, from);
    if (!next) return;

    const wonNow = !prev.data.gameWon && next.gameWon;
    const scoreIncrease = next.score - prev.data.score;

    if (scoreIncrease > 0) {
      earnCoins(Math.floor(scoreIncrease / 4), 'game_play', 'game2048', `2048 merge: ${scoreIncrease} points`);
      setScoreAnimated(true);
      setTimeout(() => setScoreAnimated(false), 400);

      // Animate merges
      const mergedPos = new Set<string>();
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (next.grid[r][c] > prev.data.grid[r][c] && next.grid[r][c] > 0) {
            mergedPos.add(`${r}-${c}`);
          }
        }
      }
      setMergedTiles(mergedPos);
      setTimeout(() => setMergedTiles(new Set()), 200);
    }

    // Animate new tile
    if (action.type === 'move' && action.newTile) {
      const key = `${action.newTile.row}-${action.newTile.col}`;
      setNewTiles(new Set([key]));
      setTimeout(() => setNewTiles(new Set()), 300);
    }

    if (wonNow) {
      awardGameCompletion('game2048', 50, next.score);
    }

    setGameState({
      ...prev,
      data: next,
      score: next.score,
      isComplete: next.gameWon,
      lastModified: new Date().toISOString(),
    });
  }, [setGameState, earnCoins, awardGameCompletion]);

  // ── Receive remote actions ────────────────────────────────────────────────

  useGameAction<Game2048Action>('game2048', (action, from) => {
    applyAction(action, from);
  });

  // ── Receive snapshot (mid-game join or new game from host) ────────────────

  useGameSnapshot<Game2048Data>('game2048', snapshot => {
    try {
      const validated = game2048Game.validateSnapshot(snapshot);
      const prev = gameStateRef.current;
      setGameState({
        ...prev,
        data: validated,
        score: validated.score,
        isComplete: validated.gameWon,
      });
    } catch {
      // malformed snapshot — ignore
    }
  });

  // ── Host: serve snapshot to late joiners ──────────────────────────────────

  useEffect(() => {
    if (!isHost || !session.manager) return;
    return session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
      if (gameId !== 'game2048') return;
      session.sendSnapshot('game2048', gameStateRef.current.data, fromPeerId);
    });
  }, [isHost, session]);

  // ── Guest: request snapshot on connect ───────────────────────────────────

  useEffect(() => {
    if (session.status === 'connected' && !isHost) {
      session.requestSnapshot('game2048');
    }
  }, [session.status, isHost, session]);

  // ── Move handling ─────────────────────────────────────────────────────────

  const handleMove = useCallback((direction: Direction) => {
    const data = gameStateRef.current.data;
    if (data.gameOver) return;

    const player: Player = localPeer ?? { id: playerId, name: playerId, joinedAt: Date.now() };

    if (!game2048Game.canAct(data, player.id)) return;

    if (isInSession) {
      // Pre-compute move to check validity without mutating state
      const moveResult = moveGrid(data.grid, direction);
      if (!moveResult.moved) return;

      // Sender picks the random tile deterministically
      const newTile = pickRandomTile(moveResult.newGrid);
      const action: Game2048Action = { type: 'move', direction, newTile };
      session.sendAction('game2048', action);
    } else {
      // Solo play — apply directly
      const previousGrid = copyGrid(data.grid);
      const previousScore = data.score;
      const moveResult = moveGrid(data.grid, direction);
      if (!moveResult.moved) return;

      const newGrid = copyGrid(moveResult.newGrid);
      addRandomTile(newGrid);

      const newScore = data.score + moveResult.scoreIncrease;
      const gameOver = moveResult.gameOver || !canMove(newGrid);

      if (moveResult.scoreIncrease > 0) {
        earnCoins(Math.floor(moveResult.scoreIncrease / 4), 'game_play', 'game2048', `2048 merge`);
        setScoreAnimated(true);
        setTimeout(() => setScoreAnimated(false), 400);

        const mergedPos = new Set<string>();
        for (let r = 0; r < 4; r++) {
          for (let c = 0; c < 4; c++) {
            if (newGrid[r][c] > moveResult.newGrid[r][c] && newGrid[r][c] > 0) {
              mergedPos.add(`${r}-${c}`);
            }
          }
        }
        setMergedTiles(mergedPos);
        setTimeout(() => setMergedTiles(new Set()), 200);
      }

      if (moveResult.gameWon && !data.gameWon) {
        awardGameCompletion('game2048', 50, newScore);
      }

      const prev = gameStateRef.current;
      const newGameState: GameState<Game2048Data> = {
        ...prev,
        data: {
          ...data,
          grid: newGrid,
          score: newScore,
          bestScore: Math.max(data.bestScore, newScore),
          gameOver,
          gameWon: data.gameWon || moveResult.gameWon,
          canUndo: true,
          previousGrid,
          previousScore,
          moves: data.moves + 1,
        },
        score: newScore,
        isComplete: moveResult.gameWon,
        lastModified: new Date().toISOString()
      };
      setGameState(newGameState);

      if ((data.moves + 1) % 5 === 0 || newScore > data.bestScore) {
        triggerAutoSave();
      }
    }
  }, [gameState, localPeer, playerId, isInSession, session, earnCoins, awardGameCompletion, setGameState, triggerAutoSave]);

  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (gameStateRef.current.data.gameOver) return;
    const map: Record<string, Direction> = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    };
    const direction = map[event.key];
    if (!direction) return;
    event.preventDefault();
    handleMove(direction);
  }, [handleMove]);

  // ── Undo (solo only) ──────────────────────────────────────────────────────

  const handleUndo = useCallback(async () => {
    const data = gameStateRef.current.data;
    if (!data.canUndo || !data.previousGrid || isInSession) return;
    if (!canSpend(UNDO_COST)) {
      alert(`Need ${UNDO_COST} coins to undo.`);
      return;
    }
    if (!spendCoins(UNDO_COST, 'undo', 'Undid 2048 move')) return;

    const prev = gameStateRef.current;
    setGameState({
      ...prev,
      data: {
        ...data,
        grid: data.previousGrid,
        score: data.previousScore ?? 0,
        gameOver: false,
        canUndo: false,
        previousGrid: undefined,
        previousScore: undefined,
        moves: Math.max(0, data.moves - 1),
      },
      score: data.previousScore ?? 0,
      lastModified: new Date().toISOString()
    });
    await triggerAutoSave();
  }, [isInSession, canSpend, spendCoins, setGameState, triggerAutoSave]);

  // ── New game ──────────────────────────────────────────────────────────────

  const handleNewGame = useCallback(async () => {
    if (isInSession && isHost) {
      const players: Player[] = localPeer ? [localPeer, ...session.peers] : [];
      const freshData = game2048Game.initialState(players);
      const action: Game2048Action = { type: 'new-game', grid: freshData.grid };
      session.sendAction('game2048', action);
    } else if (!isInSession) {
      const prev = gameStateRef.current;
      const newState = controller.getInitialState();
      setGameState({
        ...newState,
        playerId,
        data: { ...newState.data, bestScore: prev.data.bestScore }
      });
      await triggerAutoSave();
    }
    // guests can't start a new game — only host can
  }, [isInSession, isHost, localPeer, session, controller, playerId, setGameState, triggerAutoSave]);

  // ── Guest toggle (host only) ──────────────────────────────────────────────

  const handleToggleGuests = useCallback(() => {
    if (!isHost || !localPeer) return;
    const action: Game2048Action = { type: 'toggle-guests', guestsCanPlay: !gameStateRef.current.data.guestsCanPlay };
    session.sendAction('game2048', action);
  }, [isHost, localPeer, session]);

  // ── Theme management ──────────────────────────────────────────────────────

  const purchaseTheme = useCallback(async (themeId: Game2048Theme) => {
    const theme = THEME_DATA[themeId];
    if (!theme || purchasedThemes.includes(themeId)) return;
    if (!canSpend(theme.cost)) { alert(`Need ${theme.cost} coins.`); return; }
    if (!spendCoins(theme.cost, 'theme', `Purchased ${theme.name} theme`)) return;

    const updatedThemes = [...purchasedThemes, themeId];
    setPurchasedThemes(updatedThemes);
    setCurrentTheme(themeId);

    const profile = userService.loadProfile();
    if (profile) {
      userService.saveProfile({ ...profile, purchasedThemes: { ...profile.purchasedThemes, game2048: updatedThemes } });
    }
    alert(`Purchased ${theme.name} theme!`);
  }, [canSpend, spendCoins, purchasedThemes, userService]);

  const selectTheme = useCallback((themeId: Game2048Theme) => {
    if (!purchasedThemes.includes(themeId)) return;
    setCurrentTheme(themeId);
    const prev = gameStateRef.current;
    setGameState({ ...prev, data: { ...prev.data, currentTheme: themeId } });
  }, [purchasedThemes, setGameState]);

  // ── Input listeners ───────────────────────────────────────────────────────

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);

  useSwipeGestures(gameGridRef, {
    onSwipeLeft: () => handleMove('left'),
    onSwipeRight: () => handleMove('right'),
    onSwipeUp: () => handleMove('up'),
    onSwipeDown: () => handleMove('down'),
    minSwipeDistance: 30,
    maxSwipeTime: 300,
    preventDefault: true
  });

  // ── Tile class helper ─────────────────────────────────────────────────────

  const getTileClass = useCallback((value: number, row: number, col: number) => {
    const key = `${row}-${col}`;
    let cls = 'game2048-cell';
    if (value === 0) return cls;
    cls += ` game2048-tile-${value}`;
    if (newTiles.has(key)) cls += ' game2048-cell-new';
    if (mergedTiles.has(key)) cls += ' game2048-cell-merged';
    return cls;
  }, [newTiles, mergedTiles]);

  if (isLoading) {
    return <div className="game2048-container"><h2>Loading 2048...</h2></div>;
  }

  const themeData = THEME_DATA[currentTheme];
  const { data } = gameState;
  const canAct = game2048Game.canAct(data, localPeer?.id ?? playerId);

  return (
    <div
      className="game2048-container"
      ref={gameContainerRef}
      style={{ background: themeData.colors.container, color: themeData.colors.text }}
    >
      <div className="game2048-header">
        <h1
          className="game2048-title"
          style={{ background: themeData.colors.title, backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
        >
          2048
        </h1>
      </div>

      <div className="game2048-score-container">
        <div className="game2048-score-box">
          <div className="game2048-score-label">Score</div>
          <div className={`game2048-score-value ${scoreAnimated ? 'game2048-score-animated' : ''}`}>{data.score}</div>
        </div>
        <div className="game2048-score-box">
          <div className="game2048-score-label">Best</div>
          <div className="game2048-score-value">{data.bestScore}</div>
        </div>
        <div className="game2048-score-box">
          <div className="game2048-score-label">Coins</div>
          <div className="game2048-score-value">🪙 {balance}</div>
        </div>
      </div>

      {/* Multiplayer status bar */}
      {isInSession && (
        <div className="game2048-mp-bar">
          {isHost ? (
            <button
              className={`game2048-btn ${data.guestsCanPlay ? 'game2048-btn-secondary' : 'game2048-btn-primary'}`}
              onClick={handleToggleGuests}
            >
              {data.guestsCanPlay ? 'Block guests' : 'Allow guests'}
            </button>
          ) : (
            <span className="game2048-mp-status">
              {canAct ? 'Your swipes count!' : 'Watch mode — host blocked guests'}
            </span>
          )}
        </div>
      )}

      <div className="game2048-controls">
        {(!isInSession || isHost) && (
          <button className="game2048-btn game2048-btn-primary" onClick={handleNewGame}>
            New Game
          </button>
        )}
        {!isInSession && (
          <button
            className="game2048-btn game2048-btn-secondary"
            onClick={handleUndo}
            disabled={!data.canUndo || !canSpend(UNDO_COST)}
            title={!canSpend(UNDO_COST) ? `Need ${UNDO_COST} coins` : `Undo (${UNDO_COST} coins)`}
          >
            Undo ({UNDO_COST} 🪙)
          </button>
        )}
        <button className="game2048-btn game2048-btn-theme" onClick={() => setShowThemeSelector(!showThemeSelector)}>
          Themes
        </button>
      </div>

      {data.gameWon && (
        <div className="game2048-status game2048-status-won">You reached 2048!</div>
      )}
      {data.gameOver && (
        <div className="game2048-status game2048-status-over">Game Over! No more moves.</div>
      )}

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
                  onClick={() => isOwned ? selectTheme(themeId as Game2048Theme) : canAfford && purchaseTheme(themeId as Game2048Theme)}
                  style={{ background: theme.colors.container, borderColor: isCurrent ? theme.colors.text : 'transparent' }}
                >
                  <div className="theme-preview" style={{ background: theme.colors.gridBackground }}>
                    <div className="theme-tile" style={{ background: theme.colors.tiles[2].background, color: theme.colors.tiles[2].color }}>2</div>
                    <div className="theme-tile" style={{ background: theme.colors.tiles[4].background, color: theme.colors.tiles[4].color }}>4</div>
                    <div className="theme-tile" style={{ background: theme.colors.tiles[8].background, color: theme.colors.tiles[8].color }}>8</div>
                  </div>
                  <div className="theme-info">
                    <h4 style={{ color: theme.colors.text }}>{theme.name}</h4>
                    <p style={{ color: theme.colors.text, opacity: 0.7 }}>{theme.description}</p>
                    {!isOwned && <div className={`theme-cost ${!canAfford ? 'insufficient' : ''}`}>{canAfford ? `🪙 ${theme.cost}` : `🚫 ${theme.cost} needed`}</div>}
                    {isCurrent && <div className="current-badge">Active</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="game2048-grid-container" ref={gameGridRef}>
        <div className="game2048-grid" style={{ background: themeData.colors.gridBackground }}>
          {data.grid.map((row, ri) =>
            row.map((tile, ci) => (
              <div
                key={`${ri}-${ci}`}
                className={getTileClass(tile, ri, ci)}
                style={tile > 0 ? {
                  background: themeData.colors.tiles[tile as TileValue]?.background || themeData.colors.emptyCell,
                  color: themeData.colors.tiles[tile as TileValue]?.color || themeData.colors.text
                } : { background: themeData.colors.emptyCell }}
              >
                {tile > 0 ? tile : ''}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="game2048-instructions">
        <small>Moves: {data.moves}</small>
      </div>

      {lastSaveEvent?.success && (
        <div style={{ marginTop: '0.5rem', padding: '0.25rem', backgroundColor: '#e8f5e8', border: '1px solid #4CAF50', borderRadius: '4px', fontSize: '0.7rem', textAlign: 'center' }}>
          Saved
        </div>
      )}
    </div>
  );
};

export default Game2048;
