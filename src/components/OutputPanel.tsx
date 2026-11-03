import type { RunResult } from '../code/runner'

export function OutputPanel({ result, success, runKey }: { result: RunResult | null; success: boolean; runKey: number }) {
  return (
    <div className={`output ${success ? 'output-success' : ''} ${result && !result.ok ? 'output-error' : ''}`} key={runKey}>
      <div className="output-label">▶ OUTPUT</div>
      <div className={`output-body ${result && result.output.length > 3 ? 'many' : ''}`}>
        {!result && <div className="output-empty">점프해서 실행 🚀</div>}
        {result?.output.map((l, i) => (
          <div key={i} className={`out-line ${success ? 'rainbow' : ''}`}>{l || ' '}</div>
        ))}
        {result?.ok && result.output.length === 0 && <div className="output-empty">(출력 없음)</div>}
        {result?.error && <div className="out-error">💥 {result.error}</div>}
      </div>
    </div>
  )
}
