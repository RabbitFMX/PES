/**
 * Activity → icon mapping (pure; the SVG glyphs live in components/ActivityIcon).
 * Near-identical variants (bike types, bodyweight moves) share a glyph; unknown
 * ids fall back to 'generic'.
 */

export type ActivityIconKey =
  | 'run'
  | 'hike'
  | 'swim'
  | 'paddle'
  | 'kayak'
  | 'skate'
  | 'bike'
  | 'stroller'
  | 'ski'
  | 'timer'
  | 'plank'
  | 'strength'
  | 'burpee'
  | 'bar'
  | 'yoga'
  | 'jumprope'
  | 'football'
  | 'racket'
  | 'basketball'
  | 'dumbbell'
  | 'route'
  | 'flag'
  | 'trophy'
  | 'generic'

const ICON_BY_ACTIVITY: Record<string, ActivityIconKey> = {
  run: 'run',
  hike: 'hike',
  swim: 'swim',
  paddleboard: 'paddle',
  kayak: 'kayak',
  skates: 'skate',
  'bike-road': 'bike',
  'bike-gravel': 'bike',
  'bike-mtb': 'bike',
  'bike-stroller': 'stroller',
  xcski: 'ski',
  skitour: 'ski',
  downhill: 'ski',
  tabata: 'timer',
  plank: 'plank',
  'plank-sally': 'plank',
  pushups: 'strength',
  squats: 'strength',
  situps: 'strength',
  'mountain-climber': 'strength',
  lunges: 'strength',
  'hip-raises': 'strength',
  vups: 'strength',
  burpees: 'burpee',
  'burpees-pushup': 'burpee',
  pullups: 'bar',
  dips: 'bar',
  'hanging-leg-raises': 'bar',
  'sun-salutation': 'yoga',
  jumprope: 'jumprope',
  // Sport buckets use distinct sport glyphs; extra keys (racket/basketball) are
  // available for any sport activities an admin adds to the rate table.
  sports: 'football',
  exercise: 'dumbbell',
  strava: 'route',
  race: 'flag',
  ondra: 'trophy',
}

export function activityIconKey(activityId: string | null | undefined): ActivityIconKey {
  if (!activityId) return 'generic'
  return ICON_BY_ACTIVITY[activityId] ?? 'generic'
}
