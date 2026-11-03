import { add, dist, isVisible, jointAngle, mid, norm, rad2deg, scale, sub, type Vec } from './geometry'
import { LM, type Calibration, type ClassifiedPose, type Landmark } from './types'

/**
 * Body-centric coordinate frame.
 *  - origin: mid point between the shoulders
 *  - +x: towards the person's LEFT side, +y: towards the hips (down)
 *  - unit: shoulder width
 * Working in this frame makes the rules independent of where the dancer stands,
 * how far from the camera they are, and whether the preview is mirrored.
 */
export interface BodyFrame {
  origin: Vec
  ex: Vec
  ey: Vec
  shoulderWidth: number
  toLocal(p: Vec): Vec
  toImage(p: Vec): Vec
}

export function bodyFrame(lm: Landmark[]): BodyFrame {
  const ls = lm[LM.LEFT_SHOULDER]
  const rs = lm[LM.RIGHT_SHOULDER]
  const origin = mid(ls, rs)
  const shoulderWidth = dist(ls, rs) || 1e-6
  const ex = norm(sub(ls, rs))
  const ey = { x: -ex.y, y: ex.x }
  return {
    origin,
    ex,
    ey,
    shoulderWidth,
    toLocal(p) {
      const d = sub(p, origin)
      return { x: (d.x * ex.x + d.y * ex.y) / shoulderWidth, y: (d.x * ey.x + d.y * ey.y) / shoulderWidth }
    },
    toImage(p) {
      return add(origin, add(scale(ex, p.x * shoulderWidth), scale(ey, p.y * shoulderWidth)))
    },
  }
}

export interface ArmMetrics {
  shoulder: Vec
  elbow: Vec
  wrist: Vec
  /** Shoulder→wrist direction. 0 = straight down, 90 = out to the side, ±180 = up,
   *  negative = across the body. */
  theta: number
  /** Interior elbow angle. 180 = straight arm. */
  elbowAngle: number
}

export type Side = 'left' | 'right'

export function armMetrics(lm: Landmark[], frame: BodyFrame, side: Side): ArmMetrics {
  const idx = side === 'left'
    ? [LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST]
    : [LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW, LM.RIGHT_WRIST]
  const [shoulder, elbow, wrist] = idx.map((i) => frame.toLocal(lm[i]))
  const outward = side === 'left' ? 1 : -1
  const d = sub(wrist, shoulder)
  return {
    shoulder,
    elbow,
    wrist,
    theta: rad2deg(Math.atan2(outward * d.x, d.y)),
    elbowAngle: jointAngle(shoulder, elbow, wrist),
  }
}

/** Tunable thresholds. Units are shoulder widths / degrees. */
export const THRESHOLDS = {
  armDownMaxTheta: 30,
  straightElbow: 145,
  /** Jump: hips must rise by this fraction of the calibrated torso length. */
  jumpRise: 0.12,
  vMinWristSpread: 1.4,
  vMinElbow: 120,
  headWristMaxX: 0.9,
  sideThetaMin: 60,
  sideThetaMax: 125,
  sideMinElbow: 140,
  otherArmDownMaxTheta: 35,
  crossMinY: -0.4,
  crossMaxY: 1.2,
  hipsWristMaxDist: 0.7,
  hipsElbowMinX: 0.75,
  hipsMaxElbow: 150,
}

const REQUIRED = [
  LM.LEFT_SHOULDER, LM.RIGHT_SHOULDER, LM.LEFT_ELBOW, LM.RIGHT_ELBOW, LM.LEFT_WRIST, LM.RIGHT_WRIST,
]

export function hipsVisible(lm: Landmark[]) {
  return isVisible(lm[LM.LEFT_HIP]) && isVisible(lm[LM.RIGHT_HIP])
}

/** How much the hips are raised relative to the calibrated baseline, in torso lengths. */
export function jumpAmount(lm: Landmark[], calib: Calibration | null | undefined): number {
  if (!calib || !hipsVisible(lm)) return 0
  const hipY = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP]).y
  return (calib.hipY - hipY) / (calib.torso || 1e-6)
}

export interface PoseAnalysis {
  pose: ClassifiedPose
  left: ArmMetrics
  right: ArmMetrics
  jump: number
}

/**
 * Pure pose classifier: landmarks (+ optional calibration) → pose id.
 * Landmarks must be in square units (x multiplied by aspect ratio), raw camera orientation.
 */
export function analyzePose(lm: Landmark[] | null | undefined, calib?: Calibration | null): PoseAnalysis | null {
  if (!lm || lm.length < 25 || !REQUIRED.every((i) => isVisible(lm[i]))) return null
  const T = THRESHOLDS
  const frame = bodyFrame(lm)
  const left = armMetrics(lm, frame, 'left')
  const right = armMetrics(lm, frame, 'right')
  const jump = jumpAmount(lm, calib)
  const result = (pose: ClassifiedPose): PoseAnalysis => ({ pose, left, right, jump })

  const isDown = (a: ArmMetrics, maxTheta = T.armDownMaxTheta) => Math.abs(a.theta) <= maxTheta
  const hips = hipsVisible(lm)

  // 1. 양팔 아래로 쭉 (+ 점프 = 실행, 아니면 차렷)
  if (isDown(left) && isDown(right) && left.elbowAngle >= T.straightElbow && right.elbowAngle >= T.straightElbow) {
    return result(jump >= T.jumpRise ? 'RUN' : 'NEUTRAL')
  }

  const nose = isVisible(lm[LM.NOSE]) ? frame.toLocal(lm[LM.NOSE]) : { x: 0, y: -0.6 }
  const leftUp = left.wrist.y < nose.y
  const rightUp = right.wrist.y < nose.y

  // 2. 양팔 위로 V
  if (leftUp && rightUp) {
    const spread = left.wrist.x - right.wrist.x
    if (spread >= T.vMinWristSpread && left.elbowAngle >= T.vMinElbow && right.elbowAngle >= T.vMinElbow) {
      return result('V_UP')
    }
    return result(null)
  }

  // 3. 한 손 머리 위
  if (leftUp !== rightUp) {
    const up = leftUp ? left : right
    const other = leftUp ? right : left
    if (Math.abs(up.wrist.x - nose.x) <= T.headWristMaxX && other.wrist.y > 0.2) return result('HAND_ON_HEAD')
    return result(null)
  }

  // 4. 양팔 가슴 앞 교차 (오른손목이 몸의 왼쪽, 왼손목이 몸의 오른쪽)
  if (
    right.wrist.x > 0 && left.wrist.x < 0 &&
    [left.wrist.y, right.wrist.y].every((y) => y >= T.crossMinY && y <= T.crossMaxY)
  ) {
    return result('CROSS')
  }

  // 5. 양손 허리
  if (hips) {
    const lh = frame.toLocal(lm[LM.LEFT_HIP])
    const rh = frame.toLocal(lm[LM.RIGHT_HIP])
    if (
      dist(left.wrist, lh) <= T.hipsWristMaxDist && dist(right.wrist, rh) <= T.hipsWristMaxDist &&
      left.elbow.x >= T.hipsElbowMinX && right.elbow.x <= -T.hipsElbowMinX &&
      left.elbowAngle <= T.hipsMaxElbow && right.elbowAngle <= T.hipsMaxElbow
    ) {
      return result('HANDS_ON_HIPS')
    }
  }

  // 6. 한 팔만 옆으로
  const isSide = (a: ArmMetrics) =>
    a.theta >= T.sideThetaMin && a.theta <= T.sideThetaMax && a.elbowAngle >= T.sideMinElbow
  if (isSide(right) && isDown(left, T.otherArmDownMaxTheta)) return result('RIGHT_SIDE')
  if (isSide(left) && isDown(right, T.otherArmDownMaxTheta)) return result('LEFT_SIDE')

  return result(null)
}

export function classifyPose(lm: Landmark[] | null | undefined, calib?: Calibration | null): ClassifiedPose {
  return analyzePose(lm, calib)?.pose ?? null
}

/** Measure a calibration baseline from a single neutral frame. */
export function measureCalibration(lm: Landmark[]): Calibration | null {
  if (!hipsVisible(lm) || !isVisible(lm[LM.LEFT_SHOULDER]) || !isVisible(lm[LM.RIGHT_SHOULDER])) return null
  const sh = mid(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER])
  const hip = mid(lm[LM.LEFT_HIP], lm[LM.RIGHT_HIP])
  return { hipY: hip.y, torso: dist(sh, hip), shoulderWidth: dist(lm[LM.LEFT_SHOULDER], lm[LM.RIGHT_SHOULDER]) }
}
