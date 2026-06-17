import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useGameSave } from '../../hooks/useGameSave';
import { useCoinService } from '../../hooks/useCoinService';
import { useGameAction, useGameSnapshot, useSession } from '../../hooks/useSession';
import { useBots } from '../../hooks/useBots';
import { useBotRunner } from '../../hooks/useBotRunner';
import { TicTacToeGameController } from './controller';
import { ticTacToeGame, buildInitialStats, type TicTacToeAction } from './TicTacToe.game';
import { ticTacToeBot } from './TicTacToe.bot';
import type { TicTacToeGameData } from './types';
import type { Player } from '../../core';
import './TicTacToeGame.css';

interface TicTacToeGameProps {
  playerId: string;
  playerName: string;
}

export const TicTacToeGame: React.FC<TicTacToeGameProps> = ({ playerId, playerName }) => {
  const controller = new TicTacToeGameController();
  const { awardGameCompletion, awardGamePlay } = useCoinService();
  const session = useSession();

  const isInSession = session.isInSession;
  const isHost = session.role === 'host';
  const localPeer = session.localPlayer;
  const { bots } = useBots();
  const isHostForBots = !isInSession || isHost;

  const {
    gameState,
    setGameState,
    saveGame,
    loadGame,
    dropSave,
    hasSave,
    isLoading,
    autoSaveEnabled,
    toggleAutoSave,
    lastSaveEvent,
  } = useGameSave<TicTacToeGameData>({
    gameId: 'tic-tac-toe',
    playerId,
    gameConfig: controller.config,
    initialState: { ...controller.getInitialState(), playerId },
    onSaveLoad: controller.onSaveLoad,
    onSaveDropped: controller.onSaveDropped,
  });

  // Keep a ref so callbacks always see the latest state without needing it as a dependency
  const gameStateRef = useRef(gameState);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);

  const [saveExpanded, setSaveExpanded] = useState(false);

  // ── Apply an action to local state ────────────────────────────────────────

  const applyAction = useCallback((action: TicTacToeAction, from: Player) => {
    const prev = gameStateRef.current;
    const next = ticTacToeGame.reduce(prev.data, action, from);
    if (!next) return; // invalid — ignore

    const wasPlaying = prev.data.gameStatus === 'playing';
    const nowDone = next.gameStatus !== 'playing';

    if (wasPlaying && nowDone) {
      awardGameCompletion('tic-tac-toe', next.gameStatus === 'tie' ? 8 : 15);
    }

    setGameState({
      ...prev,
      data: next,
      score: prev.data.moveHistory.length + 1,
      isComplete: nowDone,
      lastModified: new Date().toISOString(),
    });
  }, [setGameState, awardGameCompletion]);

  useBotRunner(bots, gameState.data, ticTacToeGame, ticTacToeBot, isHostForBots, applyAction);

  // ── Receive remote actions ────────────────────────────────────────────────

  useGameAction<TicTacToeAction>('tic-tac-toe', (action, from) => {
    applyAction(action, from);
  });

  // ── Receive game snapshot (mid-game join) ─────────────────────────────────

  useGameSnapshot<TicTacToeGameData>('tic-tac-toe', snapshot => {
    try {
      const validated = ticTacToeGame.validateSnapshot(snapshot);
      const prev = gameStateRef.current;
      setGameState({
        ...prev,
        data: validated,
        isComplete: validated.gameStatus !== 'playing',
      });
    } catch {
      // snapshot malformed — ignore
    }
  });

  // ── Host: serve snapshot to late joiners ──────────────────────────────────

  useEffect(() => {
    if (!isHost || !session.manager) return;
    return session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
      if (gameId !== 'tic-tac-toe') return;
      session.sendSnapshot('tic-tac-toe', gameStateRef.current.data, fromPeerId);
    });
  }, [isHost, session]);

  // ── Guest: request snapshot on connect ───────────────────────────────────

  useEffect(() => {
    if (session.status === 'connected' && !isHost) {
      session.requestSnapshot('tic-tac-toe');
    }
  }, [session.status, isHost, session]);

  // ── Handle local cell click ───────────────────────────────────────────────

  const handleCellClick = (row: number, col: number) => {
    const current = gameStateRef.current;
    if (current.data.gameStatus !== 'playing') return;

    const player: Player = localPeer ?? { id: playerId, name: playerName, joinedAt: Date.now() };

    if (!ticTacToeGame.canAct(current.data, player.id)) return;

    const action: TicTacToeAction = { row, col };

    if (isInSession) {
      session.sendAction('tic-tac-toe', action);
    } else {
      applyAction(action, player);
    }
  };

  // ── New game ──────────────────────────────────────────────────────────────

  const handleNewGame = () => {
    const current = gameStateRef.current;
    const stats = buildInitialStats(current.data);
    const wasPlaying = current.data.gameStatus !== 'playing';

    const botPlayers = bots.slice(0, 1).map(b => ({ id: b.id, name: b.name, joinedAt: 0 as const }));
    const players: Player[] = isInSession && localPeer
      ? [localPeer, ...session.peers]
      : botPlayers.length > 0
        ? [{ id: playerId, name: playerName, joinedAt: Date.now() }, ...botPlayers]
        : [];

    const fresh = ticTacToeGame.initialState(players);
    const newData = { ...fresh, ...stats };

    setGameState({
      ...current,
      data: newData,
      score: 0,
      isComplete: false,
      lastModified: new Date().toISOString(),
    });

    // Broadcast fresh state so all guests start the same game with same role assignment
    if (isInSession && isHost) {
      session.broadcastSnapshot('tic-tac-toe', newData);
    }

    if (wasPlaying) awardGamePlay('tic-tac-toe', 1);
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const isWinningCell = (row: number, col: number) =>
    gameState.data.winningCombination?.positions.some(([r, c]) => r === row && c === col) ?? false;

  const getCellClass = (row: number, col: number): string => {
    const value = gameState.data.board[row][col];
    const playable = gameState.data.gameStatus === 'playing' && value === null;
    const classes = ['tic-tac-toe-cell'];
    if (playable) classes.push('playable');
    if (value === null) classes.push('empty'); else classes.push('filled');
    if (isWinningCell(row, col)) classes.push('winning-cell');
    if (value === 'X') classes.push('x-mark');
    if (value === 'O') classes.push('o-mark');
    return classes.join(' ');
  };

  const statusMessage = (): string => {
    const { gameStatus, currentPlayer, multiplayer } = gameState.data;
    if (gameStatus === 'X-wins') return '🎉 X Wins!';
    if (gameStatus === 'O-wins') return '🎉 O Wins!';
    if (gameStatus === 'tie') return "🤝 It's a Tie!";

    if (isInSession && multiplayer.isMultiplayer && localPeer) {
      const myTurn = ticTacToeGame.canAct(gameState.data, localPeer.id);
      return myTurn ? `Your turn (${currentPlayer})` : `Waiting for opponent (${currentPlayer})`;
    }

    return `${currentPlayer}'s Turn`;
  };

  if (isLoading) {
    return <div className="tic-tac-toe-loading"><h2>Loading Tic-Tac-Toe...</h2></div>;
  }

  return (
    <div className="tic-tac-toe-game">
      <div className="tic-tac-toe-header">
        <h2>{controller.config.name}</h2>
        <p>{controller.config.description}</p>
      </div>

      <div className="tic-tac-toe-status">
        <div className={`tic-tac-toe-status-message ${gameState.data.gameStatus === 'playing' ? 'playing' : 'winner'}`}>
          {statusMessage()}
        </div>
        <div className="tic-tac-toe-stats">
          <span>Games: {gameState.data.gamesPlayed}</span>
          <span>X: {gameState.data.xWins}</span>
          <span>O: {gameState.data.oWins}</span>
          <span>Ties: {gameState.data.ties}</span>
        </div>
      </div>

      <div className="tic-tac-toe-board-container">
        <div className="tic-tac-toe-board">
          {gameState.data.board.map((row, ri) =>
            row.map((_, ci) => (
              <button
                key={`${ri}-${ci}`}
                className={getCellClass(ri, ci)}
                onClick={() => handleCellClick(ri, ci)}
              >
                {gameState.data.board[ri][ci] ?? ''}
              </button>
            ))
          )}
        </div>
      </div>

      <div className="tic-tac-toe-controls">
        <button onClick={handleNewGame} className="tic-tac-toe-new-game-btn">
          New Game
        </button>
      </div>

      {/* Save management — only in solo mode */}
      {!isInSession && (
        <div className={`tic-tac-toe-save-section ${saveExpanded ? 'expanded' : 'collapsed'}`}>
          <div className="tic-tac-toe-save-header" onClick={() => setSaveExpanded(!saveExpanded)}>
            <h3>Save Management</h3>
            <span className={`tic-tac-toe-save-toggle ${saveExpanded ? 'expanded' : ''}`}>▼</span>
          </div>
          {saveExpanded && (
            <div className="tic-tac-toe-save-content">
              <div className="tic-tac-toe-autosave-toggle">
                <input type="checkbox" id="auto-save-toggle" checked={autoSaveEnabled} onChange={toggleAutoSave} />
                <label htmlFor="auto-save-toggle">Auto-save ({controller.config.autoSaveIntervalMs / 1000}s)</label>
              </div>
              <div className="tic-tac-toe-save-status">
                {hasSave ? '💾 Save available' : '❌ No save data'}
              </div>
              <div className="tic-tac-toe-save-buttons">
                <button onClick={() => saveGame()} className="tic-tac-toe-save-btn save">Save</button>
                <button onClick={() => loadGame()} disabled={!hasSave} className="tic-tac-toe-save-btn load">Load</button>
                <button onClick={() => dropSave()} disabled={!hasSave} className="tic-tac-toe-save-btn delete">Delete</button>
              </div>
              {lastSaveEvent && (
                <div style={{ fontSize: '0.85rem', color: lastSaveEvent.success ? 'var(--color-success, #4CAF50)' : 'var(--color-error, #f44336)' }}>
                  {lastSaveEvent.success ? '✅' : '❌'} {lastSaveEvent.action} · {new Date(lastSaveEvent.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TicTacToeGame;
