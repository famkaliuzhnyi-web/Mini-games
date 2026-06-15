import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from '../../hooks/useSession';
import { useCoinService } from '../../hooks/useCoinService';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import type { SnakeGameState, SnakeAction, Direction } from './types';
import { snakeGame } from './Snake.game';
import {
  GRID_W, GRID_H, FOOD_COUNT, TICK_MS, DEAD_FADE_TICKS,
  pickRandomPositions, generateSnakeStarts, darken,
} from './gameLogic';
import './Snake.css';

interface SnakeProps {
  playerId: string;
  playerName: string;
}

function getWinnerId(state: SnakeGameState): string | null {
  if (state.status !== 'game-over') return null;
  const alive = Object.values(state.snakes).filter(s => s.alive);
  if (alive.length === 1) return alive[0].playerId;
  // All dead — highest score wins
  const entries = Object.entries(state.scores);
  if (entries.length === 0) return null;
  return entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export const SnakeGame: React.FC<SnakeProps> = ({ playerId, playerName }) => {
  const session = useSession();
  const { awardGamePlay } = useCoinService();

  const isInSession = session.isInSession;
  const isHost = !isInSession || session.role === 'host';
  const localPlayer = session.localPlayer ?? { id: playerId, name: playerName, joinedAt: Date.now() };

  const [displayState, setDisplayState] = useState<SnakeGameState>(() =>
    snakeGame.initialState([localPlayer]),
  );

  // Authoritative state ref — host game-loop reads this to avoid stale closures
  const gameStateRef = useRef<SnakeGameState>(displayState);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(18);
  const awardedRef = useRef(false);

  // ── Responsive canvas sizing ───────────────────────────────────────────

  useEffect(() => {
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      const cs = Math.max(8, Math.floor(Math.min(
        el.clientWidth  / GRID_W,
        el.clientHeight / GRID_H,
      )));
      setCellSize(cs);
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Host: apply action locally + broadcast ─────────────────────────────

  const applyAndBroadcast = useCallback((action: SnakeAction, from: typeof localPlayer) => {
    const next = snakeGame.reduce(gameStateRef.current, action, from);
    if (!next) return;
    gameStateRef.current = next;
    setDisplayState(next);
    if (isInSession) session.broadcastSnapshot('snake', next);
  }, [isInSession, session]);

  // ── Host: start tick loop ──────────────────────────────────────────────

  const startTick = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      const cur = gameStateRef.current;
      if (cur.status !== 'playing') {
        clearInterval(tickRef.current!);
        tickRef.current = null;
        return;
      }
      const newFood = pickRandomPositions(FOOD_COUNT, cur.snakes, cur.food, cur.width, cur.height);
      const next = snakeGame.reduce(cur, { type: 'tick', newFood }, localPlayer);
      if (!next) return;
      gameStateRef.current = next;
      setDisplayState(next);
      if (isInSession) session.broadcastSnapshot('snake', next);
    }, TICK_MS);
  }, [isInSession, session, localPlayer]);

  // ── Start / new game ───────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    const allPlayers = isInSession
      ? [localPlayer, ...session.peers]
      : [localPlayer];

    const snakeStarts = generateSnakeStarts(allPlayers, GRID_W, GRID_H);
    const food = pickRandomPositions(FOOD_COUNT, {}, [], GRID_W, GRID_H);
    applyAndBroadcast({ type: 'start', snakeStarts, food }, localPlayer);
    startTick();
  }, [isInSession, session.peers, localPlayer, applyAndBroadcast, startTick]);

  // ── Direction input ────────────────────────────────────────────────────

  const changeDirection = useCallback((dir: Direction) => {
    const state = gameStateRef.current;
    if (state.status !== 'playing') return;
    // Make sure this player has a snake in the game
    if (!state.snakes[localPlayer.id]) return;
    const action: SnakeAction = { type: 'change-direction', direction: dir };
    if (isHost) {
      applyAndBroadcast(action, localPlayer);
    } else {
      session.sendAction('snake', action);
    }
  }, [isHost, localPlayer, applyAndBroadcast, session]);

  // Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
        w: 'up', s: 'down', a: 'left', d: 'right',
        W: 'up', S: 'down', A: 'left', D: 'right',
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); changeDirection(dir); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [changeDirection]);

  // Swipe — exclude overlay so its buttons still receive click events on mobile
  useSwipeGestures(containerRef, {
    onSwipeUp:    () => changeDirection('up'),
    onSwipeDown:  () => changeDirection('down'),
    onSwipeLeft:  () => changeDirection('left'),
    onSwipeRight: () => changeDirection('right'),
    minSwipeDistance: 25,
    preventDefault: true,
    excludeSelector: '.snake-overlay',
  });

  // ── Multiplayer wiring ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isInSession) return;

    if (isHost) {
      // Receive direction changes from guests
      const u1 = session.manager.on('game-action', ({ gameId, action, from }) => {
        if (gameId !== 'snake') return;
        // Apply direction change silently (no broadcast — next tick will carry it)
        const fromPlayer = session.peers.find(p => p.id === from.id) ?? from;
        const next = snakeGame.reduce(gameStateRef.current, action as SnakeAction, fromPlayer);
        if (!next) return;
        gameStateRef.current = next;
        setDisplayState(next);
      });
      // Send snapshot to late joiners
      const u2 = session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
        if (gameId !== 'snake') return;
        session.sendSnapshot('snake', gameStateRef.current, fromPeerId);
      });
      return () => { u1(); u2(); };
    } else {
      // Guest: receive full state snapshots from host
      const unsub = session.manager.on('game-snapshot', ({ gameId, state: newState }) => {
        if (gameId !== 'snake') return;
        try {
          const s = snakeGame.validateSnapshot(newState);
          gameStateRef.current = s;
          setDisplayState(s);
        } catch {}
      });
      return unsub;
    }
  }, [isInSession, isHost, session]);

  // Guest: request snapshot when first joining
  useEffect(() => {
    if (isInSession && !isHost) session.requestSnapshot('snake');
  }, [isInSession, isHost, session]);

  // ── Coins on game-over ─────────────────────────────────────────────────

  useEffect(() => {
    if (displayState.status === 'game-over' && !awardedRef.current) {
      awardedRef.current = true;
      const score = displayState.scores[playerId] ?? 0;
      awardGamePlay('snake', 5 + score * 3);
    }
    if (displayState.status !== 'game-over') awardedRef.current = false;
  }, [displayState.status, displayState.scores, playerId, awardGamePlay]);

  // ── Cleanup ────────────────────────────────────────────────────────────

  useEffect(() => () => { if (tickRef.current) clearInterval(tickRef.current); }, []);

  // ── Canvas draw ────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { snakes, food, width, height, tick } = displayState;
    const cs = cellSize;
    const W = width * cs;
    const H = height * cs;
    canvas.width  = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= width; x++) {
      ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); ctx.stroke();
    }

    // Food — pulsing gold dots with glow
    const pulse = 0.75 + Math.sin(tick * 0.18) * 0.25;
    for (const f of food) {
      const cx = f.x * cs + cs / 2;
      const cy = f.y * cs + cs / 2;
      const r  = (cs / 2 - 2) * pulse;
      // Glow
      const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2);
      grd.addColorStop(0, 'rgba(255,204,0,0.5)');
      grd.addColorStop(1, 'rgba(255,204,0,0)');
      ctx.beginPath();
      ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
      // Core
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffcc00';
      ctx.fill();
    }

    // Snakes
    const r = Math.max(1, cs / 5);
    for (const snake of Object.values(snakes)) {
      const alpha = snake.alive
        ? 1
        : Math.max(0, 1 - (tick - (snake.deadTick ?? tick)) / DEAD_FADE_TICKS);
      if (alpha <= 0) continue;
      ctx.globalAlpha = alpha;

      for (let i = snake.segments.length - 1; i >= 0; i--) {
        const seg = snake.segments[i];
        const isHead = i === 0;
        const pad = isHead ? 1 : 2;
        const x = seg.x * cs + pad;
        const y = seg.y * cs + pad;
        const w = cs - pad * 2;
        const h = cs - pad * 2;

        ctx.fillStyle = isHead && snake.alive
          ? snake.color
          : snake.alive
            ? darken(snake.color, 0.55)
            : '#3a3a3a';

        roundRect(ctx, x, y, w, h, r);
        ctx.fill();
      }

      // Eyes on the head
      if (snake.alive && snake.segments.length > 0) {
        const head = snake.segments[0];
        const cx = head.x * cs + cs / 2;
        const cy = head.y * cs + cs / 2;
        const eyeR  = Math.max(1, cs / 7);
        const eyeOff = cs / 3.5;
        let pairs: [number, number][];
        switch (snake.direction) {
          case 'right': pairs = [[cx + eyeOff, cy - eyeOff / 1.5], [cx + eyeOff, cy + eyeOff / 1.5]]; break;
          case 'left':  pairs = [[cx - eyeOff, cy - eyeOff / 1.5], [cx - eyeOff, cy + eyeOff / 1.5]]; break;
          case 'up':    pairs = [[cx - eyeOff / 1.5, cy - eyeOff], [cx + eyeOff / 1.5, cy - eyeOff]]; break;
          case 'down':  pairs = [[cx - eyeOff / 1.5, cy + eyeOff], [cx + eyeOff / 1.5, cy + eyeOff]]; break;
        }
        ctx.fillStyle = '#000';
        for (const [ex, ey] of pairs) {
          ctx.beginPath(); ctx.arc(ex, ey, eyeR, 0, Math.PI * 2); ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    }
  }, [displayState, cellSize]);

  // ── Render ─────────────────────────────────────────────────────────────

  const { status, snakes, scores } = displayState;
  const allPlayers = isInSession ? [localPlayer, ...session.peers] : [localPlayer];
  const winnerId = getWinnerId(displayState);

  return (
    <div className="snake-game">
      {/* Score bar — shown during game */}
      {status === 'playing' && Object.keys(snakes).length > 0 && (
        <div className="snake-scorebar">
          {Object.values(snakes).map(s => (
            <div key={s.playerId} className={`snake-score-item${s.alive ? '' : ' dead'}`}>
              <span className="snake-dot" style={{ background: s.color }} />
              <span className="snake-score-name">{s.playerName}</span>
              <span className="snake-score-pts">{scores[s.playerId] ?? 0}</span>
            </div>
          ))}
        </div>
      )}

      {/* Board */}
      <div className="snake-board-wrap" ref={containerRef}>
        <canvas ref={canvasRef} className="snake-canvas" />

        {/* Waiting overlay */}
        {status === 'waiting' && (
          <div className="snake-overlay">
            <div className="snake-overlay-box">
              <h2 className="snake-overlay-title">Snake</h2>
              {isInSession && (
                <div className="snake-waiting-list">
                  {allPlayers.map((p) => (
                    <div key={p.id} className="snake-waiting-player">
                      <span className="snake-dot" style={{ background: snakes[p.id]?.color ?? '#888' }} />
                      {p.name}{p.id === localPlayer.id ? ' (you)' : ''}
                    </div>
                  ))}
                </div>
              )}
              {isHost ? (
                <button className="snake-action-btn" onClick={handleStart}>
                  {isInSession
                    ? `Start Game · ${allPlayers.length} player${allPlayers.length !== 1 ? 's' : ''}`
                    : 'Play Solo'}
                </button>
              ) : (
                <p className="snake-waiting-msg">Waiting for host to start…</p>
              )}
            </div>
          </div>
        )}

        {/* Game-over overlay */}
        {status === 'game-over' && (
          <div className="snake-overlay">
            <div className="snake-overlay-box">
              <h2 className="snake-overlay-title">Game Over</h2>
              {winnerId && snakes[winnerId] && (
                <p className="snake-winner-text" style={{ color: snakes[winnerId].color }}>
                  {snakes[winnerId].playerName} wins!
                </p>
              )}
              <div className="snake-final-scores">
                {Object.values(snakes)
                  .sort((a, b) => (scores[b.playerId] ?? 0) - (scores[a.playerId] ?? 0))
                  .map(s => (
                    <div key={s.playerId} className="snake-final-row">
                      <span className="snake-dot" style={{ background: s.color }} />
                      <span className="snake-final-name">{s.playerName}</span>
                      <span className="snake-final-pts">{scores[s.playerId] ?? 0} pts</span>
                    </div>
                  ))}
              </div>
              {isHost ? (
                <button className="snake-action-btn" onClick={handleStart}>
                  Play Again
                </button>
              ) : (
                <p className="snake-waiting-msg">Waiting for host to restart…</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile D-pad */}
      <div className="snake-dpad" aria-label="Direction controls">
        <div className="snake-dpad-row">
          <button className="snake-dpad-btn" onPointerDown={() => changeDirection('up')}>↑</button>
        </div>
        <div className="snake-dpad-row">
          <button className="snake-dpad-btn" onPointerDown={() => changeDirection('left')}>←</button>
          <span className="snake-dpad-mid" />
          <button className="snake-dpad-btn" onPointerDown={() => changeDirection('right')}>→</button>
        </div>
        <div className="snake-dpad-row">
          <button className="snake-dpad-btn" onPointerDown={() => changeDirection('down')}>↓</button>
        </div>
      </div>

      <p className="snake-hint">Arrow keys · WASD · Swipe</p>
    </div>
  );
};

export default SnakeGame;
