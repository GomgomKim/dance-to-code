import { SKELETON, type Landmark } from '../pose/types'

export interface SkeletonStyle {
  color: string
  glow: string
  /** Highlight the arms (when a pose is being held). */
  hot: boolean
}

/** Draws landmarks given in normalized [0..1] image coordinates onto the canvas. */
export function drawSkeleton(ctx: CanvasRenderingContext2D, lm: Landmark[] | null, style: SkeletonStyle) {
  const { width: W, height: H } = ctx.canvas
  ctx.clearRect(0, 0, W, H)
  if (!lm) return
  const s = Math.max(W, H) / 1000
  const P = (i: number) => ({ x: lm[i].x * W, y: lm[i].y * H, v: lm[i].visibility ?? 1 })
  const ARMS = new Set([11, 12, 13, 14, 15, 16])

  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (const pass of [0, 1]) {
    for (const [a, b] of SKELETON) {
      const pa = P(a), pb = P(b)
      if (pa.v < 0.4 || pb.v < 0.4) continue
      const arm = ARMS.has(a) && ARMS.has(b) && !(a === 11 && b === 12)
      ctx.beginPath()
      ctx.moveTo(pa.x, pa.y)
      ctx.lineTo(pb.x, pb.y)
      if (pass === 0) {
        ctx.strokeStyle = style.glow
        ctx.lineWidth = (arm && style.hot ? 26 : 18) * s
        ctx.shadowColor = style.glow
        ctx.shadowBlur = 30 * s
      } else {
        ctx.strokeStyle = arm && style.hot ? '#ffffff' : style.color
        ctx.lineWidth = (arm && style.hot ? 10 : 7) * s
        ctx.shadowBlur = 0
      }
      ctx.stroke()
    }
  }
  ctx.shadowBlur = 0
  // head ring
  const n = P(0), l = P(11), r = P(12)
  if (n.v >= 0.4 && l.v >= 0.4 && r.v >= 0.4) {
    ctx.beginPath()
    ctx.strokeStyle = style.color
    ctx.lineWidth = 6 * s
    ctx.shadowColor = style.glow
    ctx.shadowBlur = 24 * s
    ctx.arc(n.x, n.y, Math.hypot(l.x - r.x, l.y - r.y) * 0.32, 0, Math.PI * 2)
    ctx.stroke()
    ctx.shadowBlur = 0
  }
  for (const i of [0, 11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = P(i)
    if (p.v < 0.4) continue
    ctx.beginPath()
    ctx.fillStyle = '#fff'
    ctx.arc(p.x, p.y, (i === 0 ? 6 : i === 15 || i === 16 ? 11 : 7) * s, 0, Math.PI * 2)
    ctx.fill()
  }
}
