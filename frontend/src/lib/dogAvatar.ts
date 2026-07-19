/**
 * Parametric FULL-BODY dog avatar. A member's avatar can be a
 * `dog:<breed>:<coat>:<tail>:<collar>` token (built in the profile avatar
 * builder) instead of an image URL. This module owns the option lists,
 * (de)serialization (incl. backward-compat for the old head-only
 * `dog:<style>:<color>:<size>` tokens), and a deterministic seed→dog so every
 * member has a distinct dog even before they pick one.
 */

export type DogEar = 'prick' | 'drop' | 'round' | 'semi'
export type DogSnout = 'short' | 'medium' | 'long'
export type DogBuild = 'compact' | 'standard' | 'long' | 'tall'
export type DogTail = 'curl' | 'saber' | 'bushy' | 'stub' | 'sickle'
export type DogCollar = 'none' | 'flat' | 'bandana' | 'spiked'
export type DogPattern = 'spots' | 'patches' | 'saddle' | 'mask' | 'merle'

export interface DogConfig {
  breed: string
  coat: string
  tail: DogTail
  collar: DogCollar
  /** One of 3 colour combinations (collar + name-tag accent); index 0–2. */
  colorway: number
}

/**
 * Three colour combinations every dog can wear — the collar/name-tag accent
 * scheme (independent of the coat). Keeps "each dog has 3 colour combos"
 * (project update) a small, orthogonal choice on top of the breed + coat.
 */
export interface DogColorway {
  id: string
  nameCs: string
  nameEn: string
  collar: string
  /** Name-tag plate + accent colour. */
  accent: string
  /** Readable text colour on the plate. */
  ink: string
}

export const DOG_COLORWAYS: DogColorway[] = [
  {
    id: 'ember',
    nameCs: 'ohnivá',
    nameEn: 'Ember',
    collar: '#c2410c',
    accent: '#ea580c',
    ink: '#ffffff',
  },
  {
    id: 'ocean',
    nameCs: 'mořská',
    nameEn: 'Ocean',
    collar: '#0369a1',
    accent: '#0ea5e9',
    ink: '#ffffff',
  },
  {
    id: 'forest',
    nameCs: 'lesní',
    nameEn: 'Forest',
    collar: '#15803d',
    accent: '#16a34a',
    ink: '#ffffff',
  },
]

export const DOG_COLORWAY_COUNT = DOG_COLORWAYS.length

/** Clamp any value to a valid colorway index. */
export function coerceColorway(v: unknown): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isInteger(n) && n >= 0 && n < DOG_COLORWAY_COUNT ? n : 0
}

/* ---- Coats (realistic colours + patterns: spots, patches, saddle, …) ---- */

export interface DogCoat {
  id: string
  nameCs: string
  nameEn: string
  base: string
  /** Lighter belly/chest shade; derived if absent. */
  belly?: string
  pattern?: DogPattern
  patternColor?: string
}

export const DOG_COATS: DogCoat[] = [
  { id: 'black', nameCs: 'černá', nameEn: 'Black', base: '#3f3f43', belly: '#6a6a70' },
  { id: 'white', nameCs: 'bílá', nameEn: 'White', base: '#efeae0', belly: '#ffffff' },
  { id: 'cream', nameCs: 'krémová', nameEn: 'Cream', base: '#ead8b4', belly: '#f7eeda' },
  { id: 'tan', nameCs: 'světle hnědá', nameEn: 'Tan', base: '#d9a066', belly: '#f0d9b5' },
  { id: 'fawn', nameCs: 'plavá', nameEn: 'Fawn', base: '#e0b07a', belly: '#f3ddc0' },
  { id: 'gold', nameCs: 'zlatá', nameEn: 'Golden', base: '#e0a534', belly: '#f6e3a8' },
  { id: 'rust', nameCs: 'zrzavá', nameEn: 'Rust', base: '#b5651d', belly: '#e0a76a' },
  { id: 'brown', nameCs: 'hnědá', nameEn: 'Brown', base: '#96613b', belly: '#c9a483' },
  { id: 'chocolate', nameCs: 'čokoládová', nameEn: 'Chocolate', base: '#5e3b22', belly: '#9a7256' },
  { id: 'grey', nameCs: 'šedá', nameEn: 'Grey', base: '#9aa1a9', belly: '#d8dce1' },
  // Patterned coats
  {
    id: 'spots',
    nameCs: 'strakatá (dalmatin)',
    nameEn: 'Spotted (dalmatian)',
    base: '#efeae0',
    belly: '#ffffff',
    pattern: 'spots',
    patternColor: '#3f3f43',
  },
  {
    id: 'patched',
    nameCs: 'bílo-hnědá',
    nameEn: 'White & brown',
    base: '#efeae0',
    belly: '#ffffff',
    pattern: 'patches',
    patternColor: '#96613b',
  },
  {
    id: 'saddle',
    nameCs: 'se sedlem',
    nameEn: 'Saddle',
    base: '#cf9a58',
    belly: '#e6cf9e',
    pattern: 'saddle',
    patternColor: '#3f3f43',
  },
  {
    id: 'mask',
    nameCs: 's maskou',
    nameEn: 'Masked',
    base: '#e0b07a',
    belly: '#f3ddc0',
    pattern: 'mask',
    patternColor: '#3f3f43',
  },
  {
    id: 'merle',
    nameCs: 'mramorovaná',
    nameEn: 'Merle',
    base: '#aab0b6',
    belly: '#d8dce1',
    pattern: 'merle',
    patternColor: '#5c6169',
  },
]

export const DOG_COAT_IDS = DOG_COATS.map((c) => c.id)
export const DOG_COAT_BY_ID: Record<string, DogCoat> = Object.fromEntries(
  DOG_COATS.map((c) => [c.id, c]),
)

/* ---- Breeds (shape presets + 5 recommended coats each) ---- */

export interface DogBreed {
  id: string
  nameCs: string
  nameEn: string
  ear: DogEar
  snout: DogSnout
  build: DogBuild
  tail: DogTail
  /** Five breed-appropriate coat ids surfaced first in the builder. */
  coats: string[]
}

export const DOG_BREEDS: DogBreed[] = [
  {
    id: 'labrador',
    nameCs: 'labrador',
    nameEn: 'Labrador',
    ear: 'drop',
    snout: 'medium',
    build: 'standard',
    tail: 'saber',
    coats: ['gold', 'black', 'chocolate', 'cream', 'fawn'],
  },
  {
    id: 'german-shepherd',
    nameCs: 'německý ovčák',
    nameEn: 'German shepherd',
    ear: 'prick',
    snout: 'long',
    build: 'tall',
    tail: 'bushy',
    coats: ['saddle', 'black', 'tan', 'grey', 'brown'],
  },
  {
    id: 'dalmatian',
    nameCs: 'dalmatin',
    nameEn: 'Dalmatian',
    ear: 'drop',
    snout: 'medium',
    build: 'standard',
    tail: 'saber',
    coats: ['spots', 'white', 'patched', 'cream', 'black'],
  },
  {
    id: 'poodle',
    nameCs: 'pudl',
    nameEn: 'Poodle',
    ear: 'drop',
    snout: 'long',
    build: 'standard',
    tail: 'sickle',
    coats: ['black', 'white', 'cream', 'brown', 'gold'],
  },
  {
    id: 'bulldog',
    nameCs: 'buldok',
    nameEn: 'Bulldog',
    ear: 'semi',
    snout: 'short',
    build: 'compact',
    tail: 'stub',
    coats: ['fawn', 'white', 'patched', 'brown', 'cream'],
  },
  {
    id: 'husky',
    nameCs: 'husky',
    nameEn: 'Husky',
    ear: 'prick',
    snout: 'medium',
    build: 'standard',
    tail: 'curl',
    coats: ['grey', 'black', 'white', 'rust', 'merle'],
  },
  {
    id: 'beagle',
    nameCs: 'bígl',
    nameEn: 'Beagle',
    ear: 'drop',
    snout: 'medium',
    build: 'compact',
    tail: 'saber',
    coats: ['patched', 'tan', 'white', 'black', 'brown'],
  },
  {
    id: 'dachshund',
    nameCs: 'jezevčík',
    nameEn: 'Dachshund',
    ear: 'drop',
    snout: 'long',
    build: 'long',
    tail: 'saber',
    coats: ['chocolate', 'black', 'tan', 'rust', 'cream'],
  },
  {
    id: 'corgi',
    nameCs: 'corgi',
    nameEn: 'Corgi',
    ear: 'prick',
    snout: 'medium',
    build: 'long',
    tail: 'stub',
    coats: ['fawn', 'tan', 'patched', 'cream', 'rust'],
  },
  {
    id: 'chihuahua',
    nameCs: 'čivava',
    nameEn: 'Chihuahua',
    ear: 'prick',
    snout: 'short',
    build: 'compact',
    tail: 'sickle',
    coats: ['fawn', 'tan', 'cream', 'black', 'chocolate'],
  },
  {
    id: 'golden-retriever',
    nameCs: 'zlatý retrívr',
    nameEn: 'Golden retriever',
    ear: 'drop',
    snout: 'medium',
    build: 'standard',
    tail: 'bushy',
    coats: ['gold', 'cream', 'fawn', 'rust', 'tan'],
  },
  {
    id: 'rottweiler',
    nameCs: 'rotvajler',
    nameEn: 'Rottweiler',
    ear: 'drop',
    snout: 'medium',
    build: 'standard',
    tail: 'stub',
    coats: ['saddle', 'black', 'brown', 'tan', 'chocolate'],
  },
  {
    id: 'border-collie',
    nameCs: 'border kolie',
    nameEn: 'Border collie',
    ear: 'semi',
    snout: 'medium',
    build: 'standard',
    tail: 'bushy',
    coats: ['patched', 'black', 'white', 'merle', 'tan'],
  },
  {
    id: 'boxer',
    nameCs: 'boxer',
    nameEn: 'Boxer',
    ear: 'drop',
    snout: 'short',
    build: 'tall',
    tail: 'stub',
    coats: ['fawn', 'brown', 'patched', 'mask', 'white'],
  },
  {
    id: 'pug',
    nameCs: 'mops',
    nameEn: 'Pug',
    ear: 'round',
    snout: 'short',
    build: 'compact',
    tail: 'curl',
    coats: ['fawn', 'black', 'cream', 'tan', 'mask'],
  },
  {
    id: 'shiba',
    nameCs: 'šiba inu',
    nameEn: 'Shiba inu',
    ear: 'prick',
    snout: 'medium',
    build: 'compact',
    tail: 'curl',
    coats: ['rust', 'cream', 'black', 'tan', 'white'],
  },
  {
    id: 'great-dane',
    nameCs: 'doga',
    nameEn: 'Great Dane',
    ear: 'drop',
    snout: 'long',
    build: 'tall',
    tail: 'saber',
    coats: ['fawn', 'black', 'grey', 'merle', 'mask'],
  },
  {
    id: 'pomeranian',
    nameCs: 'špic',
    nameEn: 'Pomeranian',
    ear: 'prick',
    snout: 'short',
    build: 'compact',
    tail: 'curl',
    coats: ['gold', 'rust', 'cream', 'black', 'fawn'],
  },
  {
    id: 'doberman',
    nameCs: 'dobrman',
    nameEn: 'Doberman',
    ear: 'prick',
    snout: 'long',
    build: 'tall',
    tail: 'stub',
    coats: ['black', 'chocolate', 'saddle', 'tan', 'brown'],
  },
  {
    id: 'saint-bernard',
    nameCs: 'bernardýn',
    nameEn: 'Saint Bernard',
    ear: 'drop',
    snout: 'medium',
    build: 'tall',
    tail: 'bushy',
    coats: ['patched', 'rust', 'white', 'brown', 'tan'],
  },
  {
    id: 'yorkshire',
    nameCs: 'jorkšír',
    nameEn: 'Yorkshire terrier',
    ear: 'prick',
    snout: 'short',
    build: 'compact',
    tail: 'sickle',
    coats: ['grey', 'tan', 'black', 'brown', 'gold'],
  },
  {
    id: 'cocker-spaniel',
    nameCs: 'kokršpaněl',
    nameEn: 'Cocker spaniel',
    ear: 'drop',
    snout: 'medium',
    build: 'standard',
    tail: 'bushy',
    coats: ['gold', 'chocolate', 'black', 'cream', 'patched'],
  },
  {
    id: 'akita',
    nameCs: 'akita',
    nameEn: 'Akita',
    ear: 'prick',
    snout: 'medium',
    build: 'standard',
    tail: 'curl',
    coats: ['rust', 'cream', 'white', 'fawn', 'black'],
  },
  {
    id: 'mixed',
    nameCs: 'kříženec',
    nameEn: 'Mixed breed',
    ear: 'semi',
    snout: 'medium',
    build: 'standard',
    tail: 'saber',
    coats: ['tan', 'black', 'patched', 'spots', 'brown'],
  },
]

export const DOG_BREED_IDS = DOG_BREEDS.map((b) => b.id)
export const DOG_BREED_BY_ID: Record<string, DogBreed> = Object.fromEntries(
  DOG_BREEDS.map((b) => [b.id, b]),
)

export const DOG_TAILS: DogTail[] = ['curl', 'saber', 'bushy', 'stub', 'sickle']
export const DOG_COLLARS: DogCollar[] = ['none', 'flat', 'bandana', 'spiked']

/** A fixed accent used for collars (kept out of the coat palette). */
export const COLLAR_COLOR = '#c2410c'

export const DEFAULT_DOG: DogConfig = {
  breed: 'labrador',
  coat: 'gold',
  tail: 'saber',
  collar: 'flat',
  colorway: 0,
}

const PREFIX = 'dog:'

export function isDogAvatar(src: string | null | undefined): boolean {
  return typeof src === 'string' && src.startsWith(PREFIX)
}

export function serializeDog(c: DogConfig): string {
  return `${PREFIX}${c.breed}:${c.coat}:${c.tail}:${c.collar}:${c.colorway}`
}

/** Map the six legacy head-only styles onto the closest new breed. */
const LEGACY_STYLE_TO_BREED: Record<string, string> = {
  classic: 'labrador',
  shiba: 'shiba',
  floppy: 'beagle',
  husky: 'husky',
  spot: 'dalmatian',
  puppy: 'pug',
}

function coerce<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function parseDog(src: string | null | undefined): DogConfig {
  if (!isDogAvatar(src)) return DEFAULT_DOG
  const parts = (src as string).split(':') // ['dog', ...]

  // New format: dog:breed:coat:tail:collar[:colorway] (colorway is optional so
  // pre-colorway tokens still parse — they default to colorway 0).
  if (parts.length >= 5) {
    const breed = coerce(parts[1], DOG_BREED_IDS, DEFAULT_DOG.breed)
    return {
      breed,
      coat: coerce(parts[2], DOG_COAT_IDS, DOG_BREED_BY_ID[breed].coats[0]),
      tail: coerce(parts[3], DOG_TAILS, DOG_BREED_BY_ID[breed].tail),
      collar: coerce(parts[4], DOG_COLLARS, 'flat'),
      colorway: coerceColorway(parts[5]),
    }
  }

  // Legacy format: dog:style:color:size  → map style→breed, color→coat.
  const breed = LEGACY_STYLE_TO_BREED[parts[1]] ?? DEFAULT_DOG.breed
  const coat = coerce(parts[2] ?? '', DOG_COAT_IDS, DOG_BREED_BY_ID[breed].coats[0])
  return { breed, coat, tail: DOG_BREED_BY_ID[breed].tail, collar: 'flat', colorway: 0 }
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
  const breed = DOG_BREEDS[h % DOG_BREEDS.length]
  return {
    breed: breed.id,
    coat: breed.coats[(h >>> 3) % breed.coats.length],
    tail: breed.tail,
    collar: DOG_COLLARS[1 + ((h >>> 6) % (DOG_COLLARS.length - 1))], // never 'none' by default
    colorway: (h >>> 9) % DOG_COLORWAY_COUNT,
  }
}
