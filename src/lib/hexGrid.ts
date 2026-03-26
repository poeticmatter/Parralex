import type { HexCoord } from '../types'

/** Radius of the hex-shaped board in hex steps from center. */
export const HEX_RADIUS = 4

/** Half-width of the square board (spans -SQUARE_RADIUS to +SQUARE_RADIUS on each axis). */
export const SQUARE_RADIUS = 4

/**
 * Axial distance between two hexes.
 * Uses the cube-coordinate formula: (|Δq| + |Δr| + |Δ(q+r)|) / 2.
 */
export function hexDistance(aq: number, ar: number, bq: number, br: number): number {
  return (Math.abs(aq - bq) + Math.abs(ar - br) + Math.abs((aq + ar) - (bq + br))) / 2
}

/** Manhattan distance between two square-grid cells. */
export function squareDistance(aq: number, ar: number, bq: number, br: number): number {
  return Math.abs(aq - bq) + Math.abs(ar - br)
}

/** Distance between two cells using the appropriate metric for the given grid type. */
export function cellDistance(
  aq: number, ar: number, bq: number, br: number,
  gridType: 'hex' | 'square',
): number {
  return gridType === 'square'
    ? squareDistance(aq, ar, bq, br)
    : hexDistance(aq, ar, bq, br)
}

/** True if (q, r) is within the playable hex-shaped board. */
export function isOnBoard(q: number, r: number): boolean {
  return hexDistance(0, 0, q, r) <= HEX_RADIUS
}

/** True if (q, r) is within the square board. */
export function isOnSquareBoard(q: number, r: number): boolean {
  return Math.abs(q) <= SQUARE_RADIUS && Math.abs(r) <= SQUARE_RADIUS
}

/** True if (q, r) is on the board for the given grid type. */
export function isOnAnyBoard(q: number, r: number, gridType: 'hex' | 'square'): boolean {
  return gridType === 'square' ? isOnSquareBoard(q, r) : isOnBoard(q, r)
}

/** All hexes on the hex board, in row-major order. */
export function getAllHexes(): HexCoord[] {
  const hexes: HexCoord[] = []
  for (let q = -HEX_RADIUS; q <= HEX_RADIUS; q++) {
    const rMin = Math.max(-HEX_RADIUS, -q - HEX_RADIUS)
    const rMax = Math.min(HEX_RADIUS, -q + HEX_RADIUS)
    for (let r = rMin; r <= rMax; r++) {
      hexes.push({ q, r })
    }
  }
  return hexes
}

/** All cells on the square board, in row-major order. */
export function getAllSquares(): HexCoord[] {
  const cells: HexCoord[] = []
  for (let r = -SQUARE_RADIUS; r <= SQUARE_RADIUS; r++) {
    for (let q = -SQUARE_RADIUS; q <= SQUARE_RADIUS; q++) {
      cells.push({ q, r })
    }
  }
  return cells
}

/** All cells for the given grid type. */
export function getAllCells(gridType: 'hex' | 'square'): HexCoord[] {
  return gridType === 'square' ? getAllSquares() : getAllHexes()
}

/**
 * The 6 axial direction vectors for flat-top hexagons, clockwise from up.
 * 1=up, 2=upper-right, 3=lower-right, 4=down, 5=lower-left, 6=upper-left.
 */
export const HEX_DIRECTIONS: Record<number, { dq: number; dr: number }> = {
  1: { dq: 0,  dr: -1 },
  2: { dq: 1,  dr: -1 },
  3: { dq: 1,  dr:  0 },
  4: { dq: 0,  dr:  1 },
  5: { dq: -1, dr:  1 },
  6: { dq: -1, dr:  0 },
}

/** The 4 cardinal direction vectors for a square grid. 1=up, 2=right, 3=down, 4=left. */
export const SQUARE_DIRECTIONS: Record<number, { dq: number; dr: number }> = {
  1: { dq:  0, dr: -1 },
  2: { dq:  1, dr:  0 },
  3: { dq:  0, dr:  1 },
  4: { dq: -1, dr:  0 },
}

/** Returns the direction map for the given grid type. */
export function getDirections(gridType: 'hex' | 'square'): Record<number, { dq: number; dr: number }> {
  return gridType === 'square' ? SQUARE_DIRECTIONS : HEX_DIRECTIONS
}

/**
 * Pixel center of hex (q, r) relative to board center, for flat-top hexagons.
 * size = distance from center to any vertex.
 */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (3 / 2) * q,
    y: size * Math.sqrt(3) * (r + q / 2),
  }
}

/** Pixel center of square cell (q, r) relative to board center. size = cell width. */
export function squareToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return { x: size * q, y: size * r }
}

/** SVG polygon points string for a flat-top hexagon centered at (cx, cy). */
export function hexPolygonPoints(cx: number, cy: number, size: number): string {
  const h = (Math.sqrt(3) / 2) * size
  return [
    [cx + size,     cy    ],
    [cx + size / 2, cy + h],
    [cx - size / 2, cy + h],
    [cx - size,     cy    ],
    [cx - size / 2, cy - h],
    [cx + size / 2, cy - h],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}

/** SVG polygon points string for a square cell centered at (cx, cy). size = full cell width. */
export function squarePolygonPoints(cx: number, cy: number, size: number): string {
  const h = size / 2
  return [
    [cx - h, cy - h],
    [cx + h, cy - h],
    [cx + h, cy + h],
    [cx - h, cy + h],
  ].map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}
