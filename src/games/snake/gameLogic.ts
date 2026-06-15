import type { Direction, Pos, PlayerSnake } from './types';

export const GRID_W = 28;
export const GRID_H = 20;
export const FOOD_COUNT = 3;
export const TICK_MS = 150;
export const DEAD_FADE_TICKS = 25;

export const PLAYER_COLORS = [
  '#00e676', // green
  '#ff6d00', // orange
  '#40c4ff', // blue
  '#ff4081', // pink
  '#ffff00', // yellow
  '#ea80fc', // purple
  '#ff5252', // red
  '#64ffda', // teal
];

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down', down: 'up', left: 'right', right: 'left',
};

export function advance(pos: Pos, dir: Direction): Pos {
  switch (dir) {
    case 'up':    return { x: pos.x, y: pos.y - 1 };
    case 'down':  return { x: pos.x, y: pos.y + 1 };
    case 'left':  return { x: pos.x - 1, y: pos.y };
    case 'right': return { x: pos.x + 1, y: pos.y };
  }
}

export function posEq(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isWall(pos: Pos, w: number, h: number): boolean {
  return pos.x < 0 || pos.x >= w || pos.y < 0 || pos.y >= h;
}

export function canTurn(current: Direction, next: Direction): boolean {
  return next !== OPPOSITE[current];
}

export function pickRandomPositions(
  count: number,
  snakes: Record<string, PlayerSnake>,
  existingFood: Pos[],
  w: number,
  h: number,
): Pos[] {
  const occupied = new Set<string>();
  for (const snake of Object.values(snakes)) {
    for (const s of snake.segments) occupied.add(`${s.x},${s.y}`);
  }
  for (const f of existingFood) occupied.add(`${f.x},${f.y}`);

  const candidates: Pos[] = [];
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!occupied.has(`${x},${y}`)) candidates.push({ x, y });
    }
  }

  const result: Pos[] = [];
  for (let i = 0; i < count && candidates.length > 0; i++) {
    const idx = Math.floor(Math.random() * candidates.length);
    result.push(candidates.splice(idx, 1)[0]);
  }
  return result;
}

export function generateSnakeStarts(
  players: { id: string; name: string }[],
  w: number,
  h: number,
): Record<string, { segments: Pos[]; direction: Direction; color: string; playerName: string }> {
  const result: Record<string, { segments: Pos[]; direction: Direction; color: string; playerName: string }> = {};
  const count = players.length;

  for (let i = 0; i < count; i++) {
    const player = players[i];
    // Distribute snakes vertically across the board
    const y = Math.round(((i + 1) / (count + 1)) * h);
    const startX = Math.floor(w * 0.2);
    // Start length 3, head on the right, facing right
    const segments: Pos[] = [
      { x: startX + 2, y },
      { x: startX + 1, y },
      { x: startX,     y },
    ];
    result[player.id] = {
      segments,
      direction: 'right',
      color: PLAYER_COLORS[i % PLAYER_COLORS.length],
      playerName: player.name,
    };
  }
  return result;
}

export function darken(hex: string, factor: number): string {
  if (!hex.startsWith('#') || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}
