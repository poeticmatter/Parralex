import { useState, useEffect, useRef } from 'react'
import type { CardOption, PlayerAssignment, CharId } from '../types'
import { P1_CHAR_PAIRS, P2_CHAR_PAIRS, CARD_LABELS } from '../lib/hexGameLogic'

const PAIR_STYLES = [
  {
    card:     'bg-cyan-950/70 border-cyan-700/60',
    label:    'text-cyan-400',
    active:   'bg-cyan-600/40 border-cyan-400 text-cyan-100',
    inactive: 'border-cyan-800 text-cyan-600 hover:border-cyan-600 hover:text-cyan-300',
  },
  {
    card:     'bg-orange-950/70 border-orange-700/60',
    label:    'text-orange-400',
    active:   'bg-orange-600/40 border-orange-400 text-orange-100',
    inactive: 'border-orange-800 text-orange-600 hover:border-orange-600 hover:text-orange-300',
  },
]

const CARD_OPTIONS: CardOption[] = [1, 2, 3]

interface PairCardProps {
  pairIndex: 0 | 1
  charPair: [CharId, CharId]
  selected: CardOption
  onChange: (card: CardOption) => void
}

function PairCard({ pairIndex, charPair, selected, onChange }: PairCardProps) {
  const styles = PAIR_STYLES[pairIndex]

  return (
    <div className={`flex flex-col gap-3 rounded-xl p-4 border flex-1 ${styles.card}`}>
      <div className={`text-xs font-semibold uppercase tracking-wider text-center ${styles.label}`}>
        {charPair[0]} + {charPair[1]}
      </div>
      <div className="flex flex-col gap-2">
        {CARD_OPTIONS.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`
              w-full py-2 px-3 rounded-lg text-sm font-semibold border-2 transition-all text-left
              ${selected === option ? styles.active : styles.inactive}
            `}
          >
            {CARD_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  )
}

interface Props {
  playerRole: 1 | 2
  onConfirm: (assignment: PlayerAssignment) => void
  onAssignmentChange: (assignment: PlayerAssignment) => void
  waitingForPartner: boolean
}

export function AssignmentPanel({ playerRole, onConfirm, onAssignmentChange, waitingForPartner }: Props) {
  const charPairs = playerRole === 1 ? P1_CHAR_PAIRS : P2_CHAR_PAIRS

  const [pair0Card, setPair0Card] = useState<CardOption>(1)
  const [pair1Card, setPair1Card] = useState<CardOption>(1)

  const onChangeRef = useRef(onAssignmentChange)
  onChangeRef.current = onAssignmentChange

  useEffect(() => {
    onChangeRef.current({ pair0Card, pair1Card })
  }, [pair0Card, pair1Card])

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
        Choose a direction card for each pair. Same card = that direction. Different cards = blended direction.
      </p>
      <div className="flex gap-3">
        <PairCard
          pairIndex={0}
          charPair={charPairs[0]}
          selected={pair0Card}
          onChange={setPair0Card}
        />
        <PairCard
          pairIndex={1}
          charPair={charPairs[1]}
          selected={pair1Card}
          onChange={setPair1Card}
        />
      </div>
      <button
        onClick={() => onConfirm({ pair0Card, pair1Card })}
        className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-xl font-bold text-white text-base transition-colors"
      >
        Confirm
      </button>
    </div>
  )
}
