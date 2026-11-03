import { describe, expect, it } from 'vitest'
import { buildBody, semaphoreBody } from './fixtures'
import { clockAngle, quantizeDir, readSemaphore, SEMAPHORE_TABLE, symbolFromDirs, type SemaphoreSymbol } from './semaphore'

const ALL = Object.keys(SEMAPHORE_TABLE) as SemaphoreSymbol[]

describe('semaphore', () => {
  it('table has 26 letters + 2 specials, all pairs unique', () => {
    expect(ALL).toHaveLength(28)
    const keys = new Set(Object.values(SEMAPHORE_TABLE).map(([a, b]) => [a, b].sort().join('-')))
    expect(keys.size).toBe(28)
  })

  it.each(ALL)('reads %s from a body', (s) => {
    expect(readSemaphore(semaphoreBody(s)).symbol).toBe(s)
  })

  it('is order independent', () => {
    expect(symbolFromDirs(4, 5)).toBe('A')
    expect(symbolFromDirs(5, 4)).toBe('A')
    expect(symbolFromDirs(4, 4)).toBeNull()
  })

  it('rest position (both arms down) is no letter', () => {
    expect(readSemaphore(buildBody({ left: { theta: 0 }, right: { theta: 0 } })).symbol).toBeNull()
  })

  it('A = signaler right arm low-out (observer 7:30), other arm down', () => {
    const r = readSemaphore(buildBody({ right: { theta: 45 }, left: { theta: 0 } }))
    expect(r.rightDir).toBe(5)
    expect(r.symbol).toBe('A')
  })

  it('quantizes with tolerance', () => {
    expect(quantizeDir(0)).toBe(0)
    expect(quantizeDir(355)).toBe(0)
    expect(quantizeDir(100)).toBe(2)
    expect(quantizeDir(67)).toBeNull() // between 45 and 90 → ambiguous
    expect(clockAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90)
    expect(clockAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(180)
  })

  it('bent arms do not count', () => {
    expect(readSemaphore(buildBody({ right: { theta: 90, bend: 90 }, left: { theta: 0 } })).symbol).toBeNull()
  })
})
