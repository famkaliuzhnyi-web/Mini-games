import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from 'react';
import { useSession } from '../../hooks/useSession';
import { useCoinService } from '../../hooks/useCoinService';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { GameButton } from '../../components/ui';
import type { TetrisGameState, TetrisAction, LocalState, PlayerBoard, PieceType } from './types';
import { tetrisGame } from './Tetris.game';
import {
  COLS,
  ROWS,
  PIECE_COLORS,
  emptyBoard,
  randomPieceType,
  getShape,
  spawnPiece,
  isValid,
  lockBoard,
  clearLines,
  ghostY,
  calcScore,
  fallSpeed,
} from './gameLogic';
import './Tetris.css';

interface TetrisProps {
  playerId: string;
  playerName: string;
}

// ── Mini board sub-component ──────────────────────────────────────────────────

interface MiniBoardProps {
  data: PlayerBoard;
  cellSize: number;
}

const MiniBoard: React.FC<MiniBoardProps> = ({ data, cellSize }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cs = Math.max(4, Math.round(cellSize * 0.5));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = COLS * cs;
    const H = ROWS * cs;
    canvas.width = W;
    canvas.height = H;

    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); ctx.stroke();
    }

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = data.board[r]?.[c];
        if (!cell) continue;
        ctx.fillStyle = PIECE_COLORS[cell];
        ctx.fillRect(c * cs + 1, r * cs + 1, cs - 2, cs - 2);
      }
    }
  }, [data.board, cs]);

  return (
    <div className="tetris-mini-board">
      <div className="tetris-mini-name">{data.playerName}</div>
      <canvas ref={canvasRef} />
      <div className="tetris-mini-score">{data.score}</div>
      {data.gameOver && (
        <div className="tetris-mini-dead">GAME OVER</div>
      )}
    </div>
  );
};

// ── Helper: draw a piece type in a small canvas (for Hold/Next) ───────────────

function drawPiecePreview(
  canvas: HTMLCanvasElement | null,
  type: PieceType | null,
  cs: number,
) {
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Use a 4×2 canvas for all piece types (I is 4 wide, others ≤3 wide)
  const PREVIEW_COLS = 4;
  const PREVIEW_ROWS = 2;
  const W = PREVIEW_COLS * cs;
  const H = PREVIEW_ROWS * cs;
  canvas.width = W;
  canvas.height = H;

  ctx.fillStyle = '#0a0b0d';
  ctx.fillRect(0, 0, W, H);

  if (!type) return;

  // Get the actual shape for rotation 0
  const pieceShape = getShape({ type, rotation: 0, x: 0, y: 0 });
  const color = PIECE_COLORS[type];

  // Find bounding box of filled cells
  let minRow = pieceShape.length, maxRow = -1, minCol = pieceShape[0].length, maxCol = -1;
  for (let r = 0; r < pieceShape.length; r++) {
    for (let c = 0; c < pieceShape[r].length; c++) {
      if (pieceShape[r][c]) {
        minRow = Math.min(minRow, r);
        maxRow = Math.max(maxRow, r);
        minCol = Math.min(minCol, c);
        maxCol = Math.max(maxCol, c);
      }
    }
  }

  if (maxRow < 0) return; // no cells

  const pieceW = (maxCol - minCol + 1) * cs;
  const pieceH = (maxRow - minRow + 1) * cs;
  const offsetX = Math.floor((W - pieceW) / 2);
  const offsetY = Math.floor((H - pieceH) / 2);

  ctx.fillStyle = color;
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (pieceShape[r][c]) {
        const px = offsetX + (c - minCol) * cs;
        const py = offsetY + (r - minRow) * cs;
        ctx.fillRect(px + 1, py + 1, cs - 2, cs - 2);
      }
    }
  }
}

// ── Main component ────────────────────────────────────────────────────────────

export const TetrisGame: React.FC<TetrisProps> = ({ playerId, playerName }) => {
  const session = useSession();
  const { awardGamePlay } = useCoinService();

  const isInSession = session.isInSession;
  const isHost = !isInSession || session.role === 'host';

  // Stable localPlayer ref to avoid needless re-renders
  const localPlayerRef = useRef({ id: playerId, name: playerName, joinedAt: Date.now() });
  const localPlayer = localPlayerRef.current;

  // ── Shared game state (IGame) — host-authoritative ────────────────────
  const [displayState, setDisplayState] = useState<TetrisGameState>(() =>
    tetrisGame.initialState([localPlayer]),
  );
  const gameStateRef = useRef<TetrisGameState>(displayState);

  // ── Local Tetris board — runs independently, low latency ──────────────
  const [localDisplay, setLocalDisplay] = useState<LocalState | null>(null);
  const localRef = useRef<LocalState | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holdCanvasRef = useRef<HTMLCanvasElement>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement>(null);
  const boardWrapRef = useRef<HTMLDivElement>(null);

  const [cellSize, setCellSize] = useState(24);
  const awardedRef = useRef(false);

  // Track whether we've started the local game for the current gameCount
  const startedGameCountRef = useRef(-1);

  // ── Responsive sizing ──────────────────────────────────────────────────

  useEffect(() => {
    const update = () => {
      const el = boardWrapRef.current;
      if (!el) return;
      const cs = Math.min(
        Math.max(12, Math.floor(el.clientWidth / COLS)),
        Math.max(12, Math.floor(el.clientHeight / ROWS)),
        32,
      );
      setCellSize(cs);
    };
    update();
    const ro = new ResizeObserver(update);
    if (boardWrapRef.current) ro.observe(boardWrapRef.current);
    return () => ro.disconnect();
  }, []);

  // ── Host: apply action + broadcast ────────────────────────────────────

  const applyAndBroadcast = useCallback(
    (action: TetrisAction, from: typeof localPlayer) => {
      const next = tetrisGame.reduce(gameStateRef.current, action, from);
      if (!next) return;
      gameStateRef.current = next;
      setDisplayState(next);
      if (isInSession) session.broadcastSnapshot('tetris', next);
    },
    [isInSession, session],
  );

  // ── Send board update to shared state ─────────────────────────────────

  const sendBoardUpdate = useCallback(
    (board: import('./types').Board, score: number, level: number, lines: number) => {
      const action: TetrisAction = { type: 'board-update', board, score, level, lines };
      if (isHost) {
        applyAndBroadcast(action, localPlayer);
      } else {
        session.sendAction('tetris', action);
      }
    },
    [isHost, applyAndBroadcast, session, localPlayer],
  );

  const sendBoardGameOver = useCallback(
    (score: number, board: import('./types').Board) => {
      const action: TetrisAction = { type: 'board-game-over', score, board };
      if (isHost) {
        applyAndBroadcast(action, localPlayer);
      } else {
        session.sendAction('tetris', action);
      }
    },
    [isHost, applyAndBroadcast, session, localPlayer],
  );

  // ── Tick / gravity ─────────────────────────────────────────────────────

  const stopTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }, []);

  // Forward-declare startTick so tick can reference it
  const startTickRef = useRef<(level?: number) => void>(() => {});

  const tick = useCallback(() => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing') return;
    if (gameStateRef.current.status === 'finished') {
      stopTick();
      return;
    }

    const moved = { ...cur.piece, y: cur.piece.y + 1 };
    if (isValid(cur.board, moved)) {
      const next = { ...cur, piece: moved };
      localRef.current = next;
      setLocalDisplay(next);
      return;
    }

    // Lock piece
    const locked = lockBoard(cur.board, cur.piece);
    const { board: cleared, count } = clearLines(locked);
    const newLines = cur.lines + count;
    const newLevel = Math.floor(newLines / 10);
    const addedScore = calcScore(count, newLevel);
    const newScore = cur.score + addedScore;
    const nextType = cur.next;
    const newPiece = spawnPiece(nextType);
    const isOver = !isValid(cleared, newPiece);

    const newLocal: LocalState = {
      board: cleared,
      piece: newPiece,
      next: randomPieceType(),
      hold: cur.hold,
      canHold: true,
      score: newScore,
      level: newLevel,
      lines: newLines,
      status: isOver ? 'game-over' : 'playing',
    };
    localRef.current = newLocal;
    setLocalDisplay(newLocal);

    if (isOver) {
      stopTick();
      sendBoardGameOver(newScore, cleared);
    } else {
      sendBoardUpdate(cleared, newScore, newLevel, newLines);
      // Restart tick with updated speed (level may have changed)
      startTickRef.current(newLevel);
    }
  }, [stopTick, sendBoardGameOver, sendBoardUpdate]);

  const startTick = useCallback(
    (level = 0) => {
      stopTick();
      tickRef.current = setInterval(tick, fallSpeed(level));
    },
    [stopTick, tick],
  );

  // Keep the ref up to date so the tick closure can call the latest startTick
  useEffect(() => {
    startTickRef.current = startTick;
  }, [startTick]);

  // ── Init local board ───────────────────────────────────────────────────

  const initLocalGame = useCallback(() => {
    awardedRef.current = false;
    const firstType = randomPieceType();
    const newPiece = spawnPiece(firstType);
    const initial: LocalState = {
      board: emptyBoard(),
      piece: newPiece,
      next: randomPieceType(),
      hold: null,
      canHold: true,
      score: 0,
      level: 0,
      lines: 0,
      status: 'playing',
    };
    localRef.current = initial;
    setLocalDisplay(initial);
    startTick(0);
  }, [startTick]);

  // ── Handle start (host only) ───────────────────────────────────────────

  const handleStart = useCallback(() => {
    const allPlayers = isInSession ? [localPlayer, ...session.peers] : [localPlayer];
    const playerOrder = allPlayers.map(p => p.id);
    const playerNames = Object.fromEntries(allPlayers.map(p => [p.id, p.name]));

    stopTick();
    applyAndBroadcast({ type: 'start', playerOrder, playerNames }, localPlayer);

    // Init local game immediately for host
    const firstType = randomPieceType();
    const newPiece = spawnPiece(firstType);
    const initial: LocalState = {
      board: emptyBoard(),
      piece: newPiece,
      next: randomPieceType(),
      hold: null,
      canHold: true,
      score: 0,
      level: 0,
      lines: 0,
      status: 'playing',
    };
    localRef.current = initial;
    setLocalDisplay(initial);
    awardedRef.current = false;
    startTick(0);
    // Mark this game as started
    // We'll read gameCount from the next state, but to avoid missing it we mark it right after
    // (gameCount increments after applyAndBroadcast)
    const nextState = gameStateRef.current;
    startedGameCountRef.current = nextState.gameCount;
  }, [isInSession, session.peers, localPlayer, stopTick, applyAndBroadcast, startTick]);

  // ── Guest: start local game when shared state transitions to 'playing' ─

  useEffect(() => {
    const state = displayState;
    if (state.status === 'playing') {
      // Only start if this gameCount hasn't been started yet
      if (startedGameCountRef.current !== state.gameCount) {
        startedGameCountRef.current = state.gameCount;
        // Don't start local game for host here (host starts in handleStart)
        if (!isHost) {
          stopTick();
          initLocalGame();
        }
      }
    }
    if (state.status === 'finished') {
      stopTick();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayState.status, displayState.gameCount]);

  // ── Award coins on game finish ─────────────────────────────────────────

  useEffect(() => {
    if (displayState.status === 'finished' && !awardedRef.current) {
      awardedRef.current = true;
      const myScore = displayState.scores[localPlayer.id] ?? 0;
      const isWinner = displayState.winnerId === localPlayer.id;
      awardGamePlay('tetris', isWinner ? myScore * 3 : Math.max(10, myScore));
    }
  }, [displayState.status, displayState.winnerId, displayState.scores, localPlayer.id, awardGamePlay]);

  // ── Cleanup on unmount ─────────────────────────────────────────────────

  useEffect(() => () => stopTick(), [stopTick]);

  // ── Multiplayer wiring ─────────────────────────────────────────────────

  useEffect(() => {
    if (!isInSession) return;

    if (isHost) {
      const u1 = session.manager.on('game-action', ({ gameId, action, from }) => {
        if (gameId !== 'tetris') return;
        const fromPlayer = session.peers.find(p => p.id === from.id) ?? from;
        applyAndBroadcast(action as TetrisAction, fromPlayer);
      });
      const u2 = session.manager.on('game-snapshot-requested', ({ gameId, fromPeerId }) => {
        if (gameId !== 'tetris') return;
        session.sendSnapshot('tetris', gameStateRef.current, fromPeerId);
      });
      return () => { u1(); u2(); };
    } else {
      const unsub = session.manager.on('game-snapshot', ({ gameId, state: newState }) => {
        if (gameId !== 'tetris') return;
        try {
          const s = tetrisGame.validateSnapshot(newState);
          gameStateRef.current = s;
          setDisplayState(s);
        } catch {
          // ignore invalid snapshots
        }
      });
      return unsub;
    }
  }, [isInSession, isHost, session, applyAndBroadcast]);

  // Guest: request snapshot on mount
  useEffect(() => {
    if (isInSession && !isHost) session.requestSnapshot('tetris');
  }, [isInSession, isHost, session]);

  // ── Move functions ─────────────────────────────────────────────────────

  const movePiece = useCallback((dx: number) => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing') return;
    if (gameStateRef.current.status === 'finished') return;
    const moved = { ...cur.piece, x: cur.piece.x + dx };
    if (!isValid(cur.board, moved)) return;
    const next = { ...cur, piece: moved };
    localRef.current = next;
    setLocalDisplay(next);
  }, []);

  const rotatePiece = useCallback(() => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing') return;
    if (gameStateRef.current.status === 'finished') return;
    const rotated = {
      ...cur.piece,
      rotation: ((cur.piece.rotation + 1) % 4) as 0 | 1 | 2 | 3,
    };
    // Wall kicks: try offsets [0, -1, +1, -2, +2]
    const kicks = [0, -1, 1, -2, 2];
    for (const dx of kicks) {
      const test = { ...rotated, x: rotated.x + dx };
      if (isValid(cur.board, test)) {
        const next = { ...cur, piece: test };
        localRef.current = next;
        setLocalDisplay(next);
        return;
      }
    }
  }, []);

  const softDrop = useCallback(() => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing') return;
    if (gameStateRef.current.status === 'finished') return;
    const moved = { ...cur.piece, y: cur.piece.y + 1 };
    if (isValid(cur.board, moved)) {
      const next = { ...cur, piece: moved };
      localRef.current = next;
      setLocalDisplay(next);
    }
  }, []);

  const hardDropPiece = useCallback(() => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing') return;
    if (gameStateRef.current.status === 'finished') return;

    const gy = ghostY(cur.board, cur.piece);
    const dropDistance = gy - cur.piece.y;
    const dropped = { ...cur.piece, y: gy };

    const locked = lockBoard(cur.board, dropped);
    const { board: cleared, count } = clearLines(locked);
    const newLines = cur.lines + count;
    const newLevel = Math.floor(newLines / 10);
    const addedScore = calcScore(count, newLevel) + dropDistance * 2;
    const newScore = cur.score + addedScore;
    const nextType = cur.next;
    const newPiece = spawnPiece(nextType);
    const isOver = !isValid(cleared, newPiece);

    const newLocal: LocalState = {
      board: cleared,
      piece: newPiece,
      next: randomPieceType(),
      hold: cur.hold,
      canHold: true,
      score: newScore,
      level: newLevel,
      lines: newLines,
      status: isOver ? 'game-over' : 'playing',
    };
    localRef.current = newLocal;
    setLocalDisplay(newLocal);

    if (isOver) {
      stopTick();
      sendBoardGameOver(newScore, cleared);
    } else {
      sendBoardUpdate(cleared, newScore, newLevel, newLines);
      startTick(newLevel);
    }
  }, [stopTick, sendBoardGameOver, sendBoardUpdate, startTick]);

  const holdPiece = useCallback(() => {
    const cur = localRef.current;
    if (!cur || cur.status !== 'playing' || !cur.canHold) return;
    if (gameStateRef.current.status === 'finished') return;

    const incomingType: PieceType = cur.hold ?? cur.next;
    const newHold: PieceType = cur.piece.type;
    const newNext: PieceType = cur.hold ? cur.next : randomPieceType();
    const newPiece = spawnPiece(incomingType);

    if (!isValid(cur.board, newPiece)) return;

    const next: LocalState = {
      ...cur,
      piece: newPiece,
      hold: newHold,
      next: newNext,
      canHold: false,
    };
    localRef.current = next;
    setLocalDisplay(next);
  }, []);

  // ── Keyboard input ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (localRef.current?.status !== 'playing') return;
      if (gameStateRef.current.status === 'finished') return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          movePiece(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          movePiece(1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          softDrop();
          break;
        case 'ArrowUp':
        case 'z':
        case 'Z':
          e.preventDefault();
          rotatePiece();
          break;
        case ' ':
          if (!e.repeat) {
            e.preventDefault();
            hardDropPiece();
          }
          break;
        case 'c':
        case 'C':
          e.preventDefault();
          holdPiece();
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [movePiece, rotatePiece, softDrop, hardDropPiece, holdPiece]);

  // ── Swipe gestures on board ────────────────────────────────────────────

  useSwipeGestures(boardWrapRef, {
    onSwipeLeft: () => movePiece(-1),
    onSwipeRight: () => movePiece(1),
    onSwipeUp: () => rotatePiece(),
    onSwipeDown: () => hardDropPiece(),
    minSwipeDistance: 20,
    preventDefault: true,
  });

  // ── Canvas: main board ─────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cs = cellSize;
    const W = COLS * cs;
    const H = ROWS * cs;
    canvas.width = W;
    canvas.height = H;

    // Background
    ctx.fillStyle = '#0a0b0d';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= COLS; x++) {
      ctx.beginPath(); ctx.moveTo(x * cs, 0); ctx.lineTo(x * cs, H); ctx.stroke();
    }
    for (let y = 0; y <= ROWS; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * cs); ctx.lineTo(W, y * cs); ctx.stroke();
    }

    if (!localDisplay) return;

    const { board, piece } = localDisplay;

    // Helper: draw a cell
    const drawCell = (col: number, row: number, color: string, alpha: number) => {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      const pad = 1;
      ctx.fillRect(col * cs + pad, row * cs + pad, cs - pad * 2, cs - pad * 2);
      ctx.globalAlpha = 1;
    };

    // Locked cells
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = board[r][c];
        if (cell) drawCell(c, r, PIECE_COLORS[cell], 1);
      }
    }

    // Ghost piece
    const gy = ghostY(board, piece);
    const ghostShape = getShape(piece);
    const ghostColor = PIECE_COLORS[piece.type];
    for (let row = 0; row < ghostShape.length; row++) {
      for (let col = 0; col < ghostShape[row].length; col++) {
        if (!ghostShape[row][col]) continue;
        const br = piece.y !== gy ? gy + row : -999; // don't draw ghost if same as piece
        const bc = piece.x + col;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS && piece.y !== gy) {
          drawCell(bc, br, ghostColor, 0.2);
        }
      }
    }

    // Current piece
    const shape = getShape(piece);
    const color = PIECE_COLORS[piece.type];
    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (!shape[row][col]) continue;
        const br = piece.y + row;
        const bc = piece.x + col;
        if (br >= 0 && br < ROWS && bc >= 0 && bc < COLS) {
          drawCell(bc, br, color, 1);
        }
      }
    }
  }, [localDisplay, cellSize]);

  // ── Canvas: hold piece ─────────────────────────────────────────────────

  useEffect(() => {
    const cs = Math.max(10, Math.round(cellSize * 0.75));
    drawPiecePreview(holdCanvasRef.current, localDisplay?.hold ?? null, cs);
  }, [localDisplay?.hold, cellSize]);

  // ── Canvas: next piece ─────────────────────────────────────────────────

  useEffect(() => {
    const cs = Math.max(10, Math.round(cellSize * 0.75));
    drawPiecePreview(nextCanvasRef.current, localDisplay?.next ?? null, cs);
  }, [localDisplay?.next, cellSize]);

  // ── Derived values ─────────────────────────────────────────────────────

  const allPlayers = useMemo(
    () => (isInSession ? [localPlayer, ...session.peers] : [localPlayer]),
    [isInSession, localPlayer, session.peers],
  );

  const otherPlayers = useMemo(
    () =>
      displayState.playerOrder
        .filter(id => id !== localPlayer.id)
        .map(id => displayState.boards[id])
        .filter(Boolean) as import('./types').PlayerBoard[],
    [displayState.boards, displayState.playerOrder, localPlayer.id],
  );

  // Progress toward target (for display)
  const myScore = localDisplay?.score ?? displayState.scores[localPlayer.id] ?? 0;
  const progressPct = Math.min(100, (myScore / displayState.targetScore) * 100);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="tetris-game">
      <div className="tetris-main">
        {/* Left sidebar: Hold + Stats */}
        <div className="tetris-sidebar tetris-sidebar--left">
          <div className="tetris-hold-box">
            <div className="tetris-label">HOLD</div>
            <canvas ref={holdCanvasRef} />
          </div>
          <div className="tetris-stats">
            <div className="tetris-stat-label">SCORE</div>
            <div className="tetris-stat-value">{localDisplay?.score ?? 0}</div>
            <div className="tetris-stat-label">LEVEL</div>
            <div className="tetris-stat-value">{localDisplay?.level ?? 0}</div>
            <div className="tetris-stat-label">LINES</div>
            <div className="tetris-stat-value">{localDisplay?.lines ?? 0}</div>
            <div className="tetris-stat-label">TARGET</div>
            <div className="tetris-stat-value">{displayState.targetScore}</div>
          </div>
          {/* Progress bar */}
          {displayState.status === 'playing' && (
            <div className="tetris-progress-wrap">
              <div
                className="tetris-progress-bar"
                style={{ height: `${progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Center: main board */}
        <div className="tetris-board-wrap" ref={boardWrapRef}>
          <canvas ref={canvasRef} className="tetris-canvas" />

          {/* Waiting overlay (host) */}
          {displayState.status === 'waiting' && isHost && (
            <div className="tetris-overlay">
              <div className="tetris-overlay-box">
                <h2>Tetris</h2>
                <p>Race to {displayState.targetScore} points</p>
                <GameButton className="tetris-action-btn" onClick={handleStart}>
                  {isInSession ? `Start · ${allPlayers.length} player${allPlayers.length !== 1 ? 's' : ''}` : 'Play Solo'}
                </GameButton>
              </div>
            </div>
          )}

          {/* Waiting overlay (guest) */}
          {displayState.status === 'waiting' && !isHost && (
            <div className="tetris-overlay">
              <div className="tetris-overlay-box">
                <h2>Tetris</h2>
                <p>Waiting for host…</p>
              </div>
            </div>
          )}

          {/* Finished overlay */}
          {displayState.status === 'finished' && (
            <div className="tetris-overlay">
              <div className="tetris-overlay-box">
                <h2>
                  {displayState.winnerId === localPlayer.id ? 'You Win!' : 'Game Over'}
                </h2>
                {displayState.winnerId && displayState.boards[displayState.winnerId] && (
                  <p>{displayState.boards[displayState.winnerId].playerName} wins!</p>
                )}
                <p className="tetris-final-score">Your score: {myScore}</p>
                {isHost ? (
                  <GameButton className="tetris-action-btn" onClick={handleStart}>
                    Play Again
                  </GameButton>
                ) : (
                  <p className="tetris-waiting-msg">Waiting for host to restart…</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: Next + other players */}
        <div className="tetris-sidebar tetris-sidebar--right">
          <div className="tetris-next-box">
            <div className="tetris-label">NEXT</div>
            <canvas ref={nextCanvasRef} />
          </div>
          {otherPlayers.map(p => (
            <MiniBoard key={p.playerId} data={p} cellSize={cellSize} />
          ))}
        </div>
      </div>

      {/* Mobile controls */}
      <div className="tetris-controls">
        <div className="tetris-controls-row">
          <GameButton className="tetris-ctrl-btn" onClick={() => movePiece(-1)}>←</GameButton>
          <GameButton className="tetris-ctrl-btn" onClick={rotatePiece}>↻</GameButton>
          <GameButton className="tetris-ctrl-btn" onClick={() => movePiece(1)}>→</GameButton>
        </div>
        <div className="tetris-controls-row">
          <GameButton className="tetris-ctrl-btn" onClick={holdPiece}>HOLD</GameButton>
          <GameButton className="tetris-ctrl-btn tetris-ctrl-btn--drop" onClick={hardDropPiece}>▼</GameButton>
        </div>
      </div>
    </div>
  );
};

export default TetrisGame;
