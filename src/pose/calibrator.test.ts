import { describe, expect, it } from 'vitest'
import { Calibrator } from './calibrator'
import { buildBody, POSE_FIXTURES } from './fixtures'

describe('Calibrator', () => {
  const neutral = buildBody(POSE_FIXTURES.NEUTRAL)
  it('finishes after 2s of 차렷', () => {
    const c = new Calibrator(2000)
    expect(c.update(neutral, 0).progress).toBe(0)
    expect(c.update(neutral, 1000).progress).toBeCloseTo(0.5)
    const done = c.update(neutral, 2000)
    expect(done.result).not.toBeNull()
    expect(done.result!.hipY).toBeCloseTo(neutral[23].y)
  })
  it('restarts if you move', () => {
    const c = new Calibrator(2000, 200)
    c.update(neutral, 0)
    c.update(neutral, 1500)
    c.update(buildBody(POSE_FIXTURES.V_UP), 1600)
    c.update(buildBody(POSE_FIXTURES.V_UP), 1900)
    expect(c.update(neutral, 2000).progress).toBe(0)
  })
})
