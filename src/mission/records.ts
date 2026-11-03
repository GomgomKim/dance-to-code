/** Local leaderboard per mission (localStorage). */
export interface MissionRecord {
  ms: number
  /** epoch ms when it was set */
  at: number
  /** number of confirmed poses used */
  moves: number
}

export interface KeyValueStore {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
}

const KEY = (missionId: string) => `dtc:records:${missionId}`

/** Pure: insert a record, keep the fastest `max`. Returns the new list and the 1-based rank (null if it didn't make it). */
export function insertRecord(list: MissionRecord[], rec: MissionRecord, max: number): { list: MissionRecord[]; rank: number | null } {
  const next = [...list, rec].sort((a, b) => a.ms - b.ms || a.at - b.at).slice(0, max)
  const idx = next.indexOf(rec)
  return { list: next, rank: idx === -1 ? null : idx + 1 }
}

function safeStore(): KeyValueStore | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function loadRecords(missionId: string, store: KeyValueStore | null = safeStore()): MissionRecord[] {
  try {
    const raw = store?.getItem(KEY(missionId))
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((r): r is MissionRecord =>
      !!r && typeof r.ms === 'number' && typeof r.at === 'number' && typeof r.moves === 'number')
  } catch {
    return []
  }
}

export function saveRecord(
  missionId: string, rec: MissionRecord, max: number, store: KeyValueStore | null = safeStore(),
): { list: MissionRecord[]; rank: number | null } {
  const res = insertRecord(loadRecords(missionId, store), rec, max)
  try { store?.setItem(KEY(missionId), JSON.stringify(res.list)) } catch { /* storage full / blocked */ }
  return res
}
