import { describe, expect, it } from 'vitest'
import { HoldTracker } from './holdTracker'

function run(t: HoldTracker, frames: Array<[string | null, number]>) {
  return frames.map(([p, now]) => t.update(p, now))
}

describe('HoldTracker', () => {
  it('confirms after holding for holdMs, exactly once', () => {
    const t = new HoldTracker({ holdMs: 600 })
    const s = run(t, [['A', 0], ['A', 300], ['A', 599], ['A', 600], ['A', 900], ['A', 2000]])
    expect(s[1].progress).toBeCloseTo(0.5)
    expect(s.map((x) => x.confirmed)).toEqual([null, null, null, 'A', null, null])
    expect(s[5].locked).toBe(true)
  })

  it('switching pose restarts the timer', () => {
    const t = new HoldTracker({ holdMs: 600 })
    const s = run(t, [['A', 0], ['A', 500], ['B', 550], ['B', 1000], ['B', 1150]])
    expect(s.map((x) => x.confirmed)).toEqual([null, null, null, null, 'B'])
  })

  it('tolerates short detection gaps', () => {
    const t = new HoldTracker({ holdMs: 600, gapMs: 150 })
    const s = run(t, [['A', 0], [null, 60], [null, 140], ['A', 200], [null, 300], ['A', 400], ['A', 600]])
    expect(s[1].candidate).toBe('A')
    expect(s[6].confirmed).toBe('A')
  })

  it('long gaps reset', () => {
    const t = new HoldTracker({ holdMs: 600, gapMs: 150 })
    const s = run(t, [['A', 0], [null, 400], ['A', 450], ['A', 700], ['A', 1050]])
    expect(s[1].candidate).toBeNull()
    expect(s[3].confirmed).toBeNull()
    expect(s[4].confirmed).toBe('A')
  })

  it('the same pose can fire again after being released', () => {
    const t = new HoldTracker({ holdMs: 600, gapMs: 100 })
    const s = run(t, [['A', 0], ['A', 600], [null, 650], [null, 800], ['A', 900], ['A', 1500]])
    expect(s.filter((x) => x.confirmed === 'A')).toHaveLength(2)
  })

  it('a brief flicker while locked does not re-trigger', () => {
    const t = new HoldTracker({ holdMs: 600, gapMs: 150 })
    const s = run(t, [['A', 0], ['A', 600], [null, 650], ['A', 700], ['A', 1400]])
    expect(s.filter((x) => x.confirmed === 'A')).toHaveLength(1)
  })

  it('supports per-pose hold time', () => {
    const t = new HoldTracker({ holdMs: (p) => (p === 'RUN' ? 100 : 600) })
    const s = run(t, [['RUN', 0], ['RUN', 100]])
    expect(s[1].confirmed).toBe('RUN')
  })
})
