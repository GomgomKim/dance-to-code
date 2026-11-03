import { useEffect, useRef } from 'react'

const COLORS = ['#ff3d81', '#ffd23f', '#3dffb5', '#3dc6ff', '#a66bff', '#ffffff']

interface P { x: number; y: number; vx: number; vy: number; r: number; rot: number; vr: number; c: string; shape: number }

/** Full-screen confetti burst; re-fires whenever `fireKey` changes (and is > 0). */
export function Confetti({ fireKey }: { fireKey: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!fireKey) return
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')!
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const W = (canvas.width = window.innerWidth * dpr)
    const H = (canvas.height = window.innerHeight * dpr)
    const parts: P[] = []
    const burst = (x: number, y: number, n: number, up: number) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2
        const s = (4 + Math.random() * 14) * dpr
        parts.push({
          x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up * dpr, r: (5 + Math.random() * 7) * dpr,
          rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: COLORS[i % COLORS.length], shape: i % 3,
        })
      }
    }
    burst(W / 2, H * 0.55, 220, 10)
    const t2 = setTimeout(() => { burst(W * 0.15, H * 0.9, 90, 18); burst(W * 0.85, H * 0.9, 90, 18) }, 250)
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      ctx.clearRect(0, 0, W, H)
      for (const p of parts) {
        p.vy += 0.35 * dpr
        p.vx *= 0.99
        p.vy *= 0.99
        p.x += p.vx
        p.y += p.vy
        p.rot += p.vr
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillStyle = p.c
        if (p.shape === 0) ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2)
        else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.r / 2.4, 0, Math.PI * 2); ctx.fill() }
        else { ctx.beginPath(); ctx.moveTo(0, -p.r / 2); ctx.lineTo(p.r / 2, p.r / 2); ctx.lineTo(-p.r / 2, p.r / 2); ctx.fill() }
        ctx.restore()
      }
      if (now - start < 4500) raf = requestAnimationFrame(tick)
      else ctx.clearRect(0, 0, W, H)
    }
    raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf); clearTimeout(t2) }
  }, [fireKey])
  return <canvas ref={ref} className="confetti" aria-hidden />
}
