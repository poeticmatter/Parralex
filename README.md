# Coupled Colors

[github.com/poeticmatter/CoupledColors](https://github.com/poeticmatter/CoupledColors)

A two-player cooperative sliding puzzle. Both players share the same board state but see it through different color lenses — and every move you make affects your partner's view too.

## Rules

### The Boards

Two 5×5 grids are shown side by side, one per player. Both boards always contain the same 6 blocks at the same positions. The difference is color: each player has their own color scheme that determines how blocks are grouped into pairs.

**Player 1 pairs**
| Color | Blocks |
|-------|--------|
| Blue | 1 & 2 |
| Red | 3 & 4 |
| Yellow | 5 & 6 |

**Player 2 pairs**
| Color | Blocks |
|-------|--------|
| Purple | 1 & 3 |
| Green | 2 & 5 |
| Orange | 4 & 6 |

### Moving

Drag any block to slide it. When you drag a block, **all blocks of the same color on your board move together** in that direction. A move is blocked if any block in the group would leave the grid or collide with a block of a different color.

Crucially, **the same blocks (by number) also move on your partner's board** — but they don't trigger the partner's color pairs. For example: if Player 1 drags a blue block, blocks 1 and 2 move on Player 1's board, and blocks 1 and 2 also move on Player 2's board. On Player 2's board, block 1 is purple (normally paired with 3) and block 2 is green (normally paired with 5) — but neither 3 nor 5 moves. Only 1 and 2 do.

This cross-board interference is the core of the game. A move that helps you can disrupt your partner, and vice versa.

### Winning

Each block has a target position shown as a dashed outline on both boards. The target outlines are colored according to each player's color scheme — so the target for block 5 appears yellow on Player 1's board and green on Player 2's board, but it represents the same position on the grid.

The puzzle is solved when **all 6 blocks are on their target positions**. Because both boards always share the same positions, solving one board solves both.

---

## Level Generator

Puzzles are guaranteed solvable by construction. The generator works in two steps:

1. **Random start** — 6 block positions are chosen randomly from the 25 cells of the grid.
2. **Random walk** — Starting from that position, the generator simulates a sequence of valid moves (chosen randomly from all possible pair slides across both players' color schemes). The final position after the walk becomes the target layout.

Because the targets are produced by walking *forward* from the start, there is always a solution — at minimum, the reverse of the walk itself.

Difficulty controls the length of the walk:

| Difficulty | Walk length |
|------------|-------------|
| Easy | 15 moves |
| Medium | 30 moves |
| Hard | 50 moves |

Walk length correlates with how far the target is from the start in the puzzle's state space, which determines roughly how many moves an optimal solution requires.

### Why not every starting position can reach every target

The two-board state space is not fully connected. Every individual block can reach every cell on the board, but not every *combination* of block positions is reachable from a given start — similar to how in the 15-puzzle, any tile can reach any square but only half of all arrangements are reachable from a given configuration.

This is why the random walk approach matters: picking a start and a target independently at random would frequently produce an unsolvable puzzle.

---

## Running Locally

**Prerequisites:** Node.js

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.
