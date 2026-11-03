import { useEffect, useMemo, useRef, useState } from 'react'
import { typewriterStep } from '../code/editing'
import { highlight } from '../code/highlight'
import { matchingPrefix } from '../mission/mission'

/**
 * Code view with typewriter animation + syntax highlighting.
 * With `target` (mission mode) the rest of the target is shown as dim ghost text,
 * and anything typed that diverges from the target is marked.
 */
export function CodeEditor({ code, filename = 'dance.js', target }: { code: string; filename?: string; target?: string }) {
  const [shown, setShown] = useState(code)
  useEffect(() => {
    if (shown === code) return
    const id = setTimeout(() => setShown((s) => typewriterStep(s, code)), 45)
    return () => clearTimeout(id)
  }, [shown, code])

  const ok = target === undefined ? shown.length : matchingPrefix(shown, target)
  const good = shown.slice(0, ok)
  const wrong = shown.slice(ok)
  const ghost = target !== undefined && !wrong ? target.slice(ok) : ''
  const tokens = useMemo(() => highlight(good), [good])
  const caretRef = useRef<HTMLSpanElement>(null)
  // keep the caret in view for multi-line code
  useEffect(() => {
    const caret = caretRef.current
    const body = caret?.closest('.editor-body') as HTMLElement | null
    if (!caret || !body) return
    const c = caret.getBoundingClientRect()
    const b = body.getBoundingClientRect()
    if (c.bottom > b.bottom - 8) body.scrollTop += c.bottom - b.bottom + 8
    else if (c.top < b.top + 8) body.scrollTop -= b.top + 8 - c.top
  }, [shown])
  const typing = shown !== code
  const lines = Math.max(1, (good + wrong + ghost).split('\n').length)

  return (
    <div className={`editor ${wrong ? 'editor-wrong' : ''} ${target !== undefined ? 'editor-mission' : ''}`}>
      <div className="editor-bar">
        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
        <span className="editor-file">{filename}</span>
        {target !== undefined && (
          <span className={`editor-status ${wrong ? 'bad' : ok === target.length ? 'done' : ''}`}>
            {wrong ? '⚠️ 목표 코드와 달라요 — 허리 손으로 지우기' : `${Math.round((ok / Math.max(1, target.length)) * 100)}%`}
          </span>
        )}
      </div>
      <div className="editor-body">
        <div className="gutter">{Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}</div>
        <pre className="code">
          {tokens.map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}
          {wrong && <span className="tk-wrong">{wrong}</span>}
          <span ref={caretRef} className={`caret ${typing ? 'typing' : ''}`} />
          {ghost && <span className="ghost">{ghost}</span>}
          {!shown && !ghost && <span className="placeholder"> // 춤으로 코딩하세요 💃</span>}
        </pre>
      </div>
    </div>
  )
}
