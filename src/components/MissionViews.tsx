import type { Mission } from '../config/missions'
import { formatTime } from '../mission/mission'
import type { MissionRecord } from '../mission/records'

export const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)
const DIFF_LABEL = ['', '쉬움', '보통', '중간', '어려움', '최고 난이도']

export function MissionSelect({ missions, best, onPick, currentId }: {
  missions: Mission[]
  best: Record<string, number | undefined>
  onPick: (id: string) => void
  currentId: string
}) {
  return (
    <div className="mission-select">
      <div className="mission-select-card">
        <h2>🏆 미션 선택</h2>
        <p className="hint">목표 코드를 춤으로 완성하고 점프해서 실행하면 클리어! 숫자키로도 시작할 수 있어요.</p>
        <div className="mission-grid">
          {missions.map((m, i) => (
            <button key={m.id} className={`mission-item ${m.id === currentId ? 'current' : ''}`} onClick={() => onPick(m.id)}>
              <span className="mi-no">{i + 1}</span>
              <span className="mi-main">
                <b>{m.title}</b>
                <small>{m.description}</small>
              </span>
              <span className="mi-side">
                <span className={`mi-stars d${m.difficulty}`}>{stars(m.difficulty)}</span>
                <small>{DIFF_LABEL[m.difficulty]}</small>
                <span className="mi-best">{best[m.id] !== undefined ? `🏁 ${formatTime(best[m.id]!)}` : '기록 없음'}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Compact mission header shown above the editor. */
export function MissionBrief({ mission, index }: { mission: Mission; index: number }) {
  return (
    <div className="mission-brief">
      <div className="mb-top">
        <span className="mb-no">MISSION {index + 1}</span>
        <span className={`mi-stars d${mission.difficulty}`}>{stars(mission.difficulty)}</span>
      </div>
      <div className="mb-title">{mission.title}</div>
      <div className="mb-desc">{mission.description}</div>
      <div className="mb-expect">
        <span>기대 출력</span>
        <code>{mission.expected.join(' · ')}</code>
      </div>
    </div>
  )
}

export function MissionTimer({ ms, best, running }: { ms: number; best: number | undefined; running: boolean }) {
  return (
    <div className={`mission-timer ${running ? 'running' : ''}`}>
      <div className="mt-time">{formatTime(ms)}</div>
      <div className="mt-best">BEST {best !== undefined ? formatTime(best) : '--:--.--'}</div>
    </div>
  )
}

export function Leaderboard({ records, highlightAt, limit = 5 }: { records: MissionRecord[]; highlightAt?: number; limit?: number }) {
  if (records.length === 0) return <p className="hint">아직 기록이 없어요. 첫 기록의 주인공이 되세요!</p>
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}`
  return (
    <ol className="leaderboard">
      {records.slice(0, limit).map((r, i) => (
        <li key={`${r.at}-${i}`} className={r.at === highlightAt ? 'me' : ''}>
          <span className="lb-rank">{medal(i)}</span>
          <span className="lb-time">{formatTime(r.ms)}</span>
          <span className="lb-meta">{r.moves}동작 · {new Date(r.at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
        </li>
      ))}
    </ol>
  )
}

export function ClearOverlay({ ms, rank, records, at, onRetry, onNext, onList }: {
  ms: number
  rank: number | null
  records: MissionRecord[]
  at: number
  onRetry: () => void
  onNext: (() => void) | null
  onList: () => void
}) {
  return (
    <div className="clear-overlay">
      <div className="clear-title">MISSION CLEAR!</div>
      <div className="clear-time">{formatTime(ms)}</div>
      <div className="clear-rank">
        {rank === 1 ? '🥇 NEW RECORD!' : rank ? `🏅 ${rank}위` : '순위권 밖 — 다시 도전!'}
      </div>
      <Leaderboard records={records} highlightAt={at} limit={3} />
      <div className="clear-actions">
        <button onClick={onRetry}>🔁 다시 (R)</button>
        {onNext && <button className="primary" onClick={onNext}>다음 미션 ▶ (N)</button>}
        <button onClick={onList}>📋 목록 (L)</button>
      </div>
    </div>
  )
}
