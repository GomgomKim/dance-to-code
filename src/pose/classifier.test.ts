import { describe, expect, it } from 'vitest'
import { analyzePose, classifyPose, measureCalibration } from './classifier'
import { buildBody, POSE_FIXTURES } from './fixtures'
import { LM, type Landmark, type TokenPoseId } from './types'

const calib = measureCalibration(buildBody(POSE_FIXTURES.NEUTRAL))!

/** mirror a raw frame horizontally (what a selfie-camera would do) and swap L/R labels. */
function flipAndSwap(lm: Landmark[]): Landmark[] {
  const flipped = lm.map((p) => ({ ...p, x: 1 - p.x }))
  const swap: Array<[number, number]> = [
    [11, 12], [13, 14], [15, 16], [17, 18], [19, 20], [21, 22], [23, 24], [25, 26], [27, 28], [29, 30], [31, 32],
  ]
  const out = [...flipped]
  for (const [a, b] of swap) { out[a] = flipped[b]; out[b] = flipped[a] }
  return out
}

describe('classifyPose', () => {
  const cases = Object.keys(POSE_FIXTURES) as Array<TokenPoseId | 'NEUTRAL'>
  it.each(cases)('recognises %s', (id) => {
    expect(classifyPose(buildBody(POSE_FIXTURES[id]), calib)).toBe(id)
  })

  it.each(cases)('%s is invariant to position and distance from camera', (id) => {
    const zoomedCalib = measureCalibration(buildBody({ ...POSE_FIXTURES.NEUTRAL, offset: { x: 0.12, y: 0.05 }, zoom: 0.7 }))
    const lm = buildBody({ ...POSE_FIXTURES[id], offset: { x: 0.12, y: 0.05 }, zoom: 0.7 })
    expect(classifyPose(lm, zoomedCalib)).toBe(id)
  })

  it('arms down without calibration is NEUTRAL, never RUN', () => {
    expect(classifyPose(buildBody(POSE_FIXTURES.RUN), null)).toBe('NEUTRAL')
  })

  it('small bounce is not a jump', () => {
    expect(classifyPose(buildBody({ ...POSE_FIXTURES.NEUTRAL, lift: 0.05 }), calib)).toBe('NEUTRAL')
  })

  it('distinguishes right vs left arm independent of the mirrored preview', () => {
    // Mirroring the image AND swapping the anatomical labels is the same person doing the opposite side
    expect(classifyPose(flipAndSwap(buildBody(POSE_FIXTURES.RIGHT_SIDE)), calib)).toBe('LEFT_SIDE')
    expect(classifyPose(flipAndSwap(buildBody(POSE_FIXTURES.LEFT_SIDE)), calib)).toBe('RIGHT_SIDE')
  })

  it('both arms sideways (T pose) is not a single-side pose', () => {
    expect(classifyPose(buildBody({ left: { theta: 90 }, right: { theta: 90 } }), calib)).toBeNull()
  })

  it('arms up but close together is not a V', () => {
    expect(classifyPose(buildBody({ left: { theta: 178 }, right: { theta: 178 } }), calib)).toBeNull()
  })

  it('left hand on head also counts', () => {
    const lm = buildBody({ right: { theta: 0 }, left: { elbow: { x: 0.9, y: -0.5 }, wrist: { x: 0.1, y: -1.0 } } })
    expect(classifyPose(lm, calib)).toBe('HAND_ON_HEAD')
  })

  it('bent arm out to the side is not RIGHT_SIDE', () => {
    expect(classifyPose(buildBody({ left: { theta: 0 }, right: { theta: 90, bend: 80 } }), calib)).toBeNull()
  })

  it('returns null when key landmarks are not visible', () => {
    const lm = buildBody(POSE_FIXTURES.V_UP)
    lm[LM.LEFT_WRIST] = { ...lm[LM.LEFT_WRIST], visibility: 0.1 }
    expect(classifyPose(lm, calib)).toBeNull()
    expect(classifyPose(null)).toBeNull()
    expect(classifyPose([])).toBeNull()
  })

  it('reports arm angles', () => {
    const a = analyzePose(buildBody(POSE_FIXTURES.RIGHT_SIDE), calib)!
    expect(a.right.theta).toBeCloseTo(90, 0)
    expect(a.left.theta).toBeCloseTo(0, 0)
    expect(a.right.elbowAngle).toBeCloseTo(180, 0)
  })
})
