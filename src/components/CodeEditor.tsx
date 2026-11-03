import { useEffect, useMemo, useState } from 'react'
import { typewriterStep } from '../code/editing'
import { highlight } from '../code/highlight'

/** Code view with typewriter animation + syntax highlighting. */
export function CodeEditor({ code, filename = 'dance.js' }: { code: string; filename?: string }) {
  const [shown, setShown] = useState(code)
  useEffect(() => {
    if (shown === code) return
    const id = setTimeout(() => setShown((s) => typewriterStep(s, code)), 45)
    return () => clearTimeout(id)
  }, [shown, code])

  const tokens = useMemo(() => highlight(shown), [shown])
  const typing = shown !== code
  const lines = Math.max(1, shown.split('\n').length)

  return (
    <div className="editor">
      <div className="editor-bar">
        <span className="dot red" /><span className="dot yellow" /><span className="dot green" />
        <span className="editor-file">{filename}</span>
      </div>
      <div className="editor-body">
        <div className="gutter">{Array.from({ length: lines }, (_, i) => <div key={i}>{i + 1}</div>)}</div>
        <pre className="code">
          {tokens.map((t, i) => <span key={i} className={`tk-${t.kind}`}>{t.text}</span>)}
          <span className={`caret ${typing ? 'typing' : ''}`} />
          {!shown && <span className="placeholder"> // 춤으로 코딩하세요 💃</span>}
        </pre>
      </div>
    </div>
  )
}
