/**
 * Minimal classNames joiner — accepts strings, falsy values, and objects
 * ({ 'class': condition }). No dependency needed for this small surface.
 */
type ClassValue = string | false | null | undefined | Record<string, boolean>

export function cn(...values: ClassValue[]): string {
  const out: string[] = []
  for (const v of values) {
    if (!v) continue
    if (typeof v === 'string') {
      out.push(v)
    } else {
      for (const [key, on] of Object.entries(v)) {
        if (on) out.push(key)
      }
    }
  }
  return out.join(' ')
}
