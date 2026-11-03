import { describe, expect, it } from 'vitest'
import { TOKEN_POSES } from '../config/poses'
import { applyBackspace, typewriterStep } from './editing'
import { highlight } from './highlight'
import { isHelloWorld, runCode } from './runner'

describe('token mapping', () => {
  it('the poses spell console.log("Hello World");', () => {
    const order = ['V_UP', 'RIGHT_SIDE', 'LEFT_SIDE', 'CROSS', 'HAND_ON_HEAD']
    const code = order
      .map((id) => TOKEN_POSES.find((p) => p.id === id)!.action)
      .map((a) => (a.type === 'insert' ? a.text : ''))
      .join('')
    expect(code).toBe('console.log("Hello World");')
    const r = runCode(code)
    expect(r).toEqual({ ok: true, output: ['Hello World'] })
    expect(isHelloWorld(r)).toBe(true)
  })
  it('keyboard keys 1..7 are unique', () => {
    expect(TOKEN_POSES.map((p) => p.key)).toEqual(['1', '2', '3', '4', '5', '6', '7'])
  })
})

describe('runCode', () => {
  it('captures syntax errors', () => {
    const r = runCode('console.log("Hello World"')
    expect(r.ok).toBe(false)
    expect(r.error).toMatch(/SyntaxError/)
  })
  it('captures runtime errors and partial output', () => {
    const r = runCode('console.log(1); foo()')
    expect(r.ok).toBe(false)
    expect(r.output).toEqual(['1'])
    expect(r.error).toMatch(/ReferenceError/)
  })
})

describe('editing', () => {
  it('backspace removes one character (emoji safe)', () => {
    expect(applyBackspace('ab')).toBe('a')
    expect(applyBackspace('')).toBe('')
    expect(applyBackspace('a🙌')).toBe('a')
  })
  it('typewriter types forward and deletes instantly', () => {
    expect(typewriterStep('', 'abc')).toBe('a')
    expect(typewriterStep('ab', 'abc', 5)).toBe('abc')
    expect(typewriterStep('abc', 'ab')).toBe('ab')
    expect(typewriterStep('abX', 'abcd')).toBe('ab')
  })
})

describe('highlight', () => {
  it('tokenizes console.log("Hello World");', () => {
    const t = highlight('console.log("Hello World");')
    expect(t.map((x) => x.kind)).toEqual(['ident', 'punct', 'func', 'punct', 'string', 'punct'])
    expect(t.map((x) => x.text).join('')).toBe('console.log("Hello World");')
  })
  it('handles unterminated strings', () => {
    const t = highlight('console.log("Hello ')
    expect(t[t.length - 1]).toEqual({ kind: 'string', text: '"Hello ' })
  })
})
