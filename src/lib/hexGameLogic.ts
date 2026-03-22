import type {
  Character, CharId, DieLabel, GameState,
  PlayerAssignment, DicePairAssignment, MovementArrow, HexCoord,
} from '../types'
import { isOnBoard, HEX_DIRECTIONS, GRID_SIZE } from './hexGrid'

// ── Pairings ───────────────────────────────────────────────────────────────────
// P1: char pairs {A,B} and {C,D}, dice pairs {A,B} and {C,D}
// P2: char pairs {A,C} and {B,D}, dice pairs {A,C} and {B,D}

export const P1_DICE_PAIRS: [DieLabel, DieLabel][] = [['A', 'B'], ['C', 'D']]
export const P1_CHAR_PAIRS: [CharId, CharId][] = [['A', 'B'], ['C', 'D']]

export const P2_DICE_PAIRS: [DieLabel, DieLabel][] = [['A', 'C'], ['B', 'D']]
export const P2_CHAR_PAIRS: [CharId, CharId][] = [['A', 'C'], ['B', 'D']]

// ── Dice ───────────────────────────────────────────────────────────────────────

export function rollAllDice(): Record<DieLabel, number> {
  const roll = () => Math.floor(Math.random() * 6) + 1
  return { A: roll(), B: roll(), C: roll(), D: roll() }
}

// ── Initial state ──────────────────────────────────────────────────────────────

export function getInitialCharacters(): Character[] {
  return [
    { id: 'A', q: 8,  r: 9  },
    { id: 'B', q: 11, r: 9  },
    { id: 'C', q: 8,  r: 11 },
    { id: 'D', q: 11, r: 11 },
  ]
}

/** Axial hex distance between two hexes. */
function hexDistance(aq: number, ar: number, bq: number, br: number): number {
  return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs((aq + ar) - (bq + br))) / 2
}

/**
 * Randomly place obstacles on interior hexes.
 * Targets ~1/6 of the total grid. Never blocks edge hexes (the win zones)
 * or any hex within 3 steps of a starting character.
 */
export function generateObstacles(): HexCoord[] {
  const startingChars = getInitialCharacters()
  const targetCount = Math.round(GRID_SIZE * GRID_SIZE / 12)

  const candidates: HexCoord[] = []
  for (let q = 1; q < GRID_SIZE - 1; q++) {
    for (let r = 1; r < GRID_SIZE - 1; r++) {
      const tooClose = startingChars.some(c => hexDistance(q, r, c.q, c.r) <= 3)
      if (!tooClose) candidates.push({ q, r })
    }
  }

  // Fisher-Yates shuffle then slice
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates.slice(0, targetCount)
}

/** Build a fast lookup Set from the obstacles array (key = "q,r"). */
export function obstacleSet(obstacles: HexCoord[]): Set<string> {
  return new Set(obstacles.map(o => `${o.q},${o.r}`))
}

// ── Arrows ─────────────────────────────────────────────────────────────────────

/** Compute arrows for characters that moved between two snapshots. */
export function computeMovementArrows(before: Character[], after: Character[]): MovementArrow[] {
  return before.flatMap(c => {
    const next = after.find(n => n.id === c.id)!
    if (next.q === c.q && next.r === c.r) return []
    return [{ charId: c.id, fromQ: c.q, fromR: c.r, toQ: next.q, toR: next.r }]
  })
}

// ── Movement ───────────────────────────────────────────────────────────────────

function moveCharacter(
  char: Character,
  direction: number,
  distance: number,
  blocked: Set<string>,
  allChars: Character[],
): Character {
  const dir = HEX_DIRECTIONS[direction]
  if (!dir) return char

  let q = char.q
  let r = char.r
  for (let i = 0; i < distance; i++) {
    const nq = q + dir.dq
    const nr = r + dir.dr
    if (!isOnBoard(nq, nr)) break
    if (blocked.has(`${nq},${nr}`)) break
    if (allChars.some(c => c.id !== char.id && c.q === nq && c.r === nr)) break
    q = nq
    r = nr
  }
  return q === char.q && r === char.r ? char : { ...char, q, r }
}

interface MovementInstruction {
  charId: CharId
  direction: number
  distance: number
}

function buildInstructions(
  assignment: PlayerAssignment,
  diceValues: Record<DieLabel, number>,
  dicePairs: [DieLabel, DieLabel][],
  charPairs: [CharId, CharId][],
): MovementInstruction[] {
  const instructions: MovementInstruction[] = []

  for (const pairIndex of [0, 1] as const) {
    const pairAssignment: DicePairAssignment = pairIndex === 0 ? assignment.pair0 : assignment.pair1
    const [dieX, dieY] = dicePairs[pairIndex]
    const charPair = charPairs[pairAssignment.targetCharPairIndex]

    const dirDie = pairAssignment.directionDie
    const distDie = dirDie === dieX ? dieY : dieX

    const direction = diceValues[dirDie]
    const distance = diceValues[distDie]

    for (const charId of charPair) {
      instructions.push({ charId, direction, distance })
    }
  }

  return instructions
}

const CHAR_ORDER: CharId[] = ['A', 'B', 'C', 'D']

/**
 * Apply instructions in character order A→D.
 * For each character, P1's instruction runs before P2's.
 * Each step uses the current positions of all characters for blocking.
 */
function applyInstructions(
  characters: Character[],
  p1Instructions: MovementInstruction[],
  p2Instructions: MovementInstruction[],
  blocked: Set<string>,
): Character[] {
  let current = [...characters]

  for (const charId of CHAR_ORDER) {
    const mine = [
      ...p1Instructions.filter(i => i.charId === charId),
      ...p2Instructions.filter(i => i.charId === charId),
    ]
    for (const { direction, distance } of mine) {
      current = current.map(c =>
        c.id === charId ? moveCharacter(c, direction, distance, blocked, current) : c
      )
    }
  }

  return current
}

/**
 * Apply all movement instructions for this round, resolved A→D.
 */
export function resolveMovement(state: GameState): Character[] {
  const { characters, diceValues, p1Assignment, p2Assignment, obstacles } = state
  if (!p1Assignment || !p2Assignment) return characters

  const blocked = obstacleSet(obstacles)
  const p1Instructions = buildInstructions(p1Assignment, diceValues, P1_DICE_PAIRS, P1_CHAR_PAIRS)
  const p2Instructions = buildInstructions(p2Assignment, diceValues, P2_DICE_PAIRS, P2_CHAR_PAIRS)
  return applyInstructions(characters, p1Instructions, p2Instructions, blocked)
}

/**
 * Compute where characters would end up if only one player's assignment is applied.
 * Used to render predictive arrows while the player is still deciding.
 */
export function resolveOnePlayerMovement(
  characters: Character[],
  playerRole: 1 | 2,
  assignment: PlayerAssignment,
  diceValues: Record<DieLabel, number>,
  obstacles: HexCoord[],
): Character[] {
  const dicePairs = playerRole === 1 ? P1_DICE_PAIRS : P2_DICE_PAIRS
  const charPairs = playerRole === 1 ? P1_CHAR_PAIRS : P2_CHAR_PAIRS
  const instructions = buildInstructions(assignment, diceValues, dicePairs, charPairs)
  const blocked = obstacleSet(obstacles)
  // Only one player's instructions — pass empty array for the other
  return applyInstructions(characters, instructions, [], blocked)
}

// ── Win condition ──────────────────────────────────────────────────────────────

const NORTH_EDGE = 0
const SOUTH_EDGE = GRID_SIZE - 1
const WEST_EDGE  = 0
const EAST_EDGE  = GRID_SIZE - 1

/**
 * P1 wins when all 4 characters are on the north (r=0) or south (r=19) edge.
 * P2 wins when all 4 characters are on the west (q=0) or east (q=19) edge.
 */
export function checkWinner(characters: Character[]): 1 | 2 | null {
  const allNorthSouth = characters.every(c => c.r === NORTH_EDGE || c.r === SOUTH_EDGE)
  if (allNorthSouth) return 1

  const allEastWest = characters.every(c => c.q === WEST_EDGE || c.q === EAST_EDGE)
  if (allEastWest) return 2

  return null
}
