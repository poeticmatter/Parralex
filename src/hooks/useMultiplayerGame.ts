import React, { useState, useEffect, useRef, useCallback } from 'react';
import Peer, { DataConnection } from 'peerjs';
import { Entity, BlockTarget } from '../types';
import { generatePuzzle, P1_BLOCK_COLORS, P2_BLOCK_COLORS } from '../lib/levelGenerator';
import { applySlide, applySlideByIds } from '../lib/gameLogic';

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'  // P1 peer is open, waiting for P2 to connect
  | 'waiting_for_level'    // P2 connected, waiting for P1 to send state
  | 'playing'
  | 'disconnected'
  | 'error';

interface GameState {
  p1: Entity[];
  p2: Entity[];
  initialP1: Entity[];
  initialP2: Entity[];
  targets: BlockTarget[];
}

type PeerMessage =
  | { type: 'LEVEL_STATE'; state: GameState }
  | { type: 'EXECUTE_MOVE'; draggedId: number; dirX: number; dirY: number; playerId: 1 | 2 }
  | { type: 'MOVE_INTENT'; draggedId: number; dirX: number; dirY: number }
  | { type: 'RESET_REQUEST' }
  | { type: 'EXECUTE_RESET' };

// ── Pure helpers ──────────────────────────────────────────────────────────────

function isSolved(entities: Entity[], targets: BlockTarget[]): boolean {
  return targets.every(t => entities.some(e => e.id === t.blockId && e.x === t.x && e.y === t.y));
}

/** Derive the next state from a validated move. Used by both peers identically. */
function applyMoveToState(
  prev: GameState,
  playerId: 1 | 2,
  draggedId: number,
  dirX: number,
  dirY: number,
): GameState {
  const myColors = playerId === 1 ? P1_BLOCK_COLORS : P2_BLOCK_COLORS;
  const myBoard  = playerId === 1 ? prev.p1 : prev.p2;
  const other    = playerId === 1 ? prev.p2 : prev.p1;

  const movedColor = myColors[draggedId]!;
  const newMyBoard = applySlide(myBoard, movedColor, dirX, dirY);
  if (newMyBoard === myBoard) return prev; // blocked — no change

  const movedIds = myBoard.filter(e => e.color === movedColor).map(e => e.id);
  const newOther = applySlideByIds(other, movedIds, dirX, dirY);

  return playerId === 1
    ? { ...prev, p1: newMyBoard, p2: newOther }
    : { ...prev, p2: newMyBoard, p1: newOther };
}

function buildGameState(puzzle: ReturnType<typeof generatePuzzle>): GameState {
  return {
    p1: puzzle.p1,
    p2: puzzle.p2,
    targets: puzzle.targets,
    initialP1: puzzle.p1.map(e => ({ ...e })),
    initialP2: puzzle.p2.map(e => ({ ...e })),
  };
}

function releaseCapture(e: React.PointerEvent) {
  try {
    if ((e.target as HTMLElement).hasPointerCapture(e.pointerId))
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {}
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMultiplayerGame(roomCode: string, playerRole: 1 | 2) {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Ref keeps the latest state accessible inside peer event handlers
  // without causing the effect to re-run.
  const stateRef = useRef<GameState | null>(null);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const connRef = useRef<DataConnection | null>(null);

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: number; player: 1 | 2 } | null>(null);

  // ── PeerJS lifecycle ──────────────────────────────────────────────────────

  useEffect(() => {
    const peer = playerRole === 1
      ? new Peer(`coupled-colors-${roomCode}`)
      : new Peer();

    const setDisconnected = () => setStatus('disconnected');
    const setError = (msg: string) => { setErrorMsg(msg); setStatus('error'); };

    if (playerRole === 1) {
      // P1 (host): generates the initial puzzle and waits for P2 to connect.
      const initialState = buildGameState(generatePuzzle('medium'));
      setGameState(initialState);
      stateRef.current = initialState;

      peer.on('open', () => setStatus('waiting_for_partner'));

      peer.on('connection', (conn: DataConnection) => {
        connRef.current = conn;

        conn.on('open', () => {
          // Send current state to newly connected P2.
          const state = stateRef.current;
          if (state) conn.send({ type: 'LEVEL_STATE', state } as PeerMessage);
          setStatus('playing');
        });

        conn.on('data', (raw: unknown) => {
          const msg = raw as PeerMessage;

          if (msg.type === 'MOVE_INTENT') {
            // P1 applies P2's move as authority, then relays EXECUTE_MOVE.
            const current = stateRef.current;
            if (!current) return;
            const next = applyMoveToState(current, 2, msg.draggedId, msg.dirX, msg.dirY);
            if (next === current) return;
            stateRef.current = next;
            setGameState(next);
            conn.send({
              type: 'EXECUTE_MOVE',
              draggedId: msg.draggedId, dirX: msg.dirX, dirY: msg.dirY, playerId: 2,
            } as PeerMessage);

          } else if (msg.type === 'RESET_REQUEST') {
            const current = stateRef.current;
            if (!current) return;
            const next = { ...current, p1: current.initialP1, p2: current.initialP2 };
            stateRef.current = next;
            setGameState(next);
            conn.send({ type: 'EXECUTE_RESET' } as PeerMessage);
          }
        });

        conn.on('close', setDisconnected);
        conn.on('error', setDisconnected);
      });

      peer.on('error', (err: Error & { type: string }) => {
        if (err.type === 'unavailable-id') {
          setError('Room code already in use. Please try a different code.');
        } else {
          setError(err.message || 'Connection error.');
        }
      });

    } else {
      // P2 (client): connects to P1's named peer, then waits for the level state.
      peer.on('open', () => {
        const conn = peer.connect(`coupled-colors-${roomCode}`, { reliable: true });
        connRef.current = conn;
        setStatus('waiting_for_level');

        conn.on('data', (raw: unknown) => {
          const msg = raw as PeerMessage;

          if (msg.type === 'LEVEL_STATE') {
            stateRef.current = msg.state;
            setGameState(msg.state);
            setStatus('playing');

          } else if (msg.type === 'EXECUTE_MOVE') {
            // P2 only updates state once P1 has validated and relayed the move.
            const current = stateRef.current;
            if (!current) return;
            const next = applyMoveToState(current, msg.playerId, msg.draggedId, msg.dirX, msg.dirY);
            if (next !== current) {
              stateRef.current = next;
              setGameState(next);
            }

          } else if (msg.type === 'EXECUTE_RESET') {
            const current = stateRef.current;
            if (!current) return;
            const next = { ...current, p1: current.initialP1, p2: current.initialP2 };
            stateRef.current = next;
            setGameState(next);
          }
        });

        conn.on('close', setDisconnected);
        conn.on('error', setDisconnected);
      });

      peer.on('error', (err: Error & { type: string }) => {
        if (err.type === 'peer-unavailable') {
          setError('Room not found. Check the room code and try again.');
        } else {
          setError(err.message || 'Connection error.');
        }
      });
    }

    return () => {
      connRef.current?.close();
      peer.destroy();
    };
  }, [roomCode, playerRole]);

  // ── Input handling ──────────────────────────────────────────────────────────
  // P1 applies moves immediately (host authority) and sends EXECUTE_MOVE to P2.
  // P2 sends MOVE_INTENT to P1 and only updates state when EXECUTE_MOVE is received.

  const handlePointerDown = useCallback((e: React.PointerEvent, id: number, boardPlayer: 1 | 2) => {
    if (boardPlayer !== playerRole) return; // each player only controls their own board
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragInfo({ id, player: boardPlayer });
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  }, [playerRole]);

  const handlePointerUp = useCallback((e: React.PointerEvent, id: number, boardPlayer: 1 | 2) => {
    if (!dragStart || !dragInfo || dragInfo.id !== id || dragInfo.player !== boardPlayer) {
      releaseCapture(e);
      return;
    }

    const dx  = e.clientX - dragStart.x;
    const dy  = e.clientY - dragStart.y;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    let dirX = 0, dirY = 0;
    if      (adx > ady && adx > 10) dirX = dx > 0 ? 1 : -1;
    else if (ady > adx && ady > 10) dirY = dy > 0 ? 1 : -1;

    if (dirX !== 0 || dirY !== 0) {
      if (playerRole === 1) {
        const current = stateRef.current;
        if (current) {
          const next = applyMoveToState(current, 1, id, dirX, dirY);
          if (next !== current) {
            stateRef.current = next;
            setGameState(next);
            connRef.current?.send({
              type: 'EXECUTE_MOVE', draggedId: id, dirX, dirY, playerId: 1,
            } as PeerMessage);
          }
        }
      } else {
        // P2: send intent to host; state updates only upon receiving EXECUTE_MOVE.
        connRef.current?.send({ type: 'MOVE_INTENT', draggedId: id, dirX, dirY } as PeerMessage);
      }
    }

    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  }, [dragStart, dragInfo, playerRole]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  }, []);

  // ── Level management (host-only for generation) ─────────────────────────────

  const resetLevel = useCallback(() => {
    if (playerRole === 1) {
      const current = stateRef.current;
      if (!current) return;
      const next = { ...current, p1: current.initialP1, p2: current.initialP2 };
      stateRef.current = next;
      setGameState(next);
      connRef.current?.send({ type: 'EXECUTE_RESET' } as PeerMessage);
    } else {
      connRef.current?.send({ type: 'RESET_REQUEST' } as PeerMessage);
    }
  }, [playerRole]);

  const newLevel = useCallback((difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    if (playerRole !== 1) return; // only the host generates puzzles
    const state = buildGameState(generatePuzzle(difficulty));
    stateRef.current = state;
    setGameState(state);
    connRef.current?.send({ type: 'LEVEL_STATE', state } as PeerMessage);
  }, [playerRole]);

  // ── Public API ──────────────────────────────────────────────────────────────

  return {
    p1Entities: gameState?.p1 ?? [],
    p2Entities: gameState?.p2 ?? [],
    targets:    gameState?.targets ?? [],
    isWin:      gameState ? isSolved(gameState.p1, gameState.targets) : false,
    status,
    errorMsg,
    playerRole,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetLevel,
    newLevel,
  };
}
