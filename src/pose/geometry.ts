import type { Landmark } from './types'

export interface Vec { x: number; y: number }

export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y
export const len = (a: Vec) => Math.hypot(a.x, a.y)
export const dist = (a: Vec, b: Vec) => len(sub(a, b))
export const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
export const norm = (a: Vec): Vec => {
  const l = len(a) || 1
  return { x: a.x / l, y: a.y / l }
}
export const rad2deg = (r: number) => (r * 180) / Math.PI

/** Interior angle at `b` formed by a-b-c, in degrees (180 = straight). */
export function jointAngle(a: Vec, b: Vec, c: Vec): number {
  const v1 = norm(sub(a, b))
  const v2 = norm(sub(c, b))
  const cos = Math.max(-1, Math.min(1, dot(v1, v2)))
  return rad2deg(Math.acos(cos))
}

/** Smallest absolute difference between two angles in degrees (0..180). */
export function angleDiff(a: number, b: number): number {
  const d = (((a - b) % 360) + 540) % 360 - 180
  return Math.abs(d)
}

export const isVisible = (p: Landmark | undefined, min = 0.5): p is Landmark =>
  !!p && (p.visibility === undefined || p.visibility >= min)
