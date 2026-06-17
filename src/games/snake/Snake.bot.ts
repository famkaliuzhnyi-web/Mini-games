import type { IBot, BotDifficulty } from '../_contract/IBot';
import type { SnakeGameState, SnakeAction, Direction, Pos } from './types';

const DIRS: Direction[] = ['up', 'down', 'left', 'right'];
const OPPOSITE: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function advance(pos: Pos, dir: Direction): Pos {
  switch (dir) {
    case 'up':    return { x: pos.x,     y: pos.y - 1 };
    case 'down':  return { x: pos.x,     y: pos.y + 1 };
    case 'left':  return { x: pos.x - 1, y: pos.y     };
    case 'right': return { x: pos.x + 1, y: pos.y     };
  }
}

function inBounds(pos: Pos, w: number, h: number): boolean {
  return pos.x >= 0 && pos.x < w && pos.y >= 0 && pos.y < h;
}

function key(pos: Pos): string { return `${pos.x},${pos.y}`; }

function occupiedSet(state: SnakeGameState): Set<string> {
  const s = new Set<string>();
  for (const snake of Object.values(state.snakes)) {
    for (const seg of snake.segments) s.add(key(seg));
  }
  return s;
}

function safeDirs(head: Pos, current: Direction, occupied: Set<string>, w: number, h: number): Direction[] {
  return DIRS.filter(d => {
    if (d === OPPOSITE[current]) return false;
    const next = advance(head, d);
    return inBounds(next, w, h) && !occupied.has(key(next));
  });
}

function bfsDir(head: Pos, target: Pos, current: Direction, occupied: Set<string>, w: number, h: number): Direction | null {
  type Node = { pos: Pos; firstDir: Direction };
  const visited = new Set<string>([key(head)]);
  const queue: Node[] = [];

  for (const d of DIRS) {
    if (d === OPPOSITE[current]) continue;
    const next = advance(head, d);
    if (inBounds(next, w, h) && !occupied.has(key(next))) {
      queue.push({ pos: next, firstDir: d });
      visited.add(key(next));
    }
  }

  while (queue.length > 0) {
    const { pos, firstDir } = queue.shift()!;
    if (pos.x === target.x && pos.y === target.y) return firstDir;

    for (const d of DIRS) {
      const next = advance(pos, d);
      const k = key(next);
      if (inBounds(next, w, h) && !occupied.has(k) && !visited.has(k)) {
        visited.add(k);
        queue.push({ pos: next, firstDir });
      }
    }
  }
  return null;
}

function nearestFood(head: Pos, food: Pos[]): Pos | null {
  if (food.length === 0) return null;
  return food.reduce((a, b) =>
    Math.abs(a.x - head.x) + Math.abs(a.y - head.y) <=
    Math.abs(b.x - head.x) + Math.abs(b.y - head.y) ? a : b,
  );
}

class SnakeBotLogic implements IBot<SnakeGameState, SnakeAction> {
  chooseAction(state: SnakeGameState, playerId: string, difficulty: BotDifficulty): SnakeAction {
    const snake = state.snakes[playerId];
    const fallback: SnakeAction = { type: 'change-direction', direction: snake?.nextDirection ?? 'right' };
    if (!snake || !snake.alive) return fallback;

    const head = snake.segments[0];
    const current = snake.nextDirection;
    const occupied = occupiedSet(state);
    const safe = safeDirs(head, current, occupied, state.width, state.height);

    if (difficulty === 'easy') {
      if (safe.length === 0) return fallback;
      if (safe.includes(current)) return { type: 'change-direction', direction: current };
      return { type: 'change-direction', direction: safe[Math.floor(Math.random() * safe.length)] };
    }

    if (safe.length === 0) return fallback;

    const target = nearestFood(head, state.food);
    if (!target) return { type: 'change-direction', direction: safe[0] };

    if (difficulty === 'medium') {
      const best = safe.sort((a, b) => {
        const na = advance(head, a);
        const nb = advance(head, b);
        return (Math.abs(na.x - target.x) + Math.abs(na.y - target.y)) -
               (Math.abs(nb.x - target.x) + Math.abs(nb.y - target.y));
      })[0];
      return { type: 'change-direction', direction: best };
    }

    // Hard: BFS path to nearest food
    const dir = bfsDir(head, target, current, occupied, state.width, state.height);
    return { type: 'change-direction', direction: dir ?? safe[0] };
  }
}

export const snakeBot = new SnakeBotLogic();
