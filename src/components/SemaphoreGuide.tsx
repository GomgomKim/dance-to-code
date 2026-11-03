import { SEMAPHORE_TABLE, type Dir, type SemaphoreSymbol } from '../pose/semaphore'

const LABEL: Partial<Record<SemaphoreSymbol, string>> = { SPACE: '␣', CANCEL: '⌫' }
export const symbolLabel = (s: SemaphoreSymbol) => LABEL[s] ?? s

/** Mini stick figure for a semaphore symbol. `mirror` = draw as the dancer sees themself on screen. */
export function SemaphoreFigure({ symbol, mirror, size = 56, active }: { symbol: SemaphoreSymbol; mirror: boolean; size?: number; active?: boolean }) {
  const [a, b] = SEMAPHORE_TABLE[symbol]
  const cx = 30, cy = 26
  const arm = (d: Dir) => {
    const ang = (d * 45 * Math.PI) / 180
    const sx = mirror ? -1 : 1
    return { x: cx + sx * Math.sin(ang) * 20, y: cy - Math.cos(ang) * 20 }
  }
  const pa = arm(a), pb = arm(b)
  return (
    <figure className={`sem-fig ${active ? 'active' : ''}`}>
      <svg width={size} height={size} viewBox="0 0 60 64">
        <circle cx={cx} cy={14} r={6} fill="currentColor" />
        <line x1={cx} y1={22} x2={cx} y2={44} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
        <line x1={cx} y1={44} x2={cx - 7} y2={60} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
        <line x1={cx} y1={44} x2={cx + 7} y2={60} stroke="currentColor" strokeWidth={4} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={pa.x} y2={pa.y} stroke="var(--accent)" strokeWidth={4} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={pb.x} y2={pb.y} stroke="var(--accent2)" strokeWidth={4} strokeLinecap="round" />
      </svg>
      <figcaption>{symbolLabel(symbol)}</figcaption>
    </figure>
  )
}

export function SemaphoreGuide({ mirror, current }: { mirror: boolean; current: SemaphoreSymbol | null }) {
  return (
    <div className="sem-guide">
      {(Object.keys(SEMAPHORE_TABLE) as SemaphoreSymbol[]).map((s) => (
        <SemaphoreFigure key={s} symbol={s} mirror={mirror} active={s === current} size={44} />
      ))}
    </div>
  )
}
