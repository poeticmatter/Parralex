import { motion } from 'motion/react'
import type { Character, CharId, MovementArrow, HexCoord } from '../types'
import { hexToPixel, hexPolygonPoints, GRID_SIZE } from '../lib/hexGrid'
import { P1_CHAR_PAIRS, P2_CHAR_PAIRS } from '../lib/hexGameLogic'

const HEX_SIZE = 14
const PADDING = 24

// Two colors per player — pair 0 = cyan, pair 1 = orange
const PAIR_COLORS = [
  { fill: '#06b6d4', glow: '#06b6d460' },
  { fill: '#f97316', glow: '#f9731660' },
]

function getCharColor(charId: CharId, playerRole: 1 | 2) {
  const pairs = playerRole === 1 ? P1_CHAR_PAIRS : P2_CHAR_PAIRS
  return PAIR_COLORS[pairs[0].includes(charId) ? 0 : 1]
}

// Pre-compute SVG dimensions from grid bounds once at module load
function computeBoardLayout() {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const h = (Math.sqrt(3) / 2) * HEX_SIZE

  for (let q = 0; q < GRID_SIZE; q++) {
    for (let r = 0; r < GRID_SIZE; r++) {
      const { x, y } = hexToPixel(q, r, HEX_SIZE)
      minX = Math.min(minX, x - HEX_SIZE)
      minY = Math.min(minY, y - h)
      maxX = Math.max(maxX, x + HEX_SIZE)
      maxY = Math.max(maxY, y + h)
    }
  }

  return {
    width:   maxX - minX + PADDING * 2,
    height:  maxY - minY + PADDING * 2,
    offsetX: -minX + PADDING,
    offsetY: -minY + PADDING,
  }
}

const LAYOUT = computeBoardLayout()

function renderArrow(
  arrow: MovementArrow,
  offsetX: number,
  offsetY: number,
  playerRole: 1 | 2,
  predictive: boolean,
) {
  const from = hexToPixel(arrow.fromQ, arrow.fromR, HEX_SIZE)
  const to   = hexToPixel(arrow.toQ,   arrow.toR,   HEX_SIZE)
  const fx = from.x + offsetX
  const fy = from.y + offsetY
  const tx = to.x + offsetX
  const ty = to.y + offsetY

  // Shorten endpoint so the line doesn't run under the arrowhead
  const dx = tx - fx
  const dy = ty - fy
  const len = Math.sqrt(dx * dx + dy * dy)
  const shorten = HEX_SIZE * 0.55
  const ex = len > shorten ? tx - (dx / len) * shorten : tx
  const ey = len > shorten ? ty - (dy / len) * shorten : ty

  const { fill } = getCharColor(arrow.charId, playerRole)
  const markerId = predictive
    ? `arrowhead-predictive-${arrow.charId}`
    : `arrowhead-${arrow.charId}`

  return (
    <line
      key={`${predictive ? 'p' : 'r'}-${arrow.charId}`}
      x1={fx} y1={fy}
      x2={ex} y2={ey}
      stroke={fill}
      strokeWidth={predictive ? 1.5 : 2}
      strokeOpacity={predictive ? 0.55 : 0.8}
      strokeDasharray={predictive ? '4 3' : undefined}
      markerEnd={`url(#${markerId})`}
    />
  )
}

interface Props {
  characters: Character[]
  obstacles: HexCoord[]
  movementArrows: MovementArrow[]
  predictiveArrows: MovementArrow[]
  winner: 1 | 2 | null
  playerRole: 1 | 2
}

export function HexBoard({ characters, obstacles, movementArrows, predictiveArrows, winner, playerRole }: Props) {
  const obstacleKeys = new Set(obstacles.map(o => `${o.q},${o.r}`))
  const { width, height, offsetX, offsetY } = LAYOUT

  return (
    <div className="relative select-none" style={{ width, height }}>
      <svg width={width} height={height} className="absolute inset-0">
        {/* Arrowhead markers — solid (result) and semi-transparent (predictive) */}
        <defs>
          {(['A', 'B', 'C', 'D'] as CharId[]).map(id => {
            const { fill } = getCharColor(id, playerRole)
            return (
              <g key={id}>
                <marker id={`arrowhead-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 Z" fill={fill} />
                </marker>
                <marker id={`arrowhead-predictive-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 Z" fill={fill} fillOpacity="0.55" />
                </marker>
              </g>
            )
          })}
        </defs>

        {/* Hex cells */}
        {Array.from({ length: GRID_SIZE }, (_, q) =>
          Array.from({ length: GRID_SIZE }, (_, r) => {
            const { x, y } = hexToPixel(q, r, HEX_SIZE)
            const cx = x + offsetX
            const cy = y + offsetY

            const isNorth = r === 0
            const isSouth = r === GRID_SIZE - 1
            const isWest  = q === 0
            const isEast  = q === GRID_SIZE - 1
            const isObstacle = obstacleKeys.has(`${q},${r}`)

            let fill = '#1a1a1a'
            if (isObstacle)                                        fill = '#312820'
            else if ((isNorth || isSouth) && !isWest && !isEast)  fill = '#122012'
            else if ((isWest || isEast) && !isNorth && !isSouth)  fill = '#101020'
            else if (isNorth || isSouth || isWest || isEast)      fill = '#181818'

            return (
              <polygon
                key={`${q},${r}`}
                points={hexPolygonPoints(cx, cy, HEX_SIZE - 1)}
                fill={fill}
                stroke={isObstacle ? '#5a4030' : '#2a2a2a'}
                strokeWidth={isObstacle ? 1 : 0.8}
              />
            )
          })
        )}

        {/* Movement arrows from previous round — solid */}
        {movementArrows.map(arrow => renderArrow(arrow, offsetX, offsetY, playerRole, false))}

        {/* Predictive arrows for current draft assignment — dashed */}
        {predictiveArrows.map(arrow => renderArrow(arrow, offsetX, offsetY, playerRole, true))}

        {/* Edge labels */}
        <text x={width / 2} y={13} textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="700" letterSpacing="1">
          PLAYER 1 — NORTH
        </text>
        <text x={width / 2} y={height - 3} textAnchor="middle" fill="#4ade80" fontSize="9" fontWeight="700" letterSpacing="1">
          PLAYER 1 — SOUTH
        </text>
        <text
          x={9} y={height / 2} textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="700" letterSpacing="1"
          transform={`rotate(-90, 9, ${height / 2})`}
        >
          P2 WEST
        </text>
        <text
          x={width - 9} y={height / 2} textAnchor="middle" fill="#60a5fa" fontSize="9" fontWeight="700" letterSpacing="1"
          transform={`rotate(90, ${width - 9}, ${height / 2})`}
        >
          P2 EAST
        </text>
      </svg>

      {/* Animated character tokens */}
      {characters.map(char => {
        const { x, y } = hexToPixel(char.q, char.r, HEX_SIZE)
        const cx = x + offsetX
        const cy = y + offsetY
        const tokenSize = HEX_SIZE * 1.1
        const { fill, glow } = getCharColor(char.id, playerRole)

        return (
          <motion.div
            key={char.id}
            initial={false}
            animate={{ x: cx - tokenSize / 2, y: cy - tokenSize / 2 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            style={{
              position: 'absolute',
              width: tokenSize,
              height: tokenSize,
              borderRadius: '50%',
              backgroundColor: fill,
              boxShadow: `0 0 8px ${glow}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 8,
              color: 'white',
              zIndex: 10,
              pointerEvents: 'none',
            }}
          >
            {char.id}
          </motion.div>
        )
      })}

      {/* Win overlay */}
      {winner && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)' }}
        >
          <div className={`text-2xl font-bold px-6 py-3 rounded-xl ${
            winner === 1 ? 'text-green-300 bg-green-900/60' : 'text-blue-300 bg-blue-900/60'
          }`}>
            Player {winner} wins!
          </div>
        </div>
      )}
    </div>
  )
}
