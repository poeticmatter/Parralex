export type Color = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';
export type EntityType = 'button' | 'block';

export interface Entity {
  id: number;
  type: EntityType;
  x: number;
  y: number;
  color?: Color;
}

export interface Target {
  id: number;
  x: number;
  y: number;
  color: Color;
}

/** Target for the 2-player game — color is determined per-board from blockId. */
export interface BlockTarget {
  blockId: number; // 1–6
  x: number;
  y: number;
}

export interface LevelData {
  entities: Entity[];
  initialEntities: Entity[];
  targets: Target[];
}
