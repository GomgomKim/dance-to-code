interface Props {
  progress: number
  size?: number
  stroke?: number
  color?: string
  children?: React.ReactNode
  done?: boolean
}

export function ProgressRing({ progress, size = 160, stroke = 12, color = 'var(--accent)', children, done }: Props) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={`ring ${done ? 'ring-done' : ''}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,.45)" stroke="rgba(255,255,255,.15)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(1, progress)))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 10px ${color})` }}
        />
      </svg>
      <div className="ring-content">{children}</div>
    </div>
  )
}
