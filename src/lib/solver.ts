import { Color, Entity, LevelData, Target } from '../types';
import { GRID_SIZE } from '../constants';

export type Move =
  | { type: 'slide'; color: Color; dx: number; dy: number }
  | { type: 'paint'; blockId: number };

export type SolveResult =
  | { status: 'solved'; moves: Move[] }
  | { status: 'unsolvable' }
  | { status: 'timeout' };

type Btn = { x: number; y: number; color: Color };

const COLORS: Color[] = ['red', 'blue', 'green'];
const DIRS = [
  { dx: 1, dy: 0 }, { dx: -1, dy: 0 },
  { dx: 0, dy: 1 }, { dx: 0, dy: -1 },
] as const;
const COLOR_CODE: Record<Color, number> = { red: 1, blue: 2, green: 3, yellow: 4, purple: 5, orange: 6 };

// ─── State encoding ───────────────────────────────────────────────────────────

function stateKey(buttons: Btn[]): string {
  const cells = new Uint8Array(GRID_SIZE * GRID_SIZE);
  for (const b of buttons) cells[b.y * GRID_SIZE + b.x] = COLOR_CODE[b.color];
  return String.fromCharCode(...cells);
}

function stateFromKey(key: string): Btn[] {
  const out: Btn[] = [];
  for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
    const c = key.charCodeAt(i);
    if (c > 0) out.push({
      x: i % GRID_SIZE,
      y: Math.floor(i / GRID_SIZE),
      color: c === 1 ? 'red' : c === 2 ? 'blue' : 'green',
    });
  }
  return out;
}

// ─── Move application (returns null = no-op) ─────────────────────────────────

function applySlide(buttons: Btn[], blocks: Entity[], color: Color, dx: number, dy: number): Btn[] | null {
  const group = buttons.filter(b => b.color === color);
  if (group.length === 0) return null;
  for (const b of group) {
    const nx = b.x + dx, ny = b.y + dy;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return null;
    if (blocks.some(bl => bl.x === nx && bl.y === ny)) return null;
    if (buttons.some(ob => ob.color !== color && ob.x === nx && ob.y === ny)) return null;
  }
  return buttons.map(b => b.color === color ? { ...b, x: b.x + dx, y: b.y + dy } : b);
}

function applyPaint(buttons: Btn[], block: Entity): Btn[] | null {
  const bc = block.color as Color;
  let changed = false;
  const next = buttons.map(b => {
    if (b.color !== bc &&
        ((Math.abs(b.x - block.x) === 1 && b.y === block.y) ||
         (Math.abs(b.y - block.y) === 1 && b.x === block.x))) {
      changed = true;
      return { ...b, color: bc };
    }
    return b;
  });
  return changed ? next : null;
}

// ─── Goal / heuristic ────────────────────────────────────────────────────────

function isGoal(buttons: Btn[], targets: Target[]): boolean {
  return targets.every(t => buttons.some(b => b.x === t.x && b.y === t.y && b.color === t.color));
}

/**
 * Sum of min-manhattan-distances from each unsatisfied target to the nearest
 * same-color button. Inadmissible (overestimates when one slide helps two
 * targets), but drastically cuts the search vs. plain BFS.
 */
function heuristic(buttons: Btn[], targets: Target[]): number {
  let h = 0;
  for (const t of targets) {
    if (buttons.some(b => b.x === t.x && b.y === t.y && b.color === t.color)) continue;
    const same = buttons.filter(b => b.color === t.color);
    if (same.length > 0) {
      h += Math.min(...same.map(b => Math.abs(b.x - t.x) + Math.abs(b.y - t.y)));
    } else {
      // No button of this color exists yet — need a paint first
      h += Math.min(...buttons.map(b => Math.abs(b.x - t.x) + Math.abs(b.y - t.y))) + 1;
    }
  }
  return h;
}

// ─── Min-heap ─────────────────────────────────────────────────────────────────

class MinHeap {
  private data: [number, string][] = [];
  get size() { return this.data.length; }

  push(f: number, key: string) {
    this.data.push([f, key]);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): [number, string] | undefined {
    if (!this.data.length) return undefined;
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) { this.data[0] = last; this.sinkDown(0); }
    return top;
  }

  private bubbleUp(i: number) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.data[p][0] > this.data[i][0]) {
        [this.data[p], this.data[i]] = [this.data[i], this.data[p]]; i = p;
      } else break;
    }
  }

  private sinkDown(i: number) {
    const n = this.data.length;
    while (true) {
      let m = i;
      const l = 2 * i + 1, r = 2 * i + 2;
      if (l < n && this.data[l][0] < this.data[m][0]) m = l;
      if (r < n && this.data[r][0] < this.data[m][0]) m = r;
      if (m === i) break;
      [this.data[m], this.data[i]] = [this.data[i], this.data[m]]; i = m;
    }
  }
}

// ─── A* solver ───────────────────────────────────────────────────────────────

type ParentEntry = { fromKey: string; move: Move } | null;

function reconstructPath(parent: Map<string, ParentEntry>, goalKey: string): Move[] {
  const moves: Move[] = [];
  let key = goalKey;
  while (true) {
    const p = parent.get(key)!;
    if (p === null) break;
    moves.unshift(p.move);
    key = p.fromKey;
  }
  return moves;
}

/**
 * A* search. Uses an inadmissible heuristic for speed; solutions are valid
 * but may not be the absolute shortest.
 */
export function solve(level: LevelData, maxStates = 500_000): SolveResult {
  const blocks = level.entities.filter(e => e.type === 'block');
  const { targets } = level;

  const initial: Btn[] = level.initialEntities
    .filter(e => e.type === 'button')
    .map(e => ({ x: e.x, y: e.y, color: e.color as Color }));

  if (isGoal(initial, targets)) return { status: 'solved', moves: [] };

  const initialKey = stateKey(initial);
  const parent = new Map<string, ParentEntry>([[initialKey, null]]);
  const gScore = new Map<string, number>([[initialKey, 0]]);
  const heap = new MinHeap();
  heap.push(heuristic(initial, targets), initialKey);

  while (heap.size > 0) {
    if (parent.size > maxStates) return { status: 'timeout' };

    const [, key] = heap.pop()!;
    const g = gScore.get(key)!;

    // Skip if we've already found a better path to this state
    // (lazy deletion — heap may contain stale entries)
    const buttons = stateFromKey(key);

    for (const color of COLORS) {
      for (const { dx, dy } of DIRS) {
        const next = applySlide(buttons, blocks, color, dx, dy);
        if (!next) continue;
        const nk = stateKey(next);
        const ng = g + 1;
        if (!gScore.has(nk) || ng < gScore.get(nk)!) {
          gScore.set(nk, ng);
          parent.set(nk, { fromKey: key, move: { type: 'slide', color, dx, dy } });
          if (isGoal(next, targets)) return { status: 'solved', moves: reconstructPath(parent, nk) };
          heap.push(ng + heuristic(next, targets), nk);
        }
      }
    }

    for (const block of blocks) {
      const next = applyPaint(buttons, block);
      if (!next) continue;
      const nk = stateKey(next);
      const ng = g + 1;
      if (!gScore.has(nk) || ng < gScore.get(nk)!) {
        gScore.set(nk, ng);
        parent.set(nk, { fromKey: key, move: { type: 'paint', blockId: block.id } });
        if (isGoal(next, targets)) return { status: 'solved', moves: reconstructPath(parent, nk) };
        heap.push(ng + heuristic(next, targets), nk);
      }
    }
  }

  return { status: 'unsolvable' };
}
