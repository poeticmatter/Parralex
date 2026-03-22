import { useState, useEffect, useRef, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'
import type { GameState, PlayerAssignment, ConnectionStatus } from '../types'
import { rollAllDice, getInitialCharacters, generateObstacles, resolveMovement, checkWinner, computeMovementArrows } from '../lib/hexGameLogic'

type PeerMessage =
  | { type: 'GAME_STATE'; state: GameState }
  | { type: 'CONFIRM_ASSIGNMENT'; assignment: PlayerAssignment }

function buildInitialState(): GameState {
  return {
    characters: getInitialCharacters(),
    diceValues: rollAllDice(),
    phase: 'assignment',
    p1Assignment: null,
    p2Assignment: null,
    round: 1,
    winner: null,
    movementArrows: [],
    obstacles: generateObstacles(),
  }
}

export function useHexGame(roomCode: string, playerRole: 1 | 2) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [waitingForPartnerConfirm, setWaitingForPartnerConfirm] = useState(false)

  // All mutable cross-render state in a single ref so peer event handlers
  // always see current values without needing to re-run the effect.
  const live = useRef({
    state: null as GameState | null,
    conn: null as DataConnection | null,
    pendingP2Assignment: null as PlayerAssignment | null,
  })

  // Keep live.state in sync with React state
  const syncState = useCallback((next: GameState) => {
    live.current.state = next
    setGameState(next)
  }, [])

  // Compute next round state, broadcast to partner (P1 only), reset local UI
  const resolveRound = useCallback((p1a: PlayerAssignment, p2a: PlayerAssignment) => {
    const current = live.current.state
    if (!current) return

    const withAssignments: GameState = { ...current, p1Assignment: p1a, p2Assignment: p2a }
    const newChars = resolveMovement(withAssignments)
    const winner = checkWinner(newChars)
    const nextState: GameState = {
      characters: newChars,
      diceValues: rollAllDice(),
      phase: 'assignment',
      p1Assignment: null,
      p2Assignment: null,
      round: current.round + 1,
      winner,
      movementArrows: computeMovementArrows(current.characters, newChars),
      obstacles: current.obstacles,
    }

    syncState(nextState)
    live.current.pendingP2Assignment = null
    setWaitingForPartnerConfirm(false)
    live.current.conn?.send({ type: 'GAME_STATE', state: nextState } as PeerMessage)
  }, [syncState])

  useEffect(() => {
    const peer = playerRole === 1
      ? new Peer(`hex-duel-${roomCode}`)
      : new Peer()

    const onDisconnect = () => setStatus('disconnected')
    const onError = (msg: string) => { setErrorMsg(msg); setStatus('error') }

    if (playerRole === 1) {
      const initial = buildInitialState()
      syncState(initial)

      peer.on('open', () => setStatus('waiting_for_partner'))

      peer.on('connection', (conn: DataConnection) => {
        live.current.conn = conn

        conn.on('open', () => {
          const state = live.current.state
          if (state) conn.send({ type: 'GAME_STATE', state } as PeerMessage)
          setStatus('playing')
        })

        conn.on('data', (raw: unknown) => {
          const msg = raw as PeerMessage
          if (msg.type !== 'CONFIRM_ASSIGNMENT') return

          live.current.pendingP2Assignment = msg.assignment
          const current = live.current.state
          // If P1 already confirmed, resolve immediately; otherwise wait
          if (current?.p1Assignment) {
            resolveRound(current.p1Assignment, msg.assignment)
          }
        })

        conn.on('close', onDisconnect)
        conn.on('error', onDisconnect)
      })

      peer.on('error', (err: Error & { type: string }) => {
        if (err.type === 'unavailable-id') onError('Room code already in use.')
        else onError(err.message || 'Connection error.')
      })

    } else {
      peer.on('open', () => {
        const conn = peer.connect(`hex-duel-${roomCode}`, { reliable: true })
        live.current.conn = conn
        setStatus('waiting_for_level')

        conn.on('data', (raw: unknown) => {
          const msg = raw as PeerMessage
          if (msg.type === 'GAME_STATE') {
            syncState(msg.state)
            setWaitingForPartnerConfirm(false)
            setStatus('playing')
          }
        })

        conn.on('close', onDisconnect)
        conn.on('error', onDisconnect)
      })

      peer.on('error', (err: Error & { type: string }) => {
        if (err.type === 'peer-unavailable') onError('Room not found. Check the room code.')
        else onError(err.message || 'Connection error.')
      })
    }

    return () => {
      live.current.conn?.close()
      peer.destroy()
    }
  }, [roomCode, playerRole, syncState, resolveRound])

  const confirmAssignment = useCallback((assignment: PlayerAssignment) => {
    if (playerRole === 1) {
      const current = live.current.state
      if (!current) return

      const p2Assignment = live.current.pendingP2Assignment
      if (p2Assignment) {
        // P2 already confirmed — resolve immediately
        resolveRound(assignment, p2Assignment)
      } else {
        // Store P1's assignment in state and wait for P2
        const updated: GameState = { ...current, p1Assignment: assignment }
        syncState(updated)
        setWaitingForPartnerConfirm(true)
      }
    } else {
      live.current.conn?.send({ type: 'CONFIRM_ASSIGNMENT', assignment } as PeerMessage)
      setWaitingForPartnerConfirm(true)
    }
  }, [playerRole, syncState, resolveRound])

  return {
    gameState,
    status,
    errorMsg,
    waitingForPartnerConfirm,
    confirmAssignment,
  }
}
