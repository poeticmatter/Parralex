import React, { useState } from 'react';
import { Entity, BlockTarget } from '../types';
import { generatePuzzle, P1_BLOCK_COLORS, P2_BLOCK_COLORS } from '../lib/levelGenerator';
import { applySlide, applySlideByIds } from '../lib/gameLogic';

interface TwoPlayerState {
  p1: Entity[];
  p2: Entity[];
  initialP1: Entity[];
  initialP2: Entity[];
  targets: BlockTarget[];
}

function isSolved(entities: Entity[], targets: BlockTarget[]): boolean {
  return targets.every(t => entities.some(e => e.id === t.blockId && e.x === t.x && e.y === t.y));
}

function releaseCapture(e: React.PointerEvent) {
  try {
    if ((e.target as HTMLElement).hasPointerCapture(e.pointerId))
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  } catch {}
}

export function useGame() {
  const [state, setState] = useState<TwoPlayerState>(() => {
    const { p1, p2, targets } = generatePuzzle('medium');
    return { p1, p2, initialP1: p1.map(e => ({ ...e })), initialP2: p2.map(e => ({ ...e })), targets };
  });

  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: number; player: 1 | 2 } | null>(null);

  // Both boards always share identical positions, so one win check covers both.
  const isWin = isSolved(state.p1, state.targets);

  function applyMove(player: 1 | 2, draggedId: number, dirX: number, dirY: number) {
    setState(prev => {
      const myColors = player === 1 ? P1_BLOCK_COLORS : P2_BLOCK_COLORS;
      const myBoard = player === 1 ? prev.p1 : prev.p2;
      const otherBoard = player === 1 ? prev.p2 : prev.p1;

      const movedColor = myColors[draggedId]!;
      const newMyBoard = applySlide(myBoard, movedColor, dirX, dirY);
      if (newMyBoard === myBoard) return prev;

      const movedIds = myBoard.filter(e => e.color === movedColor).map(e => e.id);
      const newOtherBoard = applySlideByIds(otherBoard, movedIds, dirX, dirY);

      return player === 1
        ? { ...prev, p1: newMyBoard, p2: newOtherBoard }
        : { ...prev, p2: newMyBoard, p1: newOtherBoard };
    });
  }

  const handlePointerDown = (e: React.PointerEvent, id: number, player: 1 | 2) => {
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragInfo({ id, player });
    try { (e.target as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  };

  const handlePointerUp = (e: React.PointerEvent, id: number, player: 1 | 2) => {
    if (!dragStart || !dragInfo || dragInfo.id !== id || dragInfo.player !== player) {
      releaseCapture(e);
      return;
    }

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      applyMove(player, id, dx > 0 ? 1 : -1, 0);
    } else if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      applyMove(player, id, 0, dy > 0 ? 1 : -1);
    }

    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setDragStart(null);
    setDragInfo(null);
    releaseCapture(e);
  };

  const resetLevel = () =>
    setState(prev => ({ ...prev, p1: prev.initialP1, p2: prev.initialP2 }));

  const newLevel = (difficulty: 'easy' | 'medium' | 'hard' = 'medium') => {
    const { p1, p2, targets } = generatePuzzle(difficulty);
    setState({ p1, p2, initialP1: p1.map(e => ({ ...e })), initialP2: p2.map(e => ({ ...e })), targets });
  };

  return {
    p1Entities: state.p1,
    p2Entities: state.p2,
    targets: state.targets,
    isWin,
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    resetLevel,
    newLevel,
  };
}
