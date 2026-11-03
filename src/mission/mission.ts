import { MISSION_CONTROLS, type Mission } from '../config/missions'
import type { RunResult } from '../code/runner'

/** Target code, built from the solution order. */
export function targetCode(m: Mission): string {
  return m.solution.map((pose) => {
    const t = m.palette.find((p) => p.pose === pose)
    if (!t) throw new Error(`mission ${m.id}: solution pose ${pose} is not in the palette`)
    return t.text
  }).join('')
}

/** Clear = the code ran without error and printed exactly the expected lines. */
export function isMissionCleared(m: Mission, r: RunResult): boolean {
  if (!r.ok) return false
  const norm = (l: string) => l.trim()
  return r.output.length === m.expected.length && r.output.every((l, i) => norm(l) === norm(m.expected[i]))
}

/** Length of the typed code that matches the start of the target. */
export function matchingPrefix(typed: string, target: string): number {
  let i = 0
  while (i < typed.length && i < target.length && typed[i] === target[i]) i++
  return i
}

/** Which action a pose triggers in a mission (null = not used in this mission). */
export function missionAction(m: Mission, pose: string):
  | { type: 'insert'; text: string } | { type: 'backspace' } | { type: 'run' } | null {
  if (pose === MISSION_CONTROLS.run) return { type: 'run' }
  if (pose === MISSION_CONTROLS.backspace) return { type: 'backspace' }
  const t = m.palette.find((p) => p.pose === pose)
  return t ? { type: 'insert', text: t.text } : null
}

/** Keyboard shortcut for a palette entry: 1..9, then 0. */
export const paletteKey = (i: number) => (i < 9 ? String(i + 1) : i === 9 ? '0' : '')

export function formatTime(ms: number): string {
  const m = Math.floor(ms / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const cs = Math.floor((ms % 1000) / 10)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`
}
