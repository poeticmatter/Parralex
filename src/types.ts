export type CharId = 'A' | 'B' | 'C' | 'D'
export type DieLabel = 'A' | 'B' | 'C' | 'D'

export interface HexCoord {
  q: number
  r: number
}

export interface Character {
  id: CharId
  q: number
  r: number
}

export interface DicePairAssignment {
  /** Which of the player's 2 character pairs does this dice pair target? */
  targetCharPairIndex: 0 | 1
  /** Which die in this pair is the direction die (other is distance) */
  directionDie: DieLabel
}

export interface PlayerAssignment {
  pair0: DicePairAssignment
  pair1: DicePairAssignment
}

export type GamePhase = 'assignment'

export interface MovementArrow {
  charId: CharId
  fromQ: number
  fromR: number
  toQ: number
  toR: number
}

export interface GameState {
  characters: Character[]
  diceValues: Record<DieLabel, number>
  phase: GamePhase
  /** P1's confirmed assignment this round (null until confirmed) */
  p1Assignment: PlayerAssignment | null
  p2Assignment: PlayerAssignment | null
  round: number
  winner: 1 | 2 | null
  /** Arrows showing movement from the previous round; cleared on next resolution */
  movementArrows: MovementArrow[]
  /** Impassable hexes; generated once at game start and never changed */
  obstacles: HexCoord[]
}

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'
  | 'waiting_for_level'
  | 'playing'
  | 'disconnected'
  | 'error'
