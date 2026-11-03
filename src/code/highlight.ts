export type TokenKind = 'keyword' | 'ident' | 'func' | 'string' | 'number' | 'punct' | 'comment' | 'space' | 'error'
export interface HlToken { kind: TokenKind; text: string }

const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'new', 'true', 'false',
  'null', 'undefined', 'class', 'this', 'typeof', 'await', 'async',
])

/** Tiny JS tokenizer for syntax highlighting. Never throws; handles unterminated strings. */
export function highlight(code: string): HlToken[] {
  const out: HlToken[] = []
  let i = 0
  const push = (kind: TokenKind, text: string) => {
    const last = out[out.length - 1]
    if (last && last.kind === kind && (kind === 'space' || kind === 'punct')) last.text += text
    else out.push({ kind, text })
  }
  while (i < code.length) {
    const c = code[i]
    if (/\s/.test(c)) {
      push('space', c); i++
    } else if (c === '"' || c === "'" || c === '`') {
      let j = i + 1
      while (j < code.length && code[j] !== c) j += code[j] === '\\' ? 2 : 1
      out.push({ kind: 'string', text: code.slice(i, Math.min(j + 1, code.length)) })
      i = j + 1
    } else if (c === '/' && code[i + 1] === '/') {
      const j = code.indexOf('\n', i)
      const end = j === -1 ? code.length : j
      out.push({ kind: 'comment', text: code.slice(i, end) }); i = end
    } else if (/[0-9]/.test(c)) {
      const m = /^[0-9.]+/.exec(code.slice(i))!
      out.push({ kind: 'number', text: m[0] }); i += m[0].length
    } else if (/[A-Za-z_$]/.test(c)) {
      const m = /^[A-Za-z_$][\w$]*/.exec(code.slice(i))!
      const word = m[0]
      const next = code.slice(i + word.length).trimStart()[0]
      out.push({ kind: KEYWORDS.has(word) ? 'keyword' : next === '(' ? 'func' : 'ident', text: word })
      i += word.length
    } else {
      push('punct', c); i++
    }
  }
  return out
}
