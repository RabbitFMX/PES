import { DOG_COLORS, type DogConfig, type DogPalette, type DogStyle } from '../lib/dogAvatar'

/**
 * A friendly parametric dog face rendered as SVG from a DogConfig. Illustration
 * fills come from the DOG_COLORS palette (coat) plus fixed ink for nose/eyes —
 * these are artwork colours, not theme tokens.
 */

const NOSE = '#2b2b2b'
const HL = '#ffffff'

function ears(style: DogStyle, p: DogPalette) {
  switch (style) {
    case 'shiba':
    case 'husky':
      return (
        <>
          <path d="M30 40 L24 15 L47 33 Z" fill={p.base} />
          <path d="M33 37 L29 22 L43 33 Z" fill={p.light} />
          <path d="M70 40 L76 15 L53 33 Z" fill={p.base} />
          <path d="M67 37 L71 22 L57 33 Z" fill={p.light} />
        </>
      )
    case 'floppy':
      return (
        <>
          <ellipse cx="26" cy="54" rx="10" ry="20" fill={p.dark} transform="rotate(-16 26 54)" />
          <ellipse cx="74" cy="54" rx="10" ry="20" fill={p.dark} transform="rotate(16 74 54)" />
        </>
      )
    case 'puppy':
      return (
        <>
          <ellipse cx="30" cy="38" rx="12" ry="14" fill={p.dark} transform="rotate(-20 30 38)" />
          <ellipse cx="70" cy="38" rx="12" ry="14" fill={p.dark} transform="rotate(20 70 38)" />
        </>
      )
    default:
      return (
        <>
          <path d="M26 44 L34 20 L46 38 Z" fill={p.dark} />
          <path d="M74 44 L66 20 L54 38 Z" fill={p.dark} />
        </>
      )
  }
}

export function DogAvatar({
  config,
  className,
  title,
}: {
  config: DogConfig
  className?: string
  title?: string
}) {
  const p = DOG_COLORS[config.color]
  const scale = config.size === 'sm' ? 0.92 : config.size === 'lg' ? 1.08 : 1
  const eyeColor = config.style === 'husky' ? '#5b86c4' : NOSE
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={title ?? 'dog avatar'}>
      <g transform={`translate(50 52) scale(${scale}) translate(-50 -52)`}>
        {ears(config.style, p)}
        <ellipse cx="50" cy="52" rx="30" ry="28" fill={p.base} />
        {config.style === 'husky' && (
          <path d="M50 28 L38 52 Q50 47 50 47 Q50 47 62 52 Z" fill={p.dark} opacity="0.85" />
        )}
        {config.style === 'spot' && <ellipse cx="38" cy="46" rx="9.5" ry="10.5" fill={p.dark} />}
        <ellipse cx="50" cy="63" rx="16" ry="11.5" fill={p.light} />
        <ellipse cx="39" cy="48" rx="3" ry="3.4" fill={eyeColor} />
        <ellipse cx="61" cy="48" rx="3" ry="3.4" fill={eyeColor} />
        <circle cx="38" cy="47" r="0.9" fill={HL} opacity="0.7" />
        <circle cx="60" cy="47" r="0.9" fill={HL} opacity="0.7" />
        <ellipse cx="50" cy="57" rx="4.6" ry="3.3" fill={NOSE} />
        <ellipse cx="48.4" cy="56" rx="1.2" ry="0.9" fill={HL} opacity="0.55" />
        <path
          d="M50 60 v3.5 M50 63.5 q-4 3 -7.5 0.8 M50 63.5 q4 3 7.5 0.8"
          stroke={NOSE}
          strokeWidth="1.3"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
