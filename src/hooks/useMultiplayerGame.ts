import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Entity, BlockTarget } from '../types';
import { generatePuzzle, P1_BLOCK_COLORS, P2_BLOCK_COLORS } from '../lib/levelGenerator';
import { applySlide, applySlideByIds } from '../lib/gameLogic';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL as string | undefined) ?? 'http://localhost:3001';

export type ConnectionStatus =
  | 'connecting'
  | 'waiting_for_partner'  // P1 is in room, waiting for P2
  | 'waiting_for_level'    // P2 joined, waiting for P1 to send state
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

// ── Pure helpers ──────────────────────────────────────────────────────────────

function isSolved(entities: Entity[], targets: BlockTarget[]): boolean {
  return targets.every(t => entities.some(e => e.id === t.blockId && e.x === t.x && e.y === t.y));
}

/** Derive the next state from a validated move. Used by both clients identically. */
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

  const movedColor  = myColors[draggedId]!;
  const newMyBoard  = applySlide(myBoard, movedColor, dirX, dirY);
  if (newMyBoard === myBoard) return prev; // blocked — no change

  const movedIds    = myBoard.filter(e => e.color === movedColor).map(e => e.id);
  const newOther    = applySlideByIds(other, movedIds, dirX, dirY);

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

  // Ref keeps the latest state accessible inside socket event handlers
  // without causing the effect to re-run.
  const stateRef = useRef<GameState | null>(null);
  useEffect(() => { stateRef.current = gameState; }, [gameState]);

  const socketRef = useRef<Socket | null>(null);

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: number; player: 1 | 2 } | null>(null);

  // ── Socket lifecycle ────────────────────────────────────────────────────────

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    // P1 generates the initial puzzle immediately so it's ready when P2 joins.
    if (playerRole === 1) {
      const state = buildGameState(generatePuzzle('medium'));
      setGameState(state);
      stateRef.current = state;
    }

    socket.on('connect', () => {
      if (playerRole === 1) {
        socket.emit('create_room', roomCode);
      } else {
        socket.emit('join_room', roomCode);
        setStatus('waiting_for_level');
      }
    });

    socket.on('connect_error', () => {
      setErrorMsg('Could not reach the server.');
      setStatus('error');
    });

    socket.on('room_created', () => setStatus('waiting_for_partner'));
    socket.on('room_joined',  () => setStatus('waiting_for_level'));

    socket.on('room_error', (msg: string) => {
      setErrorMsg(msg);
      setStatus('error');
    });

    // Server asks P1 to relay current state to the newly joined P2.
    socket.on('request_level_state', () => {
      if (playerRole === 1 && stateRef.current) {
        socket.emit('submit_level', { roomCode, state: stateRef.current });
        setStatus('playing');
      }
    });

    // Authoritative game state broadcast — received by all players on join / new level.
    socket.on('level_state', (state: GameState) => {
      setGameState(state);
      stateRef.current = state;
      setStatus('playing');
    });

    // Server-validated move — applied deterministically on every client.
    socket.on('execute_move', ({
      draggedId, dirX, dirY, playerId,
    }: { draggedId: number; dirX: number; dirY: number; playerId: 1 | 2 }) => {
      setGameState(prev => prev ? applyMoveToState(prev, playerId, draggedId, dirX, dirY) : prev);
    });

    socket.on('execute_reset', () => {
      setGameState(prev => prev ? { ...prev, p1: prev.initialP1, p2: prev.initialP2 } : prev);
    });

    socket.on('partner_disconnected', () => setStatus('disconnected'));

    return () => { socket.disconnect(); };
  }, [roomCode, playerRole]);

  // ── Input handling ──────────────────────────────────────────────────────────
  // Local input is never applied directly. A drag emits move_intent to the server;
  // the server validates and broadcasts execute_move back to all clients.

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

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      socketRef.current?.emit('move_intent', {
        roomCode, draggedId: id, dirX: dx > 0 ? 1 : -1, dirY: 0, playerId: playerRole,
      });
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      socketRef.current?.emit('move_intent', {
        roomCode, draggedId: id, dirX: 0, dirY: dy > 0 ? 1 : -1, playerId: playerRole,
      });
    }

    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  }, [dragStart, dragInfo, roomCode, playerRole]);

  const handlePointerCancel = useCallback((e: React.PointerEvent) => {
    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  }, []);

  // ── Level management (host-only for generation) ─────────────────────────────

  const resetLevel = useCallback(() => {
    socketRef.current?.emit('reset_request', roomCode);
  }, [roomCode]);

  const newLevel = useCallback((difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    if (playerRole !== 1) return; // only the host generates puzzles
    const state = buildGameState(generatePuzzle(difficulty));
    stateRef.current = state;
    socketRef.current?.emit('submit_level', { roomCode, state });
  }, [playerRole, roomCode]);

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
