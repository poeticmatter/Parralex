/**
 * reachability.mjs
 *
 * Analyses which two-board states are reachable from a given starting position
 * in the 2-player Color Slide game.
 *
 * State  = positions of 6 blocks on P1's board  +  6 blocks on P2's board.
 * Moves  = either player slides one of their color pairs; the same block IDs
 *           are then mirrored (individually, not as a pair) onto the other board.
 *
 * Run:  node scripts/reachability.mjs
 */

const GRID = 5;
const DIRS = [[1,0],[-1,0],[0,1],[0,-1]];

// Pair definitions (0-indexed block IDs 0–5, matching game blocks 1–6)
// P1: 0&1=blue, 2&3=red, 4&5=yellow
// P2: 0&2=purple, 1&4=green, 3&5=orange
const P1_PAIRS = [[0,1],[2,3],[4,5]];
const P2_PAIRS = [[0,2],[1,4],[3,5]];

// ─── State encoding ───────────────────────────────────────────────────────────

// Each block position encoded as a single byte 0–24 (x + y*5).
// Full state = 12 bytes as a string.
function encodeBoard(board) {
  return board.map(b => String.fromCharCode(b.x + b.y * GRID)).join('');
}
function encodeState(p1, p2) {
  return encodeBoard(p1) + encodeBoard(p2);
}

// ─── Move application ─────────────────────────────────────────────────────────

// Slide a color pair on one board. Returns new board array or null if blocked.
function slidePair(board, pairIdx, dx, dy) {
  const [i, j] = pairIdx;
  const a = board[i], b = board[j];
  const na = { x: a.x + dx, y: a.y + dy };
  const nb = { x: b.x + dx, y: b.y + dy };

  if (na.x < 0 || na.x >= GRID || na.y < 0 || na.y >= GRID) return null;
  if (nb.x < 0 || nb.x >= GRID || nb.y < 0 || nb.y >= GRID) return null;

  for (let k = 0; k < board.length; k++) {
    if (k === i || k === j) continue;
    const p = board[k];
    if ((p.x === na.x && p.y === na.y) || (p.x === nb.x && p.y === nb.y)) return null;
  }

  return board.map((b, k) => k === i ? na : k === j ? nb : b);
}

// Mirror specific block IDs onto another board (cross-board effect, no pair chaining).
// Returns new board or null if any mover is out-of-bounds or blocked.
function slideIds(board, ids, dx, dy) {
  const idSet = new Set(ids);
  for (const i of ids) {
    const nx = board[i].x + dx, ny = board[i].y + dy;
    if (nx < 0 || nx >= GRID || ny < 0 || ny >= GRID) return null;
    if (board.some((b, k) => !idSet.has(k) && b.x === nx && b.y === ny)) return null;
  }
  return board.map((b, k) => idSet.has(k) ? { x: b.x + dx, y: b.y + dy } : b);
}

// ─── BFS ─────────────────────────────────────────────────────────────────────

function bfs(initialP1, initialP2, limit = 2_000_000) {
  const visited = new Set();
  const queue = [[initialP1, initialP2]];
  visited.add(encodeState(initialP1, initialP2));

  let head = 0;
  while (head < queue.length) {
    if (visited.size >= limit) { return { visited, capped: true }; }

    const [p1, p2] = queue[head++];

    // P1 slides a color pair → mirrors same IDs to P2
    for (const pair of P1_PAIRS) {
      for (const [dx, dy] of DIRS) {
        const newP1 = slidePair(p1, pair, dx, dy);
        if (!newP1) continue;
        // Cross-board: same IDs move on P2 (blocked P2 stays put — primary move still counts)
        const newP2 = slideIds(p2, pair, dx, dy) ?? p2;
        const key = encodeState(newP1, newP2);
        if (!visited.has(key)) { visited.add(key); queue.push([newP1, newP2]); }
      }
    }

    // P2 slides a color pair → mirrors same IDs to P1
    for (const pair of P2_PAIRS) {
      for (const [dx, dy] of DIRS) {
        const newP2 = slidePair(p2, pair, dx, dy);
        if (!newP2) continue;
        const newP1 = slideIds(p1, pair, dx, dy) ?? p1;
        const key = encodeState(newP1, newP2);
        if (!visited.has(key)) { visited.add(key); queue.push([newP1, newP2]); }
      }
    }
  }

  return { visited, capped: false };
}

// ─── Cell reachability projection ────────────────────────────────────────────

// Given all visited states, for each block on each board,
// collect every cell it ever occupies.
function cellReachability(visitedKeys) {
  const p1Cells = Array.from({ length: 6 }, () => new Set());
  const p2Cells = Array.from({ length: 6 }, () => new Set());

  for (const key of visitedKeys) {
    for (let i = 0; i < 6; i++) {
      p1Cells[i].add(key.charCodeAt(i));
      p2Cells[i].add(key.charCodeAt(6 + i));
    }
  }
  return { p1Cells, p2Cells };
}

function renderGrid(cellSet) {
  let out = '';
  for (let y = 0; y < GRID; y++) {
    let row = '  ';
    for (let x = 0; x < GRID; x++) {
      row += cellSet.has(x + y * GRID) ? '■ ' : '· ';
    }
    out += row + '\n';
  }
  return out;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomStart() {
  const pos = shuffle(
    Array.from({ length: 25 }, (_, i) => ({ x: i % GRID, y: Math.floor(i / GRID) }))
  ).slice(0, 6);
  return pos;
}

// Both boards start at the same positions (as in the game)
const startPos = randomStart();
const initialP1 = startPos.map(p => ({ ...p }));
const initialP2 = startPos.map(p => ({ ...p }));

console.log('=== Color Slide — Reachability Analysis ===\n');
console.log('Starting block positions (same on both boards):');
console.log(' ', startPos.map((p, i) => `block${i+1}=(${p.x},${p.y})`).join('  '));
console.log();

console.log('Running BFS over two-board state space...');
const t0 = Date.now();
const { visited, capped } = bfs(initialP1, initialP2);
const elapsed = ((Date.now() - t0) / 1000).toFixed(2);

console.log(`BFS complete in ${elapsed}s`);
if (capped) {
  console.log(`⚠ Hit state limit — results are a lower bound.`);
} else {
  console.log(`✓ Full reachable component explored.`);
}
console.log(`Reachable two-board states: ${visited.size.toLocaleString()}\n`);

// ─── Cell reachability per block ──────────────────────────────────────────────

const { p1Cells, p2Cells } = cellReachability(visited);

const p1Names = ['blue','blue','red','red','yellow','yellow'];
const p2Names = ['purple','green','purple','orange','green','orange'];

// Check if any block has restricted reach
let anyRestricted = false;
for (let i = 0; i < 6; i++) {
  if (p1Cells[i].size < 25) anyRestricted = true;
  if (p2Cells[i].size < 25) anyRestricted = true;
}

console.log(`=== Cell Reachability per Block ===`);
console.log(`(■ = reachable, · = never reached)\n`);

for (let i = 0; i < 6; i++) {
  const p1Count = p1Cells[i].size;
  const p2Count = p2Cells[i].size;
  console.log(`Block ${i+1} — P1 board (${p1Names[i]}): ${p1Count}/25 cells`);
  if (p1Count < 25) process.stdout.write(renderGrid(p1Cells[i]));
  console.log(`Block ${i+1} — P2 board (${p2Names[i]}): ${p2Count}/25 cells`);
  if (p2Count < 25) process.stdout.write(renderGrid(p2Cells[i]));
  console.log();
}

if (!anyRestricted) {
  console.log('Every block can reach every cell on its board.');
} else {
  console.log('Some blocks have restricted cell reachability (see grids above).');
}

// ─── Check if multiple components exist (run BFS from a different start) ──────

if (!capped) {
  console.log('\n=== Connectivity Check ===');
  console.log('Running BFS from a second random starting position to check for disconnected components...\n');

  const start2 = randomStart();
  const { visited: v2, capped: c2 } = bfs(start2.map(p=>({...p})), start2.map(p=>({...p})));

  // Check overlap
  let overlap = 0;
  for (const k of v2) { if (visited.has(k)) overlap++; }

  console.log(`Component 1: ${visited.size.toLocaleString()} states`);
  console.log(`Component 2: ${v2.size.toLocaleString()} states`);
  console.log(`Overlap: ${overlap.toLocaleString()} states`);

  if (overlap === visited.size && overlap === v2.size) {
    console.log('\n✓ Both starting positions reach the same component — fully connected.');
  } else if (overlap === 0) {
    console.log('\n✗ Completely disjoint components — not all positions are reachable from all starts.');
  } else {
    console.log(`\n~ Partial overlap — the state space has at least 2 components.`);
  }
}
