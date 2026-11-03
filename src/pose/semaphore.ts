import { angleDiff, dist, isVisible, jointAngle, rad2deg, sub } from './geometry'
import { LM, type Landmark } from './types'

/**
 * Flag semaphore. Arm directions are expressed as clock positions seen by the
 * OBSERVER (= the raw, un-mirrored camera): 0 = 12시, 1 = 1시반, 2 = 3시, 3 = 4시반,
 * 4 = 6시, 5 = 7시반, 6 = 9시, 7 = 10시반.
 * A letter is an unordered pair of the two arm directions, so it doesn't matter
 * which arm crosses the body.
 */
export type Dir = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
export type SemaphoreSymbol =
  | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M'
  | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'
  | 'SPACE' | 'CANCEL'

export const SEMAPHORE_TABLE: Record<SemaphoreSymbol, [Dir, Dir]> = {
  A: [5, 4], B: [6, 4], C: [7, 4], D: [0, 4], E: [1, 4], F: [2, 4], G: [3, 4],
  H: [6, 5], I: [7, 5], J: [0, 2], K: [5, 0], L: [5, 1], M: [5, 2], N: [5, 3],
  O: [7, 6], P: [6, 0], Q: [6, 1], R: [6, 2], S: [6, 3],
  T: [7, 0], U: [7, 1], V: [0, 3], W: [1, 2], X: [1, 3], Y: [7, 2], Z: [2, 3],
  // "numerals" 신호 자리를 띄어쓰기로, "annul"(취소) 신호를 지우기로 사용
  SPACE: [0, 1],
  CANCEL: [7, 3],
}

const key = (a: Dir, b: Dir) => (a < b ? `${a}-${b}` : `${b}-${a}`)
const LOOKUP = new Map<string, SemaphoreSymbol>(
  (Object.entries(SEMAPHORE_TABLE) as Array<[SemaphoreSymbol, [Dir, Dir]]>).map(([s, [a, b]]) => [key(a, b), s]),
)

export const SEMAPHORE_TOLERANCE_DEG = 20
export const SEMAPHORE_MIN_ELBOW = 130

/** Clock angle in degrees (0 = up, 90 = observer's right) of the vector a→b. */
export function clockAngle(from: { x: number; y: number }, to: { x: number; y: number }): number {
  const d = sub(to, from)
  return (rad2deg(Math.atan2(d.x, -d.y)) + 360) % 360
}

export function quantizeDir(angle: number, tolerance = SEMAPHORE_TOLERANCE_DEG): Dir | null {
  const idx = Math.round(angle / 45) % 8
  return angleDiff(angle, idx * 45) <= tolerance ? (idx as Dir) : null
}

export function symbolFromDirs(a: Dir | null, b: Dir | null): SemaphoreSymbol | null {
  if (a === null || b === null || a === b) return null
  return LOOKUP.get(key(a, b)) ?? null
}

export interface SemaphoreReading {
  symbol: SemaphoreSymbol | null
  rightDir: Dir | null
  leftDir: Dir | null
}

function armDir(lm: Landmark[], s: number, e: number, w: number): Dir | null {
  const shoulder = lm[s], elbow = lm[e], wrist = lm[w]
  if (![shoulder, elbow, wrist].every((p) => isVisible(p))) return null
  if (jointAngle(shoulder, elbow, wrist) < SEMAPHORE_MIN_ELBOW) return null
  const sw = dist(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER])
  if (dist(shoulder, wrist) < sw * 0.6) return null
  return quantizeDir(clockAngle(shoulder, wrist))
}

/** Pure: landmarks (square units, raw camera orientation) → semaphore symbol. */
export function readSemaphore(lm: Landmark[] | null | undefined): SemaphoreReading {
  if (!lm || lm.length < 17) return { symbol: null, rightDir: null, leftDir: null }
  const rightDir = armDir(lm, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST)
  const leftDir = armDir(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST)
  return { symbol: symbolFromDirs(rightDir, leftDir), rightDir, leftDir }
}
