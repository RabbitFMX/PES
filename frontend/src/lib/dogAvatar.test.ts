import { describe, expect, it } from 'vitest'
import {
  DOG_BREED_BY_ID,
  DOG_BREED_IDS,
  DOG_COAT_IDS,
  dogFromSeed,
  isDogAvatar,
  parseDog,
  serializeDog,
} from './dogAvatar'

describe('dog avatar token', () => {
  it('detects dog tokens', () => {
    expect(isDogAvatar('dog:husky:grey:curl:flat')).toBe(true)
    expect(isDogAvatar('https://example.com/a.png')).toBe(false)
    expect(isDogAvatar(null)).toBe(false)
  })

  it('round-trips a config', () => {
    const cfg = { breed: 'husky', coat: 'grey', tail: 'curl', collar: 'bandana' } as const
    expect(parseDog(serializeDog(cfg))).toEqual(cfg)
  })

  it('coerces unknown parts to sensible defaults', () => {
    const cfg = parseDog('dog:nope:nope:nope:nope')
    expect(DOG_BREED_IDS).toContain(cfg.breed)
    expect(DOG_COAT_IDS).toContain(cfg.coat)
  })

  it('migrates legacy head-only tokens (dog:style:color:size)', () => {
    const cfg = parseDog('dog:spot:tan:md') // old dalmatian-ish "spot" style
    expect(cfg.breed).toBe('dalmatian')
    expect(cfg.coat).toBe('tan') // tan is still a valid coat id
    // tail falls back to the breed default; collar defaults to flat
    expect(cfg.tail).toBe(DOG_BREED_BY_ID.dalmatian.tail)
    expect(cfg.collar).toBe('flat')
  })

  it('legacy unknown colour falls back to a breed-appropriate coat', () => {
    const cfg = parseDog('dog:husky:notacolour:lg')
    expect(cfg.breed).toBe('husky')
    expect(DOG_BREED_BY_ID.husky.coats).toContain(cfg.coat)
  })

  it('dogFromSeed is deterministic and valid', () => {
    const a = dogFromSeed('member-1')
    const b = dogFromSeed('member-1')
    expect(a).toEqual(b)
    expect(DOG_BREED_IDS).toContain(a.breed)
    expect(DOG_BREED_BY_ID[a.breed].coats).toContain(a.coat)
    expect(a.collar).not.toBe('none')
  })
})
