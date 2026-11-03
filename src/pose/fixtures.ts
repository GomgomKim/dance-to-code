/**
 * Synthetic landmark generator. Used by unit tests AND by the keyboard-simulation
 * mode to draw a stick figure for the simulated pose.
 * Output is in raw camera orientation, square units (aspect 1), y down.
 */
import type { Vec } from './geometry'
import { LANDMARK_COUNT, LM, type Landmark, type TokenPoseId } from './types'
import { SEMAPHORE_TABLE, type Dir, type SemaphoreSymbol } from './semaphore'

const SW = 0.2 // shoulder width
const ORIGIN = { x: 0.5, y: 0.35 } // mid shoulder
const UPPER = 0.65 // upper arm length (in shoulder widths)
const FORE = 0.6

export type ArmSpec =
  /** theta: 0 = down, 90 = out, 180 = up, negative = across body. bend rotates forearm. */
  | { theta: number; bend?: number }
  /** Clock direction as seen by the camera (0 = up, 90 = observer's right). */
  | { clock: number }
  /** Explicit body-local points (shoulder widths, +x = person's left, +y = down). */
  | { elbow: Vec; wrist: Vec }

export interface BodySpec {
  left: ArmSpec
  right: ArmSpec
  /** Raise the whole body by this many shoulder widths (jumping). */
  lift?: number
  /** Shift / scale the whole figure to make sure rules are position/size invariant. */
  offset?: Vec
  zoom?: number
}

const deg = (d: number) => (d * Math.PI) / 180

function armPoints(spec: ArmSpec, outward: 1 | -1, shoulder: Vec): { elbow: Vec; wrist: Vec } {
  if ('elbow' in spec) return { elbow: spec.elbow, wrist: spec.wrist }
  let theta: number
  let bend = 0
  if ('clock' in spec) {
    // raw dir = (sin a, -cos a); local dir = (outward*sin θ, cos θ)
    theta = outward === 1 ? 180 - spec.clock : spec.clock - 180
  } else {
    theta = spec.theta
    bend = spec.bend ?? 0
  }
  const dir = (t: number) => ({ x: outward * Math.sin(deg(t)), y: Math.cos(deg(t)) })
  const d1 = dir(theta)
  const elbow = { x: shoulder.x + d1.x * UPPER, y: shoulder.y + d1.y * UPPER }
  const d2 = dir(theta + bend)
  return { elbow, wrist: { x: elbow.x + d2.x * FORE, y: elbow.y + d2.y * FORE } }
}

export function buildBody(spec: BodySpec): Landmark[] {
  const lift = spec.lift ?? 0
  const zoom = spec.zoom ?? 1
  const off = spec.offset ?? { x: 0, y: 0 }
  const local: Vec[] = Array.from({ length: LANDMARK_COUNT }, () => ({ x: 0, y: 0 }))
  const set = (i: number, x: number, y: number) => { local[i] = { x, y } }

  // face
  set(LM.NOSE, 0, -0.55)
  for (let i = 1; i <= 10; i++) set(i, (i <= 3 ? 0.12 : i <= 6 ? -0.12 : i === 7 ? 0.3 : i === 8 ? -0.3 : i === 9 ? 0.08 : -0.08), i <= 6 ? -0.65 : i <= 8 ? -0.6 : -0.42)
  // torso
  set(LM.LEFT_SHOULDER, 0.5, 0)
  set(LM.RIGHT_SHOULDER, -0.5, 0)
  set(LM.LEFT_HIP, 0.25, 1.5)
  set(LM.RIGHT_HIP, -0.25, 1.5)
  set(LM.LEFT_KNEE, 0.28, 2.3)
  set(LM.RIGHT_KNEE, -0.28, 2.3)
  set(LM.LEFT_ANKLE, 0.3, 3.1)
  set(LM.RIGHT_ANKLE, -0.3, 3.1)
  set(29, 0.3, 3.2); set(30, -0.3, 3.2); set(31, 0.4, 3.25); set(32, -0.4, 3.25)

  const l = armPoints(spec.left, 1, local[LM.LEFT_SHOULDER])
  const r = armPoints(spec.right, -1, local[LM.RIGHT_SHOULDER])
  local[LM.LEFT_ELBOW] = l.elbow; local[LM.LEFT_WRIST] = l.wrist
  local[LM.RIGHT_ELBOW] = r.elbow; local[LM.RIGHT_WRIST] = r.wrist
  // hand points (pinky/index/thumb) slightly beyond the wrist
  const hand = (w: Vec, e: Vec, k: number): Vec => ({ x: w.x + (w.x - e.x) * k, y: w.y + (w.y - e.y) * k })
  ;[17, 19, 21].forEach((i, n) => { local[i] = hand(l.wrist, l.elbow, 0.12 + n * 0.03) })
  ;[18, 20, 22].forEach((i, n) => { local[i] = hand(r.wrist, r.elbow, 0.12 + n * 0.03) })

  return local.map((p) => ({
    // body-local +x (person's left) is image +x when facing the camera
    x: ORIGIN.x + off.x + p.x * SW * zoom,
    y: ORIGIN.y + off.y + (p.y - lift) * SW * zoom,
    z: 0,
    visibility: 1,
  }))
}

const DOWN: ArmSpec = { theta: 0 }

/** Canonical body spec per token pose (and 차렷). */
export const POSE_FIXTURES: Record<TokenPoseId | 'NEUTRAL', BodySpec> = {
  NEUTRAL: { left: DOWN, right: DOWN },
  V_UP: { left: { theta: 150 }, right: { theta: 150 } },
  RIGHT_SIDE: { left: DOWN, right: { theta: 90 } },
  LEFT_SIDE: { left: { theta: 90 }, right: DOWN },
  CROSS: {
    left: { elbow: { x: 0.75, y: 0.6 }, wrist: { x: -0.3, y: 0.35 } },
    right: { elbow: { x: -0.75, y: 0.6 }, wrist: { x: 0.3, y: 0.45 } },
  },
  HAND_ON_HEAD: { left: DOWN, right: { elbow: { x: -0.9, y: -0.5 }, wrist: { x: -0.1, y: -1.0 } } },
  HANDS_ON_HIPS: {
    left: { elbow: { x: 0.95, y: 0.75 }, wrist: { x: 0.35, y: 1.4 } },
    right: { elbow: { x: -0.95, y: 0.75 }, wrist: { x: -0.35, y: 1.4 } },
  },
  RUN: { left: DOWN, right: DOWN, lift: 0.5 },
}

export const DIR_TO_CLOCK = (d: Dir) => d * 45

/** A body performing the given semaphore symbol. */
export function semaphoreBody(symbol: SemaphoreSymbol): Landmark[] {
  const [a, b] = SEMAPHORE_TABLE[symbol]
  // Prefer the natural arm: observer-left directions (5,6,7) → signaler's right arm.
  const leftSide = (d: Dir) => d >= 5
  let rightDir = a, leftDir = b
  if (leftSide(b) && !leftSide(a)) { rightDir = b; leftDir = a }
  return buildBody({ right: { clock: DIR_TO_CLOCK(rightDir) }, left: { clock: DIR_TO_CLOCK(leftDir) } })
}
