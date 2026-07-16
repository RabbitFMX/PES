/**
 * Maps an activity id to a "PES <role>" signature key (used with i18n
 * `stats.pes.*`). A member's title comes from their strongest activity.
 */
const PES_CATEGORY: Record<string, string> = {
  run: 'runner',
  swim: 'swimmer',
  hike: 'hiker',
  'bike-road': 'cyclist',
  'bike-gravel': 'cyclist',
  'bike-mtb': 'cyclist',
  'bike-stroller': 'cyclist',
  xcski: 'xcskier',
  skitour: 'skimo',
  downhill: 'skier',
  skates: 'skater',
  paddleboard: 'paddler',
  kayak: 'kayaker',
}
const STRONG = new Set([
  'pushups',
  'squats',
  'situps',
  'pullups',
  'dips',
  'burpees',
  'burpees-pushup',
  'plank',
  'plank-sally',
  'lunges',
  'mountain-climber',
  'hip-raises',
  'hanging-leg-raises',
  'jumprope',
  'tabata',
  'sun-salutation',
  'vups',
])

export function pesCategory(activityId: string): string {
  return PES_CATEGORY[activityId] ?? (STRONG.has(activityId) ? 'strong' : 'athlete')
}
