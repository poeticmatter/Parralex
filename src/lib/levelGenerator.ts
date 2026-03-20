import { Color, Entity, BlockTarget } from '../types';

const GRID = 5;
const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// P1: 1&2=blue, 3&4=red, 5&6=yellow
export const P1_BLOCK_COLORS: Record<number, Color> = {
  1: 'blue', 2: 'blue', 3: 'red', 4: 'red', 5: 'yellow', 6: 'yellow',
};

// P2: 1&3=purple, 2&5=green, 4&6=orange
export const P2_BLOCK_COLORS: Record<number, Color> = {
  1: 'purple', 2: 'green', 3: 'purple', 4: 'orange', 5: 'green', 6: 'orange',
};

// 0-based pair indices into the 6-block position array
const P1_PAIRS: [number, number][] = [[0, 1], [2, 3], [4, 5]];
const P2_PAIRS: [number, number][] = [[0, 2], [1, 4], [3, 5]];

type Pos = { x: number; y: number };

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Try to slide a pair of indices; returns new array or null if blocked.
function slidePair(pos: Pos[], pair: [number, number], dx: number, dy: number): Pos[] | null {
  const [i, j] = pair;
  const na = { x: pos[i].x + dx, y: pos[i].y + dy };
  const nb = { x: pos[j].x + dx, y: pos[j].y + dy };

  if (na.x < 0 || na.x >= GRID || na.y < 0 || na.y >= GRID) return null;
  if (nb.x < 0 || nb.x >= GRID || nb.y < 0 || nb.y >= GRID) return null;

  for (let k = 0; k < pos.length; k++) {
    if (k === i || k === j) continue;
    if ((pos[k].x === na.x && pos[k].y === na.y) || (pos[k].x === nb.x && pos[k].y === nb.y)) return null;
  }

  return pos.map((p, k) => k === i ? na : k === j ? nb : p);
}

type Move = { pair: [number, number]; dx: number; dy: number };

// Both boards always share the same positions, so we only need to track one set.
// A P1 move slides P1's color pair; a P2 move slides P2's color pair.
// Either way, the same 2 block indices move — just determined by different color groupings.
function randomWalk(start: Pos[], steps: number): Pos[] {
  let pos = start.map(p => ({ ...p }));

  const allMoves: Move[] = [
    ...P1_PAIRS.flatMap(pair => DIRS.map(([dx, dy]) => ({ pair, dx, dy }))),
    ...P2_PAIRS.flatMap(pair => DIRS.map(([dx, dy]) => ({ pair, dx, dy }))),
  ];

  let completed = 0;
  while (completed < steps) {
    const moves = shuffle(allMoves);
    let moved = false;

    for (const { pair, dx, dy } of moves) {
      const next = slidePair(pos, pair, dx, dy);
      if (!next) continue;
      pos = next;
      moved = true;
      completed++;
      break;
    }

    if (!moved) break; // fully locked, stop early
  }

  return pos;
}

export interface PuzzleData {
  positions: Pos[];
  targets: BlockTarget[];
}

export function generatePuzzle(difficulty: 'easy' | 'medium' | 'hard' = 'medium'): {
  p1: Entity[];
  p2: Entity[];
  targets: BlockTarget[];
} {
  const steps = difficulty === 'easy' ? 15 : difficulty === 'medium' ? 30 : 50;

  const startPos: Pos[] = shuffle(
    Array.from({ length: 25 }, (_, i) => ({ x: i % GRID, y: Math.floor(i / GRID) }))
  ).slice(0, 6);

  const goalPos = randomWalk(startPos.map(p => ({ ...p })), steps);

  const p1: Entity[] = startPos.map((pos, i) => ({
    id: i + 1, type: 'button', x: pos.x, y: pos.y, color: P1_BLOCK_COLORS[i + 1],
  }));
  const p2: Entity[] = startPos.map((pos, i) => ({
    id: i + 1, type: 'button', x: pos.x, y: pos.y, color: P2_BLOCK_COLORS[i + 1],
  }));

  const targets: BlockTarget[] = goalPos.map((pos, i) => ({ blockId: i + 1, x: pos.x, y: pos.y }));

  return { p1, p2, targets };
}
