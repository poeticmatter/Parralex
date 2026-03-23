export type CharId = 'A' | 'B' | 'C' | 'D'

/** One of three movement cards a player can assign to a pair. */
export type CardOption = 1 | 2 | 3

export interface HexCoord {
  q: number
  r: number
}

export interface Character {
  id: CharId
  q: number
  r: number
}

export interface PlayerAssignment {
  /** Card assigned to this player's pair 0 */
  pair0Card: CardOption
  /** Card assigned to this player's pair 1 */
  pair1Card: CardOption
}

export interface MovementArrow {
  charId: CharId
  fromQ: number
  fromR: number
  toQ: number
  toR: number
}

export interface GameState {
  characters: Character[]
  phase: 'assignment'
  p1Assignment: PlayerAssignment | null
  p2Assignment: PlayerAssignment | null
  round: number
  winner: 1 | 2 | null
  movementArrows: MovementArrow[]
  obstacles: HexCoord[]
}

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'
  | 'waiting_for_level'
  | 'playing'
  | 'disconnected'
  | 'error'
