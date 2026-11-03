import { classifyPose, measureCalibration } from './classifier'
import type { Calibration, Landmark } from './types'

/** 차렷 자세를 durationMs 동안 유지하면 기준값(골반 높이, 몸통 길이)을 평균내서 저장. */
export class Calibrator {
  private samples: Calibration[] = []
  private startedAt: number | null = null
  private lastNeutralAt = 0

  constructor(private readonly durationMs = 2000, private readonly graceMs = 250) {}

  reset() {
    this.samples = []
    this.startedAt = null
  }

  /** Returns progress 0..1 and the calibration once finished. */
  update(lm: Landmark[] | null, now: number): { progress: number; result: Calibration | null } {
    const sample = lm && classifyPose(lm, null) === 'NEUTRAL' ? measureCalibration(lm) : null
    if (sample) {
      if (this.startedAt === null) this.startedAt = now
      this.lastNeutralAt = now
      this.samples.push(sample)
    } else if (this.startedAt !== null && now - this.lastNeutralAt > this.graceMs) {
      this.reset()
    }
    if (this.startedAt === null) return { progress: 0, result: null }
    const progress = Math.min(1, (now - this.startedAt) / this.durationMs)
    if (progress < 1) return { progress, result: null }
    const n = this.samples.length || 1
    const avg = (k: keyof Calibration) => this.samples.reduce((s, c) => s + c[k], 0) / n
    const result = { hipY: avg('hipY'), torso: avg('torso'), shoulderWidth: avg('shoulderWidth') }
    this.reset()
    return { progress: 1, result }
  }
}
