import type { IGame } from '../_contract/IGame';
import type { Player } from '../../core';
import type { SnakeGameState, SnakeAction, PlayerSnake, SnakeStart } from './types';
import { GRID_W, GRID_H, advance, posEq, isWall, canTurn } from './gameLogic';

export class SnakeGame implements IGame<SnakeGameState, SnakeAction> {
  readonly id = 'snake';

  initialState(_players: Player[]): SnakeGameState {
    return {
      snakes: {},
      food: [],
      width: GRID_W,
      height: GRID_H,
      status: 'waiting',
      scores: {},
      tick: 0,
    };
  }

  reduce(state: SnakeGameState, action: SnakeAction, from: Player): SnakeGameState | null {
    switch (action.type) {
      case 'start':
      case 'new-game':
        return this.applyStart(state, action.snakeStarts, action.food);
      case 'change-direction':
        return this.applyDirection(state, action.direction, from.id);
      case 'tick':
        return this.applyTick(state, action.newFood);
    }
  }

  canAct(_state: SnakeGameState, _playerId: string): boolean {
    return true;
  }

  validateSnapshot(raw: unknown): SnakeGameState {
    const s = raw as SnakeGameState;
    if (!s || typeof s !== 'object' || !('snakes' in s) || !('status' in s)) {
      throw new Error('Invalid snake snapshot');
    }
    return s;
  }

  // ── Private handlers ────────────────────────────────────────────────────

  private applyStart(
    state: SnakeGameState,
    snakeStarts: Record<string, SnakeStart>,
    food: { x: number; y: number }[],
  ): SnakeGameState {
    const snakes: Record<string, PlayerSnake> = {};
    const scores: Record<string, number> = {};
    for (const [id, start] of Object.entries(snakeStarts)) {
      snakes[id] = {
        playerId: id,
        playerName: start.playerName,
        color: start.color,
        segments: start.segments,
        direction: start.direction,
        nextDirection: start.direction,
        alive: true,
        deadTick: null,
      };
      scores[id] = 0;
    }
    return { ...state, snakes, food, scores, status: 'playing', tick: 0 };
  }

  private applyDirection(state: SnakeGameState, direction: string, playerId: string): SnakeGameState | null {
    const snake = state.snakes[playerId];
    if (!snake || !snake.alive || state.status !== 'playing') return null;
    if (!canTurn(snake.direction, direction as any)) return state;
    return {
      ...state,
      snakes: {
        ...state.snakes,
        [playerId]: { ...snake, nextDirection: direction as any },
      },
    };
  }

  private applyTick(state: SnakeGameState, newFood: { x: number; y: number }[]): SnakeGameState {
    if (state.status !== 'playing') return state;

    const { snakes, food, width, height } = state;
    const aliveIds = Object.keys(snakes).filter(id => snakes[id].alive);

    // ── 1. Compute new head positions ──────────────────────────────────────
    const newHeads = new Map<string, { x: number; y: number }>();
    for (const id of aliveIds) {
      const snake = snakes[id];
      newHeads.set(id, advance(snake.segments[0], snake.nextDirection));
    }

    // ── 2. Which snakes eat food this tick? ───────────────────────────────
    const remainingFood = [...food];
    const ateFood = new Set<string>();
    for (const id of aliveIds) {
      const head = newHeads.get(id)!;
      const idx = remainingFood.findIndex(f => posEq(f, head));
      if (idx !== -1) {
        ateFood.add(id);
        remainingFood.splice(idx, 1);
      }
    }

    // ── 3. Wall collisions ─────────────────────────────────────────────────
    const willDie = new Set<string>();
    for (const id of aliveIds) {
      if (isWall(newHeads.get(id)!, width, height)) willDie.add(id);
    }

    // ── 4. Body collisions ─────────────────────────────────────────────────
    // Check new head against every body segment that will still be occupied after movement.
    // Tail moves away (unless that snake ate), so exclude it unless eating.
    for (const id of aliveIds) {
      if (willDie.has(id)) continue;
      const head = newHeads.get(id)!;

      for (const [otherId, other] of Object.entries(snakes)) {
        if (!other.alive) continue;
        const segs = other.segments;
        // Tail vacates unless that snake eats
        const skipTail = !ateFood.has(otherId) ? segs[segs.length - 1] : null;
        // Own head vacates too
        const skipHead = id === otherId ? segs[0] : null;

        for (const seg of segs) {
          if (skipHead && posEq(seg, skipHead)) continue;
          if (skipTail && posEq(seg, skipTail)) continue;
          if (posEq(seg, head)) { willDie.add(id); break; }
        }
        if (willDie.has(id)) break;
      }
    }

    // ── 5. Head-to-head collisions ─────────────────────────────────────────
    const survivors = aliveIds.filter(id => !willDie.has(id));
    for (let i = 0; i < survivors.length; i++) {
      for (let j = i + 1; j < survivors.length; j++) {
        if (posEq(newHeads.get(survivors[i])!, newHeads.get(survivors[j])!)) {
          willDie.add(survivors[i]);
          willDie.add(survivors[j]);
        }
      }
    }

    // ── 6. Apply movement ──────────────────────────────────────────────────
    const newSnakes: Record<string, PlayerSnake> = {};
    const newScores = { ...state.scores };
    let foodEatenCount = 0;

    for (const [id, snake] of Object.entries(snakes)) {
      if (!snake.alive) {
        newSnakes[id] = snake;
        continue;
      }
      if (willDie.has(id)) {
        newSnakes[id] = { ...snake, alive: false, direction: snake.nextDirection, deadTick: state.tick };
        continue;
      }
      const head = newHeads.get(id)!;
      const ate = ateFood.has(id);
      if (ate) {
        newScores[id] = (newScores[id] || 0) + 1;
        foodEatenCount++;
      }
      const segments = [head, ...snake.segments];
      if (!ate) segments.pop();
      newSnakes[id] = { ...snake, segments, direction: snake.nextDirection };
    }

    // ── 7. Spawn replacement food ──────────────────────────────────────────
    const finalFood = [...remainingFood, ...newFood.slice(0, foodEatenCount)];

    // ── 8. Check game-over ─────────────────────────────────────────────────
    const aliveCount = Object.values(newSnakes).filter(s => s.alive).length;
    const playerCount = Object.keys(newSnakes).length;
    const isOver = aliveCount === 0 || (playerCount > 1 && aliveCount <= 1);

    return {
      ...state,
      snakes: newSnakes,
      food: finalFood,
      scores: newScores,
      status: isOver ? 'game-over' : 'playing',
      tick: state.tick + 1,
    };
  }
}

export const snakeGame = new SnakeGame();
