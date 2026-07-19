import { useId, type ReactNode } from 'react'
import {
  DOG_BREED_BY_ID,
  DOG_COAT_BY_ID,
  DOG_COLORWAYS,
  coerceColorway,
  type DogBuild,
  type DogCollar,
  type DogConfig,
  type DogEar,
  type DogPattern,
  type DogSnout,
  type DogTail,
} from '../lib/dogAvatar'

/**
 * A friendly parametric SIDE-VIEW dog drawn as SVG from a DogConfig (breed →
 * ear/snout/build presets, coat colour + pattern, tail and collar). Fills come
 * from the coat palette plus fixed ink for nose/eyes — artwork colours, not
 * theme tokens. Patterns (spots/patches/saddle/merle) are clipped to the body.
 */

const NOSE = '#2b2b2b'
const HL = '#ffffff'
const SHADE = 'rgba(0,0,0,0.16)' // ear insides / soft shadows
const GROUND = 86

interface Layout {
  bodyCx: number
  bodyCy: number
  bodyRx: number
  bodyRy: number
  headCx: number
  headCy: number
  headR: number
  legTop: number
}

const BUILD: Record<DogBuild, Layout> = {
  standard: {
    bodyCx: 42,
    bodyCy: 50,
    bodyRx: 24,
    bodyRy: 15,
    headCx: 72,
    headCy: 40,
    headR: 13,
    legTop: 60,
  },
  compact: {
    bodyCx: 44,
    bodyCy: 53,
    bodyRx: 21,
    bodyRy: 14,
    headCx: 72,
    headCy: 44,
    headR: 13,
    legTop: 63,
  },
  long: {
    bodyCx: 40,
    bodyCy: 55,
    bodyRx: 30,
    bodyRy: 12,
    headCx: 79,
    headCy: 47,
    headR: 12,
    legTop: 64,
  },
  tall: {
    bodyCx: 42,
    bodyCy: 45,
    bodyRx: 23,
    bodyRy: 14,
    headCx: 73,
    headCy: 33,
    headR: 13,
    legTop: 56,
  },
}

const SNOUT_LEN: Record<DogSnout, number> = { short: 7, medium: 11, long: 15 }

function legs(L: Layout, base: string, belly: string): ReactNode {
  const w = 6
  const r = 3
  const backX = L.bodyCx - L.bodyRx + 5
  const frontX = L.bodyCx + L.bodyRx - 11
  const y = L.legTop
  const h = GROUND - y
  const Leg = (x: number, fill: string) => (
    <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
  )
  return (
    <>
      {/* far legs (slightly darker for depth) */}
      {Leg(backX + 4, belly)}
      {Leg(frontX - 4, belly)}
      {/* near legs */}
      {Leg(backX, base)}
      {Leg(frontX, base)}
      {/* paws */}
      <rect x={backX - 0.5} y={GROUND - 3} width={w + 1} height={3} rx={1.5} fill={SHADE} />
      <rect x={frontX - 0.5} y={GROUND - 3} width={w + 1} height={3} rx={1.5} fill={SHADE} />
    </>
  )
}

function tail(style: DogTail, L: Layout, base: string): ReactNode {
  const x = L.bodyCx - L.bodyRx + 2
  const y = L.bodyCy - 2
  const stroke = { fill: 'none', stroke: base, strokeLinecap: 'round' as const }
  switch (style) {
    case 'curl':
      return <path d={`M${x} ${y} q -10 -2 -9 -11 q 1 -7 8 -6`} strokeWidth={5} {...stroke} />
    case 'sickle':
      return <path d={`M${x} ${y} q -9 -4 -8 -14`} strokeWidth={5} {...stroke} />
    case 'bushy':
      return <path d={`M${x} ${y} q -12 0 -15 -9`} strokeWidth={9} {...stroke} />
    case 'stub':
      return <path d={`M${x} ${y - 2} q -5 -1 -6 3`} strokeWidth={6} {...stroke} />
    case 'saber':
    default:
      return <path d={`M${x} ${y} q -13 1 -16 -6`} strokeWidth={5} {...stroke} />
  }
}

function ears(type: DogEar, L: Layout, base: string): ReactNode {
  // Near ear sits on the back-top of the head (left side, since the dog faces right).
  const ex = L.headCx - 6
  const ey = L.headCy - L.headR + 3
  switch (type) {
    case 'prick':
      return (
        <>
          <path d={`M${ex} ${ey} l -3 -12 l 8 6 Z`} fill={base} />
          <path d={`M${ex} ${ey} l -2 -8 l 5 4 Z`} fill={SHADE} />
        </>
      )
    case 'drop':
      return (
        <ellipse
          cx={ex - 2}
          cy={ey + 8}
          rx={5}
          ry={11}
          fill={base}
          transform={`rotate(-18 ${ex - 2} ${ey + 8})`}
        />
      )
    case 'round':
      return <circle cx={ex - 1} cy={ey + 1} r={5.5} fill={base} />
    case 'semi':
    default:
      return <path d={`M${ex} ${ey} l -4 -9 q 6 0 7 5 Z`} fill={base} />
  }
}

function pattern(kind: DogPattern, L: Layout, color: string, clipId: string): ReactNode {
  const { bodyCx: cx, bodyCy: cy, bodyRx: rx, bodyRy: ry } = L
  switch (kind) {
    case 'spots':
      return (
        <g clipPath={`url(#${clipId})`} fill={color}>
          <circle cx={cx - rx * 0.4} cy={cy - 3} r={3} />
          <circle cx={cx} cy={cy + 4} r={3.6} />
          <circle cx={cx + rx * 0.35} cy={cy - 4} r={2.6} />
          <circle cx={cx + rx * 0.55} cy={cy + 5} r={3} />
          <circle cx={cx - rx * 0.1} cy={cy - 6} r={2.2} />
          <circle cx={cx - rx * 0.6} cy={cy + 5} r={2.4} />
        </g>
      )
    case 'patches':
      return (
        <g clipPath={`url(#${clipId})`} fill={color}>
          <ellipse cx={cx - rx * 0.35} cy={cy - 1} rx={rx * 0.4} ry={ry * 0.8} />
          <ellipse cx={cx + rx * 0.5} cy={cy + 2} rx={rx * 0.35} ry={ry * 0.7} />
        </g>
      )
    case 'saddle':
      return (
        <g clipPath={`url(#${clipId})`} fill={color}>
          <ellipse cx={cx} cy={cy - ry * 0.5} rx={rx * 0.85} ry={ry * 0.9} />
        </g>
      )
    case 'merle':
      return (
        <g clipPath={`url(#${clipId})`} fill={color} opacity={0.7}>
          {[
            [-0.5, -0.2, 3],
            [-0.15, 0.4, 2.4],
            [0.2, -0.3, 2.8],
            [0.5, 0.3, 3],
            [0.05, -0.5, 2],
            [-0.7, 0.3, 2.2],
          ].map(([fx, fy, r], i) => (
            <circle key={i} cx={cx + rx * fx} cy={cy + ry * fy} r={r} />
          ))}
        </g>
      )
    case 'mask':
      return null // drawn on the head, not the body (see below)
  }
}

export function DogAvatar({
  config,
  className,
  title,
  name,
}: {
  config: DogConfig
  className?: string
  title?: string
  /** When set, a small name tag is drawn under the dog with the colorway accent. */
  name?: string
}) {
  const breed = DOG_BREED_BY_ID[config.breed] ?? DOG_BREED_BY_ID.labrador
  const coat = DOG_COAT_BY_ID[config.coat] ?? DOG_COAT_BY_ID.tan
  const colorway = DOG_COLORWAYS[coerceColorway(config.colorway)]
  const L = BUILD[breed.build]
  const base = coat.base
  const belly = coat.belly ?? base
  const clipId = useId()

  const muzzleLen = SNOUT_LEN[breed.snout]
  const muzzleX = L.headCx + L.headR - 2
  const muzzleY = L.headCy + 3
  const noseX = muzzleX + muzzleLen
  const eyeX = L.headCx + 2
  const eyeY = L.headCy - 2

  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title ?? 'dog avatar'}>
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={L.bodyCx} cy={L.bodyCy} rx={L.bodyRx} ry={L.bodyRy} />
        </clipPath>
      </defs>

      {tail(config.tail, L, base)}
      {legs(L, base, belly)}

      {/* Neck connecting body to head */}
      <path
        d={`M${L.bodyCx + L.bodyRx - 6} ${L.bodyCy - 6} Q ${L.headCx - 6} ${L.headCy + 2} ${L.headCx} ${L.headCy + L.headR - 2} L ${L.bodyCx + L.bodyRx - 4} ${L.bodyCy + L.bodyRy - 2} Z`}
        fill={base}
      />

      {/* Body */}
      <ellipse cx={L.bodyCx} cy={L.bodyCy} rx={L.bodyRx} ry={L.bodyRy} fill={base} />
      <ellipse
        cx={L.bodyCx}
        cy={L.bodyCy + L.bodyRy * 0.45}
        rx={L.bodyRx * 0.8}
        ry={L.bodyRy * 0.5}
        fill={belly}
      />
      {coat.pattern && pattern(coat.pattern, L, coat.patternColor ?? SHADE, clipId)}

      {/* Ears (behind head) */}
      {ears(breed.ear, L, base)}

      {/* Head + muzzle */}
      <circle cx={L.headCx} cy={L.headCy} r={L.headR} fill={base} />
      <path
        d={`M${muzzleX - 2} ${muzzleY - 5} Q ${noseX} ${muzzleY - 4} ${noseX} ${muzzleY} Q ${noseX} ${muzzleY + 5} ${muzzleX - 2} ${muzzleY + 5} Z`}
        fill={belly}
      />
      {coat.pattern === 'mask' && (
        <path
          d={`M${eyeX - 4} ${eyeY - 3} Q ${noseX} ${muzzleY - 6} ${noseX} ${muzzleY} Q ${noseX} ${muzzleY + 5} ${muzzleX - 3} ${muzzleY + 5} Q ${eyeX - 5} ${muzzleY} ${eyeX - 4} ${eyeY - 3} Z`}
          fill={coat.patternColor ?? NOSE}
          opacity={0.85}
        />
      )}

      {/* Nose + eye */}
      <ellipse cx={noseX - 1} cy={muzzleY} rx={2.6} ry={2.2} fill={NOSE} />
      <circle cx={noseX - 1.8} cy={muzzleY - 0.8} r={0.7} fill={HL} opacity={0.6} />
      <circle cx={eyeX} cy={eyeY} r={2} fill={NOSE} />
      <circle cx={eyeX - 0.6} cy={eyeY - 0.7} r={0.6} fill={HL} opacity={0.7} />

      {/* Collar around the neck (tinted by the colourway) */}
      {config.collar !== 'none' && <Collar collar={config.collar} L={L} color={colorway.collar} />}

      {/* Name tag under the dog (colourway accent) */}
      {name && <NameTag name={name} accent={colorway.accent} ink={colorway.ink} />}
    </svg>
  )
}

/** A small rounded name plate at the foot of the avatar (fits any length). */
function NameTag({ name, accent, ink }: { name: string; accent: string; ink: string }) {
  const y = 89
  const h = 10
  const x = 12
  const w = 76
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={accent} />
      <text
        x={50}
        y={y + h / 2 + 2.6}
        textAnchor="middle"
        fontSize={6.5}
        fontWeight={700}
        fill={ink}
        textLength={name.length > 10 ? w - 8 : undefined}
        lengthAdjust="spacingAndGlyphs"
      >
        {name}
      </text>
    </g>
  )
}

function Collar({
  collar,
  L,
  color = '#c2410c',
}: {
  collar: DogCollar
  L: Layout
  color?: string
}) {
  const cx = L.headCx - 6
  const cy = L.headCy + L.headR + 3
  const angle = -58
  if (collar === 'bandana') {
    return (
      <g transform={`rotate(${angle} ${cx} ${cy})`}>
        <path d={`M${cx - 8} ${cy - 3} h16 l -8 12 Z`} fill={color} />
        <path d={`M${cx - 8} ${cy - 3} h16`} stroke={color} strokeWidth={3} strokeLinecap="round" />
      </g>
    )
  }
  return (
    <g transform={`rotate(${angle} ${cx} ${cy})`}>
      <rect x={cx - 9} y={cy - 2.5} width={18} height={4.5} rx={2} fill={color} />
      {collar === 'spiked' &&
        [-6, -2, 2, 6].map((dx, i) => (
          <path key={i} d={`M${cx + dx} ${cy + 2} l -1.6 3 h3.2 Z`} fill="#e5e7eb" />
        ))}
      {collar === 'flat' && <circle cx={cx} cy={cy + 4} r={2} fill="#facc15" />}
    </g>
  )
}
