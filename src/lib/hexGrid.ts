export const GRID_SIZE = 20

/**
 * Direction vectors in axial coordinates for flat-top hexagons.
 * Flat-top means the hex has flat edges at top and bottom, so "up" is unambiguous.
 * Directions are clockwise from up: 1=up, 2=upper-right, 3=lower-right,
 * 4=down, 5=lower-left, 6=upper-left.
 */
export const HEX_DIRECTIONS: Record<number, { dq: number; dr: number }> = {
  1: { dq: 0,  dr: -1 }, // up
  2: { dq: 1,  dr: -1 }, // upper-right
  3: { dq: 1,  dr: 0  }, // lower-right
  4: { dq: 0,  dr: 1  }, // down
  5: { dq: -1, dr: 1  }, // lower-left
  6: { dq: -1, dr: 0  }, // upper-left
}

export const DIRECTION_NAMES: Record<number, string> = {
  1: '↑ Up',
  2: '↗ Upper-right',
  3: '↘ Lower-right',
  4: '↓ Down',
  5: '↙ Lower-left',
  6: '↖ Upper-left',
}

export function isOnBoard(q: number, r: number): boolean {
  return q >= 0 && q < GRID_SIZE && r >= 0 && r < GRID_SIZE
}

/**
 * Pixel center of hex (q, r) for flat-top hexagons.
 * size = distance from center to any vertex.
 */
export function hexToPixel(q: number, r: number, size: number): { x: number; y: number } {
  return {
    x: size * (3 / 2) * q,
    y: size * Math.sqrt(3) * (r + q / 2),
  }
}

/** SVG polygon points string for a flat-top hexagon centered at (cx, cy). */
export function hexPolygonPoints(cx: number, cy: number, size: number): string {
  const h = (Math.sqrt(3) / 2) * size
  const corners: [number, number][] = [
    [cx + size,     cy      ],
    [cx + size / 2, cy + h  ],
    [cx - size / 2, cy + h  ],
    [cx - size,     cy      ],
    [cx - size / 2, cy - h  ],
    [cx + size / 2, cy - h  ],
  ]
  return corners.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ')
}
