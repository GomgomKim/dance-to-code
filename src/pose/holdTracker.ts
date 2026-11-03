/**
 * Debounce: a pose must be held for `holdMs` before it is confirmed.
 * Pure state machine — time is passed in, so it is trivially unit-testable.
 */
export interface HoldTrackerOptions {
  holdMs: number | ((pose: string) => number)
  /** Brief misdetections shorter than this don't reset the hold. */
  gapMs?: number
}

export interface HoldState {
  /** Pose currently being held (or locked after confirm). */
  candidate: string | null
  /** 0..1 progress of the hold. */
  progress: number
  /** Set only on the frame the pose gets confirmed. */
  confirmed: string | null
  /** True while the confirmed pose is still being held (no re-trigger). */
  locked: boolean
}

export class HoldTracker {
  private candidate: string | null = null
  private startedAt = 0
  private lastSeenAt = 0
  private locked: string | null = null
  private lockLastSeenAt = 0
  private readonly gapMs: number

  constructor(private readonly opts: HoldTrackerOptions) {
    this.gapMs = opts.gapMs ?? 150
  }

  private holdFor(pose: string) {
    return typeof this.opts.holdMs === 'function' ? this.opts.holdMs(pose) : this.opts.holdMs
  }

  reset() {
    this.candidate = null
    this.locked = null
  }

  update(pose: string | null, now: number): HoldState {
    // After a confirm, the same pose must be released (for > gapMs) before it can fire again.
    if (this.locked !== null) {
      if (pose === this.locked) {
        this.lockLastSeenAt = now
        return { candidate: pose, progress: 1, confirmed: null, locked: true }
      }
      if (now - this.lockLastSeenAt <= this.gapMs && pose === null) {
        return { candidate: this.locked, progress: 1, confirmed: null, locked: true }
      }
      this.locked = null
    }

    if (pose !== null && pose === this.candidate) {
      this.lastSeenAt = now
    } else if (pose !== null) {
      this.candidate = pose
      this.startedAt = now
      this.lastSeenAt = now
    } else if (this.candidate !== null && now - this.lastSeenAt > this.gapMs) {
      this.candidate = null
    }

    if (this.candidate === null) return { candidate: null, progress: 0, confirmed: null, locked: false }

    const progress = Math.min(1, (now - this.startedAt) / Math.max(1, this.holdFor(this.candidate)))
    if (progress >= 1 && pose === this.candidate) {
      const confirmed = this.candidate
      this.locked = confirmed
      this.lockLastSeenAt = now
      this.candidate = null
      return { candidate: confirmed, progress: 1, confirmed, locked: false }
    }
    return { candidate: this.candidate, progress, confirmed: null, locked: false }
  }
}
