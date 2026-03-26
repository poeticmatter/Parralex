export interface HexCoord {
  q: number
  r: number
}

export type Role = 'chaser' | 'evader'

export type PredictionQuality = 'none' | 'partial' | 'full'

export interface GameSettings {
  gridType: 'hex' | 'square'
  moveSteps: 1 | 2
  predictionTarget: 'direction' | 'destination'
  predictionOutcome: 'symmetric' | 'asymmetric'
}

export const DEFAULT_SETTINGS: GameSettings = {
  gridType: 'hex',
  moveSteps: 2,
  predictionTarget: 'direction',
  predictionOutcome: 'symmetric',
}

/** A submitted plan for one turn. */
export interface TurnPlan {
  moveStep1: HexCoord
  moveStep2?: HexCoord      // absent in 1-step mode
  predictStep1: HexCoord
  predictStep2?: HexCoord   // absent in 1-step mode
  bonusMove?: HexCoord      // evader only, asymmetric mode; executed only if prediction hit
}

export interface ResolutionSummary {
  chaserPredQuality: PredictionQuality
  evaderPredQuality: PredictionQuality
  chaserCancelledSteps: [boolean, boolean]
  evaderCancelledSteps: [boolean, boolean]
  evaderBonusUsed?: boolean  // asymmetric mode only
}

export interface GameState {
  chaserPos: HexCoord
  evaderPos: HexCoord
  prevChaserPath: HexCoord[] | null  // positions visited each step (not including start)
  prevEvaderPath: HexCoord[] | null
  phase: 'planning'
  turn: number
  winner: Role | null
  obstacles: HexCoord[]
  p1Plan: TurnPlan | null   // p1 = chaser
  p2Plan: TurnPlan | null   // p2 = evader
  lastResolution: ResolutionSummary | null
  settings: GameSettings
}

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'
  | 'waiting_for_level'
  | 'playing'
  | 'disconnected'
  | 'error'
