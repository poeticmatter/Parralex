import type {
  Character, CharId, CardOption, GameState,
  PlayerAssignment, MovementArrow, HexCoord,
} from '../types'
import { isOnBoard, HEX_DIRECTIONS, HEX_RADIUS, hexDistance, getAllHexes } from './hexGrid'

// ── Pairings ───────────────────────────────────────────────────────────────────
// P1: char pairs {A,B} and {C,D}
// P2: char pairs {A,C} and {B,D}

export const P1_CHAR_PAIRS: [CharId, CharId][] = [['A', 'B'], ['C', 'D']]
export const P2_CHAR_PAIRS: [CharId, CharId][] = [['A', 'C'], ['B', 'D']]

// ── Card → direction ──────────────────────────────────────────────────────────
//
// Three base options (flat-top hex):
//   Card 1 = Up           (dir 1, axial 0,-1)
//   Card 2 = Lower-right  (dir 3, axial +1,0)
//   Card 3 = Lower-left   (dir 5, axial -1,+1)
//
// When a character receives one card from each player, the directions are
// averaged in pixel space; the result maps exactly to one of the 6 hex dirs:
//   1+1 → Up (1)          2+2 → Lower-right (3)    3+3 → Lower-left (5)
//   1+2 → Upper-right (2) 1+3 → Upper-left (6)     2+3 → Down (4)

const COMBINED_DIRECTION: Record<string, number> = {
  '1,1': 1,  '2,2': 3,  '3,3': 5,
  '1,2': 2,  '2,1': 2,
  '1,3': 6,  '3,1': 6,
  '2,3': 4,  '3,2': 4,
}

export const CARD_LABELS: Record<CardOption, string> = {
  1: '↑ Up',
  2: '↘ Lower-right',
  3: '↙ Lower-left',
}

function getDirection(card1: CardOption, card2: CardOption): number {
  return COMBINED_DIRECTION[`${card1},${card2}`]
}

function getCardForChar(charId: CharId, assignment: PlayerAssignment, charPairs: [CharId, CharId][]): CardOption {
  return charPairs[0].includes(charId) ? assignment.pair0Card : assignment.pair1Card
}

// ── Initial state ──────────────────────────────────────────────────────────────

export function getInitialCharacters(): Character[] {
  // Spread 4 characters at compass points, distance 4 from center
  return [
    { id: 'A', q: -5, r:  1 },
    { id: 'B', q:  1, r: -5 },
    { id: 'C', q: -1, r:  5 },
    { id: 'D', q:  5, r: -1 },
  ]
}

// ── Obstacles ─────────────────────────────────────────────────────────────────

/** Build a fast lookup Set from the obstacles array (key = "q,r"). */
export function obstacleSet(obstacles: HexCoord[]): Set<string> {
  return new Set(obstacles.map(o => `${o.q},${o.r}`))
}

/**
 * Randomly place obstacles on interior hexes, targeting ~1/24 of the board.
 * Never blocks hexes within 3 steps of a starting character.
 */
export function generateObstacles(): HexCoord[] {
  const startingChars = getInitialCharacters()
  const allHexes = getAllHexes()
  const totalHexes = allHexes.length // 169 for radius 7

  const candidates = allHexes.filter(({ q, r }) => {
    // Keep the immediate neighbours of each starting character clear
    const tooClose = startingChars.some(c => hexDistance(q, r, c.q, c.r) <= 1)
    return !tooClose
  })

  // Fisher-Yates shuffle
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  return candidates.slice(0, Math.round(totalHexes / 6))
}

// ── Arrows ─────────────────────────────────────────────────────────────────────

export function computeMovementArrows(before: Character[], after: Character[]): MovementArrow[] {
  return before.flatMap(c => {
    const next = after.find(n => n.id === c.id)!
    if (next.q === c.q && next.r === c.r) return []
    return [{ charId: c.id, fromQ: c.q, fromR: c.r, toQ: next.q, toR: next.r }]
  })
}

// ── Movement ───────────────────────────────────────────────────────────────────

const CHAR_ORDER: CharId[] = ['A', 'B', 'C', 'D']

function moveCharacter(
  char: Character,
  direction: number,
  blocked: Set<string>,
): Character {
  const dir = HEX_DIRECTIONS[direction]
  if (!dir) return char

  const nq = char.q + dir.dq
  const nr = char.r + dir.dr

  if (!isOnBoard(nq, nr)) return char
  if (blocked.has(`${nq},${nr}`)) return char

  return { ...char, q: nq, r: nr }
}

function applyAssignments(
  characters: Character[],
  p1Assignment: PlayerAssignment,
  p2Assignment: PlayerAssignment | null,
  blocked: Set<string>,
): Character[] {
  let current = [...characters]

  for (const charId of CHAR_ORDER) {
    const p1Card = getCardForChar(charId, p1Assignment, P1_CHAR_PAIRS)
    // When P2 assignment is unknown (predictive mode), treat both cards as P1's
    const p2Card = p2Assignment
      ? getCardForChar(charId, p2Assignment, P2_CHAR_PAIRS)
      : p1Card
    const direction = getDirection(p1Card, p2Card)
    current = current.map(c =>
      c.id === charId ? moveCharacter(c, direction, blocked) : c
    )
  }

  return current
}

/** Full resolution with both players' assignments. */
export function resolveMovement(state: GameState): Character[] {
  const { characters, p1Assignment, p2Assignment, obstacles } = state
  if (!p1Assignment || !p2Assignment) return characters
  return applyAssignments(characters, p1Assignment, p2Assignment, obstacleSet(obstacles))
}

/**
 * Predictive resolution using only one player's assignment.
 * Assumes the other player makes the same choice (shows the "clean" direction).
 */
export function resolveOnePlayerMovement(
  characters: Character[],
  playerRole: 1 | 2,
  assignment: PlayerAssignment,
  obstacles: HexCoord[],
): Character[] {
  // Pass assignment as both P1 and P2 — applyAssignments will derive direction from
  // (myCard, myCard) which maps to the base direction for that card.
  const p1 = playerRole === 1 ? assignment : { pair0Card: 1 as CardOption, pair1Card: 1 as CardOption }
  const p2 = playerRole === 2 ? assignment : null
  const blocked = obstacleSet(obstacles)

  if (playerRole === 1) {
    return applyAssignments(characters, assignment, null, blocked)
  } else {
    // For P2: we need to figure out what direction P2's card produces alone.
    // Use P2_CHAR_PAIRS and treat P1 as having the same card.
    let current = [...characters]
    for (const charId of CHAR_ORDER) {
      const card = getCardForChar(charId, assignment, P2_CHAR_PAIRS)
      const direction = getDirection(card, card) // same card → base direction
      current = current.map(c =>
        c.id === charId ? moveCharacter(c, direction, blocked) : c
      )
    }
    return current
  }
}

// ── Win condition ──────────────────────────────────────────────────────────────

function adjacent(characters: Character[], a: CharId, b: CharId): boolean {
  const ca = characters.find(c => c.id === a)!
  const cb = characters.find(c => c.id === b)!
  return hexDistance(ca.q, ca.r, cb.q, cb.r) === 1
}

/**
 * P1 wins if A is adjacent to C, or D is adjacent to B.
 * P2 wins if C is adjacent to D, or B is adjacent to A.
 */
export function checkWinner(characters: Character[]): 1 | 2 | null {
  const p1Wins = adjacent(characters, 'A', 'C') || adjacent(characters, 'D', 'B')
  const p2Wins = adjacent(characters, 'C', 'D') || adjacent(characters, 'B', 'A')

  if (p1Wins) return 1
  if (p2Wins) return 2
  return null
}
