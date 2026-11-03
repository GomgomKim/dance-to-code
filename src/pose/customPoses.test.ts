import { describe, expect, it } from 'vitest'
import { CUSTOM_POSES } from '../config/poses'
import { classifyPose, measureCalibration } from './classifier'
import { inAngleRange } from './customPoses'
import { buildBody, POSE_FIXTURES, poseSpec } from './fixtures'

const calib = measureCalibration(buildBody(POSE_FIXTURES.NEUTRAL))!

describe('custom poses from config', () => {
  it.each(CUSTOM_POSES.map((p) => p.id))('%s is recognised from its rule', (id) => {
    expect(classifyPose(buildBody(poseSpec(id, CUSTOM_POSES)!), calib, CUSTOM_POSES)).toBe(id)
  })

  it('do not steal built-in poses', () => {
    for (const id of Object.keys(POSE_FIXTURES) as Array<keyof typeof POSE_FIXTURES>) {
      expect(classifyPose(buildBody(POSE_FIXTURES[id]), calib, CUSTOM_POSES)).toBe(id)
    }
  })

  it('a new rule can be added without touching the classifier', () => {
    const extra = [{
      id: 'POINT_LOW',
      rule: { right: { theta: [35, 55] as [number, number], minElbow: 150 }, left: { theta: [-25, 25] as [number, number] } },
    }]
    const lm = buildBody({ left: { theta: 0 }, right: { theta: 45 } })
    expect(classifyPose(lm, calib)).toBeNull()
    expect(classifyPose(lm, calib, extra)).toBe('POINT_LOW')
  })

  it('angle ranges can wrap around ±180', () => {
    expect(inAngleRange(-170, [150, 210])).toBe(true)
    expect(inAngleRange(170, [150, 210])).toBe(true)
    expect(inAngleRange(0, [150, 210])).toBe(false)
  })
})
