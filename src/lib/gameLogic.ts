import { Color, Entity } from '../types';
import { GRID_SIZE } from '../constants';

/** Slide all entities of `color` one step in (dirX, dirY). Returns same reference if blocked (no-op). */
export function applySlide(
  entities: Entity[],
  color: Color,
  dirX: number,
  dirY: number,
): Entity[] {
  const group = entities.filter(e => e.color === color);
  if (group.length === 0) return entities;

  for (const b of group) {
    const nx = b.x + dirX;
    const ny = b.y + dirY;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return entities;
    const blocker = entities.find(ob => ob.color !== color && ob.x === nx && ob.y === ny);
    if (blocker) return entities;
  }

  return entities.map(e =>
    e.color === color ? { ...e, x: e.x + dirX, y: e.y + dirY } : e,
  );
}

/**
 * Slide a specific set of blocks by ID one step in (dirX, dirY).
 * Used for cross-board mirroring — moves the same IDs without triggering
 * the other board's color-pair rules. Returns same reference if blocked.
 */
export function applySlideByIds(
  entities: Entity[],
  ids: number[],
  dirX: number,
  dirY: number,
): Entity[] {
  const idSet = new Set(ids);
  const group = entities.filter(e => idSet.has(e.id));
  if (group.length === 0) return entities;

  for (const b of group) {
    const nx = b.x + dirX;
    const ny = b.y + dirY;
    if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) return entities;
    const blocker = entities.find(ob => !idSet.has(ob.id) && ob.x === nx && ob.y === ny);
    if (blocker) return entities;
  }

  return entities.map(e =>
    idSet.has(e.id) ? { ...e, x: e.x + dirX, y: e.y + dirY } : e,
  );
}
