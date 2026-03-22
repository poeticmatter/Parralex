import { useState, useEffect, useRef } from 'react'
import type { PlayerAssignment, DieLabel, DicePairAssignment, CharId } from '../types'
import { P1_DICE_PAIRS, P1_CHAR_PAIRS, P2_DICE_PAIRS, P2_CHAR_PAIRS } from '../lib/hexGameLogic'
import { DIRECTION_NAMES } from '../lib/hexGrid'

// Match the token colors used in HexBoard
const PAIR_STYLES = [
  {
    card:          'bg-cyan-950/70 border-cyan-700/60',
    charSelected:  'bg-cyan-600/30 border-cyan-400 text-cyan-100',
    charIdle:      'border-cyan-800 text-cyan-500 hover:border-cyan-600 hover:text-cyan-300',
    label:         'text-cyan-400',
  },
  {
    card:          'bg-orange-950/70 border-orange-700/60',
    charSelected:  'bg-orange-600/30 border-orange-400 text-orange-100',
    charIdle:      'border-orange-800 text-orange-500 hover:border-orange-600 hover:text-orange-300',
    label:         'text-orange-400',
  },
]

// ── Die display ───────────────────────────────────────────────────────────────

interface DieDisplayProps {
  label: DieLabel
  value: number
  isDirection: boolean
  onSwap: () => void
}

function DieDisplay({ label, value, isDirection, onSwap }: DieDisplayProps) {
  return (
    <button
      onClick={onSwap}
      title="Click to swap direction / distance"
      className="flex flex-col items-center gap-1 px-4 py-2 rounded-lg bg-black/20 hover:bg-black/30 border border-white/10 transition-all flex-1 cursor-pointer"
    >
      <span className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Die {label}</span>
      <span className="text-3xl font-bold text-white leading-none">{value}</span>
      <span className="text-xs text-white/50 text-center leading-tight min-h-[2em] flex items-center">
        {isDirection ? DIRECTION_NAMES[value] : `${value} steps`}
      </span>
      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
        isDirection ? 'bg-white/20 text-white/80' : 'bg-white/5 text-white/30'
      }`}>
        {isDirection ? 'Direction' : 'Distance'}
      </span>
    </button>
  )
}

// ── Pair card ─────────────────────────────────────────────────────────────────

interface PairCardProps {
  pairIndex: 0 | 1
  dicePair: [DieLabel, DieLabel]
  charPairs: [CharId, CharId][]
  assignment: DicePairAssignment
  diceValues: Record<DieLabel, number>
  onChange: (updated: DicePairAssignment) => void
}

function PairCard({ pairIndex, dicePair, charPairs, assignment, diceValues, onChange }: PairCardProps) {
  const [dieX, dieY] = dicePair
  const styles = PAIR_STYLES[pairIndex]

  const swap = () => {
    const newDir: DieLabel = assignment.directionDie === dieX ? dieY : dieX
    onChange({ ...assignment, directionDie: newDir })
  }

  const selectCharPair = (idx: 0 | 1) => {
    onChange({ ...assignment, targetCharPairIndex: idx })
  }

  return (
    <div className={`flex flex-col gap-3 rounded-xl p-4 border flex-1 ${styles.card}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider text-center ${styles.label}`}>
        Dice Pair {pairIndex + 1}
      </div>

      {/* Die displays — click either to swap direction/distance roles */}
      <div className="flex gap-2">
        <DieDisplay
          label={dieX}
          value={diceValues[dieX]}
          isDirection={assignment.directionDie === dieX}
          onSwap={swap}
        />
        <DieDisplay
          label={dieY}
          value={diceValues[dieY]}
          isDirection={assignment.directionDie === dieY}
          onSwap={swap}
        />
      </div>

      {/* Character pair target */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-white/40 text-center">Move characters:</span>
        <div className="flex gap-2">
          {([0, 1] as const).map(idx => {
            const pair = charPairs[idx]
            const isSelected = assignment.targetCharPairIndex === idx
            const s = PAIR_STYLES[idx]
            return (
              <button
                key={idx}
                onClick={() => selectCharPair(idx)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all border-2 ${
                  isSelected ? s.charSelected : s.charIdle
                }`}
              >
                {pair[0]} + {pair[1]}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Assignment panel ──────────────────────────────────────────────────────────

interface Props {
  playerRole: 1 | 2
  diceValues: Record<DieLabel, number>
  onConfirm: (assignment: PlayerAssignment) => void
  onAssignmentChange: (assignment: PlayerAssignment) => void
  waitingForPartner: boolean
}

export function AssignmentPanel({ playerRole, diceValues, onConfirm, onAssignmentChange, waitingForPartner }: Props) {
  const dicePairs = playerRole === 1 ? P1_DICE_PAIRS : P2_DICE_PAIRS
  const charPairs = playerRole === 1 ? P1_CHAR_PAIRS : P2_CHAR_PAIRS

  const [pair0, setPair0] = useState<DicePairAssignment>({
    targetCharPairIndex: 0,
    directionDie: dicePairs[0][0],
  })
  const [pair1, setPair1] = useState<DicePairAssignment>({
    targetCharPairIndex: 1,
    directionDie: dicePairs[1][0],
  })

  // Keep a stable ref to onAssignmentChange so the effect below doesn't need it as a dep
  const onChangeRef = useRef(onAssignmentChange)
  onChangeRef.current = onAssignmentChange

  // Notify parent of draft assignment whenever it changes (for predictive arrows)
  useEffect(() => {
    onChangeRef.current({ pair0, pair1 })
  }, [pair0, pair1])

  // Enforce that the two dice pairs always target different char pairs
  const handlePair0Change = (updated: DicePairAssignment) => {
    const newPair1: DicePairAssignment = { ...pair1, targetCharPairIndex: updated.targetCharPairIndex === 0 ? 1 : 0 }
    setPair0(updated)
    setPair1(newPair1)
  }

  const handlePair1Change = (updated: DicePairAssignment) => {
    const newPair0: DicePairAssignment = { ...pair0, targetCharPairIndex: updated.targetCharPairIndex === 0 ? 1 : 0 }
    setPair1(updated)
    setPair0(newPair0)
  }

  if (waitingForPartner) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-8 px-4 bg-neutral-800/40 rounded-xl border border-neutral-700">
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        <p className="text-neutral-400 text-sm">Waiting for opponent to confirm…</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-center text-xs text-neutral-500">
        Click either die to swap direction / distance. Choose which characters each pair moves.
      </p>
      <div className="flex gap-3">
        <PairCard
          pairIndex={0}
          dicePair={dicePairs[0]}
          charPairs={charPairs}
          assignment={pair0}
          diceValues={diceValues}
          onChange={handlePair0Change}
        />
        <PairCard
          pairIndex={1}
          dicePair={dicePairs[1]}
          charPairs={charPairs}
          assignment={pair1}
          diceValues={diceValues}
          onChange={handlePair1Change}
        />
      </div>
      <button
        onClick={() => onConfirm({ pair0, pair1 })}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl font-bold text-white text-base transition-colors"
      >
        Confirm Assignment
      </button>
    </div>
  )
}
