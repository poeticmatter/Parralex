import React from 'react';
import { motion } from 'motion/react';
import { Entity as EntityData } from '../types';
import { CELL_SIZE, GAP } from '../constants';

interface Props {
  entity: EntityData;
  onPointerDown: (e: React.PointerEvent, id: number) => void;
  onPointerUp: (e: React.PointerEvent, id: number) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

function entityClass(entity: EntityData): string {
  switch (entity.color) {
    case 'red':    return 'bg-red-500 shadow-red-500/50 cursor-grab active:cursor-grabbing';
    case 'blue':   return 'bg-blue-500 shadow-blue-500/50 cursor-grab active:cursor-grabbing';
    case 'green':  return 'bg-green-500 shadow-green-500/50 cursor-grab active:cursor-grabbing';
    case 'yellow': return 'bg-yellow-400 shadow-yellow-400/50 cursor-grab active:cursor-grabbing';
    case 'purple': return 'bg-purple-500 shadow-purple-500/50 cursor-grab active:cursor-grabbing';
    case 'orange': return 'bg-orange-500 shadow-orange-500/50 cursor-grab active:cursor-grabbing';
    default:       return 'bg-gray-500 cursor-grab active:cursor-grabbing';
  }
}

export function EntityTile({ entity, onPointerDown, onPointerUp, onPointerCancel }: Props) {
  return (
    <motion.div
      layout
      initial={false}
      animate={{
        x: GAP + entity.x * (CELL_SIZE + GAP),
        y: GAP + entity.y * (CELL_SIZE + GAP),
      }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`absolute rounded-lg shadow-lg touch-none select-none ${entityClass(entity)}`}
      style={{ width: CELL_SIZE, height: CELL_SIZE }}
      onPointerDown={e => onPointerDown(e, entity.id)}
      onPointerUp={e => onPointerUp(e, entity.id)}
      onPointerCancel={onPointerCancel}
    >
      <div className="w-full h-full rounded-lg border-t-2 border-white/20" />
    </motion.div>
  );
}
