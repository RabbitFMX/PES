/**
 * Parametric dog avatar: a member's avatar can be a `dog:<style>:<color>:<size>`
 * token (built in the profile avatar builder) instead of an image URL. This
 * module owns the option lists, (de)serialization, and a deterministic
 * seed→dog so every member has a distinct dog even before they pick one.
 */

export type DogStyle = 'classic' | 'shiba' | 'floppy' | 'husky' | 'spot' | 'puppy'
export type DogColor = 'tan' | 'gold' | 'brown' | 'chocolate' | 'black' | 'grey' | 'cream' | 'rust'
export type DogSize = 'sm' | 'md' | 'lg'

export interface DogConfig {
  style: DogStyle
  color: DogColor
  size: DogSize
}

export const DOG_STYLES: DogStyle[] = ['classic', 'shiba', 'floppy', 'husky', 'spot', 'puppy']
export const DOG_SIZES: DogSize[] = ['sm', 'md', 'lg']

export interface DogPalette {
  base: string
  dark: string
  light: string
}

export const DOG_COLORS: Record<DogColor, DogPalette> = {
  tan: { base: '#D9A066', dark: '#B77E45', light: '#F0D9B5' },
  gold: { base: '#E6B325', dark: '#C08A12', light: '#F6E3A8' },
  brown: { base: '#96613B', dark: '#6F4626', light: '#C9A483' },
  chocolate: { base: '#5E3B22', dark: '#422814', light: '#9A7256' },
  black: { base: '#4A4A4A', dark: '#2E2E2E', light: '#8A8A8A' },
  grey: { base: '#A7ADB5', dark: '#7C838C', light: '#D8DCE1' },
  cream: { base: '#EAD8B4', dark: '#CBB488', light: '#F7EEDA' },
  rust: { base: '#B5651D', dark: '#8C4C12', light: '#E0A76A' },
}

export const DOG_COLOR_IDS = Object.keys(DOG_COLORS) as DogColor[]
export const DEFAULT_DOG: DogConfig = { style: 'classic', color: 'tan', size: 'md' }

const PREFIX = 'dog:'

export function isDogAvatar(src: string | null | undefined): boolean {
  return typeof src === 'string' && src.startsWith(PREFIX)
}

export function serializeDog(c: DogConfig): string {
  return `${PREFIX}${c.style}:${c.color}:${c.size}`
}

export function parseDog(src: string | null | undefined): DogConfig {
  if (!isDogAvatar(src)) return DEFAULT_DOG
  const [, style, color, size] = (src as string).split(':')
  return {
    style: (DOG_STYLES as string[]).includes(style) ? (style as DogStyle) : DEFAULT_DOG.style,
    color: (DOG_COLOR_IDS as string[]).includes(color) ? (color as DogColor) : DEFAULT_DOG.color,
    size: (DOG_SIZES as string[]).includes(size) ? (size as DogSize) : DEFAULT_DOG.size,
  }
}

/** Stable hash of a string → non-negative int. */
function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A deterministic, distinct dog for a member with no avatar chosen yet. */
export function dogFromSeed(seed: string): DogConfig {
  const h = hash(seed)
  return {
    style: DOG_STYLES[h % DOG_STYLES.length],
    color: DOG_COLOR_IDS[(h >>> 3) % DOG_COLOR_IDS.length],
    size: 'md',
  }
}
