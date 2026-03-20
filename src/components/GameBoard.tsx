import React from 'react';
import { Entity, BlockTarget, Color } from '../types';
import { GRID_SIZE, CELL_SIZE, GAP } from '../constants';
import { EntityTile } from './Entity';
import { P1_BLOCK_COLORS, P2_BLOCK_COLORS } from '../lib/levelGenerator';

interface Props {
  player: 1 | 2;
  entities: Entity[];
  targets: BlockTarget[];
  isSolved: boolean;
  onPointerDown: (e: React.PointerEvent, id: number, player: 1 | 2) => void;
  onPointerUp: (e: React.PointerEvent, id: number, player: 1 | 2) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

function targetClass(color: Color): string {
  switch (color) {
    case 'red':    return 'border-red-500/60 bg-red-500/15';
    case 'blue':   return 'border-blue-500/60 bg-blue-500/15';
    case 'green':  return 'border-green-500/60 bg-green-500/15';
    case 'yellow': return 'border-yellow-400/60 bg-yellow-400/15';
    case 'purple': return 'border-purple-500/60 bg-purple-500/15';
    case 'orange': return 'border-orange-500/60 bg-orange-500/15';
  }
}

const boardSize = GRID_SIZE * CELL_SIZE + (GRID_SIZE + 1) * GAP;

export function GameBoard({ player, entities, targets, isSolved, onPointerDown, onPointerUp, onPointerCancel }: Props) {
  const blockColors = player === 1 ? P1_BLOCK_COLORS : P2_BLOCK_COLORS;

  return (
    <div
      className="relative bg-neutral-800 p-2 rounded-xl shadow-2xl"
      style={{ width: boardSize, height: boardSize }}
    >
      {/* Grid cells */}
      {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => {
        const x = i % GRID_SIZE;
        const y = Math.floor(i / GRID_SIZE);
        return (
          <div
            key={i}
            className="absolute bg-neutral-700/50 rounded-lg"
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: GAP + x * (CELL_SIZE + GAP),
              top: GAP + y * (CELL_SIZE + GAP),
            }}
          />
        );
      })}

      {/* Targets */}
      {targets.map(target => {
        const color = blockColors[target.blockId]!;
        return (
          <div
            key={`target-${target.blockId}`}
            className={`absolute rounded-lg border-4 border-dashed ${targetClass(color)}`}
            style={{
              width: CELL_SIZE,
              height: CELL_SIZE,
              left: GAP + target.x * (CELL_SIZE + GAP),
              top: GAP + target.y * (CELL_SIZE + GAP),
            }}
          />
        );
      })}

      {/* Solved overlay */}
      {isSolved && (
        <div className="absolute inset-0 rounded-xl bg-green-500/20 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-green-300 text-2xl font-bold tracking-widest drop-shadow">SOLVED</span>
        </div>
      )}

      {/* Entities */}
      {entities.map(entity => (
        <React.Fragment key={entity.id}>
          <EntityTile
            entity={entity}
            onPointerDown={(e, id) => onPointerDown(e, id, player)}
            onPointerUp={(e, id) => onPointerUp(e, id, player)}
            onPointerCancel={onPointerCancel}
          />
        </React.Fragment>
      ))}
    </div>
  );
}
