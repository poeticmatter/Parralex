import { motion } from 'motion/react'
import type { Character, CharId, MovementArrow, HexCoord } from '../types'
import { hexToPixel, hexPolygonPoints, HEX_RADIUS, getAllHexes } from '../lib/hexGrid'
import { P1_CHAR_PAIRS, P2_CHAR_PAIRS } from '../lib/hexGameLogic'

const HEX_SIZE = 20
const PADDING = 28

const PAIR_COLORS = [
  { fill: '#06b6d4', glow: '#06b6d460' }, // cyan   — pair 0
  { fill: '#f97316', glow: '#f9731660' }, // orange — pair 1
]

function getCharColor(charId: CharId, playerRole: 1 | 2) {
  const pairs = playerRole === 1 ? P1_CHAR_PAIRS : P2_CHAR_PAIRS
  return PAIR_COLORS[pairs[0].includes(charId) ? 0 : 1]
}

// Board SVG dimensions: hex-shaped board of radius HEX_RADIUS centered at origin
const SVG_WIDTH  = (3 * HEX_RADIUS + 2) * HEX_SIZE + PADDING * 2
const SVG_HEIGHT = Math.sqrt(3) * HEX_SIZE * (2 * HEX_RADIUS + 1) + PADDING * 2
const OFFSET_X   = SVG_WIDTH / 2
const OFFSET_Y   = SVG_HEIGHT / 2

const ALL_HEXES = getAllHexes()

// ── Arrow rendering ───────────────────────────────────────────────────────────

function renderArrow(
  arrow: MovementArrow,
  playerRole: 1 | 2,
  predictive: boolean,
) {
  const from = hexToPixel(arrow.fromQ, arrow.fromR, HEX_SIZE)
  const to   = hexToPixel(arrow.toQ,   arrow.toR,   HEX_SIZE)
  const fx = from.x + OFFSET_X
  const fy = from.y + OFFSET_Y
  const tx = to.x + OFFSET_X
  const ty = to.y + OFFSET_Y

  const dx = tx - fx
  const dy = ty - fy
  const len = Math.sqrt(dx * dx + dy * dy)
  const shorten = HEX_SIZE * 0.55
  const ex = len > shorten ? tx - (dx / len) * shorten : tx
  const ey = len > shorten ? ty - (dy / len) * shorten : ty

  const { fill } = getCharColor(arrow.charId, playerRole)
  const markerId = predictive ? `arrowhead-p-${arrow.charId}` : `arrowhead-${arrow.charId}`

  return (
    <line
      key={`${predictive ? 'p' : 'r'}-${arrow.charId}`}
      x1={fx} y1={fy} x2={ex} y2={ey}
      stroke={fill}
      strokeWidth={predictive ? 1.5 : 2}
      strokeOpacity={predictive ? 0.5 : 0.8}
      strokeDasharray={predictive ? '4 3' : undefined}
      markerEnd={`url(#${markerId})`}
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

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

  return (
    <div className="relative select-none" style={{ width: SVG_WIDTH, height: SVG_HEIGHT }}>
      <svg width={SVG_WIDTH} height={SVG_HEIGHT} className="absolute inset-0">
        {/* Arrowhead markers */}
        <defs>
          {(['A', 'B', 'C', 'D'] as CharId[]).map(id => {
            const { fill } = getCharColor(id, playerRole)
            return (
              <g key={id}>
                <marker id={`arrowhead-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 Z" fill={fill} />
                </marker>
                <marker id={`arrowhead-p-${id}`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 Z" fill={fill} fillOpacity="0.5" />
                </marker>
              </g>
            )
          })}
        </defs>

        {/* Hex cells */}
        {ALL_HEXES.map(({ q, r }) => {
          const { x, y } = hexToPixel(q, r, HEX_SIZE)
          const cx = x + OFFSET_X
          const cy = y + OFFSET_Y
          const isObstacle = obstacleKeys.has(`${q},${r}`)

          return (
            <g key={`${q},${r}`}>
              <polygon
                points={hexPolygonPoints(cx, cy, HEX_SIZE - 1)}
                fill={isObstacle ? '#312820' : '#1a1a1a'}
                stroke={isObstacle ? '#5a4030' : '#2a2a2a'}
                strokeWidth={isObstacle ? 1 : 0.8}
              />
              <text
                x={cx} y={cy + 1}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={5} fill="#555" pointerEvents="none"
              >
                {q},{r}
              </text>
            </g>
          )
        })}

        {/* Arrows */}
        {movementArrows.map(a => renderArrow(a, playerRole, false))}
        {predictiveArrows.map(a => renderArrow(a, playerRole, true))}
      </svg>

      {/* Character tokens */}
      {characters.map(char => {
        const { x, y } = hexToPixel(char.q, char.r, HEX_SIZE)
        const cx = x + OFFSET_X
        const cy = y + OFFSET_Y
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
              fontSize: 9,
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
            winner === 1 ? 'text-cyan-300 bg-cyan-900/60' : 'text-orange-300 bg-orange-900/60'
          }`}>
            Player {winner} wins!
          </div>
        </div>
      )}
    </div>
  )
}
