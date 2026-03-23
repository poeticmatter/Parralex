import { useState, useCallback, useMemo } from 'react'
import { useHexGame } from './hooks/useHexGame'
import { HexBoard } from './components/HexBoard'
import { AssignmentPanel } from './components/AssignmentPanel'
import { Lobby } from './components/Lobby'
import type { PlayerAssignment, MovementArrow } from './types'
import { resolveOnePlayerMovement, computeMovementArrows } from './lib/hexGameLogic'

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

// ── Utility screens ───────────────────────────────────────────────────────────

function StatusScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-4">
      <p className="text-neutral-400 text-lg">{message}</p>
      <button
        onClick={() => { window.location.href = window.location.pathname }}
        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
      >
        Back to Lobby
      </button>
    </div>
  )
}

function WaitingForPartner({ roomCode }: { roomCode: string }) {
  const shareUrl = `${window.location.origin}${window.location.pathname}?room=${roomCode}`
  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-6">
      <h2 className="text-2xl font-semibold">Waiting for Player 2…</h2>
      <p className="text-neutral-400 text-sm">Share this link with your opponent:</p>
      <div className="flex gap-2 items-center">
        <code className="bg-neutral-800 px-4 py-2 rounded-lg text-neutral-200 text-sm select-all">
          {shareUrl}
        </code>
        <button
          onClick={() => navigator.clipboard.writeText(shareUrl)}
          className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm transition-colors"
        >
          Copy
        </button>
      </div>
      <p className="text-neutral-600 text-xs font-mono">Room: {roomCode}</p>
    </div>
  )
}

// ── Game view ─────────────────────────────────────────────────────────────────

function GameView({ roomCode, playerRole }: { roomCode: string; playerRole: 1 | 2 }) {
  const { gameState, status, errorMsg, waitingForPartnerConfirm, confirmAssignment } =
    useHexGame(roomCode, playerRole)

  const [draftAssignment, setDraftAssignment] = useState<PlayerAssignment | null>(null)

  const predictiveArrows = useMemo((): MovementArrow[] => {
    if (!draftAssignment || !gameState || waitingForPartnerConfirm) return []
    const after = resolveOnePlayerMovement(
      gameState.characters, playerRole, draftAssignment, gameState.obstacles,
    )
    return computeMovementArrows(gameState.characters, after)
  }, [draftAssignment, gameState, playerRole, waitingForPartnerConfirm])

  if (status === 'connecting')          return <StatusScreen message="Connecting…" />
  if (status === 'error')               return <StatusScreen message={errorMsg ?? 'Connection error.'} />
  if (status === 'disconnected')        return <StatusScreen message="Your opponent disconnected." />
  if (status === 'waiting_for_partner') return <WaitingForPartner roomCode={roomCode} />
  if (status === 'waiting_for_level')   return <StatusScreen message="Joining game…" />
  if (!gameState)                       return <StatusScreen message="Loading…" />

  const winGoal = playerRole === 1
    ? 'Get A adjacent to C, or D adjacent to B.'
    : 'Get C adjacent to D, or B adjacent to A.'

  return (
    <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center text-white gap-5 p-4 font-sans">
      {/* Header */}
      <div className="flex items-center gap-5 flex-wrap justify-center">
        <h1 className="text-2xl font-bold tracking-tight">Hex Duel</h1>
        <span className="text-neutral-500 text-sm">Round {gameState.round}</span>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${
          playerRole === 1
            ? 'bg-cyan-900/50 text-cyan-400 border-cyan-800'
            : 'bg-orange-900/50 text-orange-400 border-orange-800'
        }`}>
          Player {playerRole}
        </span>
      </div>

      <p className="text-xs text-neutral-600">{winGoal}</p>

      <HexBoard
        characters={gameState.characters}
        obstacles={gameState.obstacles}
        movementArrows={gameState.movementArrows}
        predictiveArrows={predictiveArrows}
        winner={gameState.winner}
        playerRole={playerRole}
      />

      {gameState.winner ? (
        <div className="flex flex-col items-center gap-4">
          <p className="text-lg font-semibold">
            {gameState.winner === playerRole ? '🎉 You win!' : 'Opponent wins.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm text-neutral-300 transition-colors"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="w-full max-w-lg" key={gameState.round}>
          <AssignmentPanel
            playerRole={playerRole}
            onConfirm={confirmAssignment}
            onAssignmentChange={setDraftAssignment}
            waitingForPartner={waitingForPartnerConfirm}
          />
        </div>
      )}
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [roomInfo, setRoomInfo] = useState<{ code: string; role: 1 | 2 } | null>(() => {
    const code = new URLSearchParams(window.location.search).get('room')
    return code ? { code: code.toUpperCase(), role: 2 } : null
  })

  const handleCreateGame = useCallback(() => {
    const code = generateRoomCode()
    const url = new URL(window.location.href)
    url.searchParams.set('room', code)
    history.replaceState(null, '', url.toString())
    setRoomInfo({ code, role: 1 })
  }, [])

  if (!roomInfo) return <Lobby onCreateGame={handleCreateGame} />
  return <GameView roomCode={roomInfo.code} playerRole={roomInfo.role} />
}
