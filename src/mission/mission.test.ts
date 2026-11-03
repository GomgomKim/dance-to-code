import { describe, expect, it } from 'vitest'
import { runCode } from '../code/runner'
import { CUSTOM_POSES, POSE_INFO } from '../config/poses'
import { MISSION_CONTROLS, MISSIONS } from '../config/missions'
import { classifyPose, measureCalibration } from '../pose/classifier'
import { buildBody, POSE_FIXTURES, poseSpec } from '../pose/fixtures'
import { formatTime, isMissionCleared, matchingPrefix, missionAction, paletteKey, targetCode } from './mission'
import { insertRecord, loadRecords, saveRecord, type KeyValueStore } from './records'

const calib = measureCalibration(buildBody(POSE_FIXTURES.NEUTRAL))!

describe('missions config', () => {
  it('has 5 missions ordered from easy to hard', () => {
    expect(MISSIONS).toHaveLength(5)
    const d = MISSIONS.map((m) => m.difficulty)
    expect([...d].sort()).toEqual(d)
    expect(new Set(MISSIONS.map((m) => m.id)).size).toBe(MISSIONS.length)
  })

  describe.each(MISSIONS)('$title', (m) => {
    it('target code prints the expected output → clear', () => {
      const r = runCode(targetCode(m))
      expect(r.error).toBeUndefined()
      expect(r.output).toEqual(m.expected)
      expect(isMissionCleared(m, r)).toBe(true)
    })

    it('uses only known poses, each once, never the shared controls', () => {
      const poses = m.palette.map((p) => p.pose)
      expect(new Set(poses).size).toBe(poses.length)
      for (const p of poses) {
        expect(POSE_INFO[p], `unknown pose ${p}`).toBeDefined()
        expect(Object.values(MISSION_CONTROLS)).not.toContain(p)
      }
      expect(m.palette.length).toBeLessThanOrEqual(10) // keyboard keys 1..0
    })

    it('every palette pose is actually recognisable by the classifier', () => {
      for (const { pose } of m.palette) {
        const spec = poseSpec(pose, CUSTOM_POSES)!
        expect(spec, pose).not.toBeNull()
        expect(classifyPose(buildBody(spec), calib, CUSTOM_POSES)).toBe(pose)
      }
    })
  })

  it('FizzBuzz with the conditions in the wrong order does not clear', () => {
    const m = MISSIONS.find((x) => x.id === 'fizzbuzz')!
    const wrong = { ...m, solution: ['V_UP', 'CROSS', 'DISCO_LEFT', 'T_POSE', 'DISCO_RIGHT', 'LOW_V'] }
    const r = runCode(targetCode(wrong))
    expect(r.ok).toBe(true)
    expect(isMissionCleared(m, r)).toBe(false)
  })

  it('errors and partial output do not clear', () => {
    const m = MISSIONS[1]
    expect(isMissionCleared(m, runCode('for (let i = 1; i <= 4; i++) console.log(i);'))).toBe(false)
    expect(isMissionCleared(m, runCode('for (let i = 1; '))).toBe(false)
  })
})

describe('mission helpers', () => {
  const m = MISSIONS[0]
  it('maps poses to actions', () => {
    expect(missionAction(m, 'V_UP')).toEqual({ type: 'insert', text: 'console.log(' })
    expect(missionAction(m, 'RUN')).toEqual({ type: 'run' })
    expect(missionAction(m, 'HANDS_ON_HIPS')).toEqual({ type: 'backspace' })
    expect(missionAction(m, 'T_POSE')).toBeNull()
  })
  it('matchingPrefix', () => {
    expect(matchingPrefix('console.lo', 'console.log(')).toBe(10)
    expect(matchingPrefix('consolX', 'console')).toBe(6)
  })
  it('formats times and keys', () => {
    expect(formatTime(0)).toBe('00:00.00')
    expect(formatTime(83456)).toBe('01:23.45')
    expect([0, 8, 9, 10].map(paletteKey)).toEqual(['1', '9', '0', ''])
  })
})

describe('records', () => {
  const rec = (ms: number, at = ms) => ({ ms, at, moves: 6 })
  it('keeps the fastest N and reports rank', () => {
    let list = [rec(5000), rec(9000)]
    let r = insertRecord(list, rec(7000), 3)
    expect(r.rank).toBe(2)
    expect(r.list.map((x) => x.ms)).toEqual([5000, 7000, 9000])
    list = r.list
    r = insertRecord(list, rec(10000), 3)
    expect(r.rank).toBeNull()
    expect(r.list).toHaveLength(3)
    r = insertRecord(list, rec(1000), 3)
    expect(r.rank).toBe(1)
  })
  it('persists per mission and survives corrupt storage', () => {
    const data = new Map<string, string>()
    const store: KeyValueStore = { getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) }
    expect(saveRecord('a', rec(3000), 10, store).rank).toBe(1)
    expect(saveRecord('a', rec(2000), 10, store).rank).toBe(1)
    expect(loadRecords('a', store).map((x) => x.ms)).toEqual([2000, 3000])
    expect(loadRecords('b', store)).toEqual([])
    data.set('dtc:records:c', '{not json')
    expect(loadRecords('c', store)).toEqual([])
    expect(loadRecords('a', null)).toEqual([])
  })
})
