export interface RunResult {
  ok: boolean
  /** Lines printed via console.log/info/warn/error */
  output: string[]
  error?: string
}

function format(v: unknown): string {
  if (typeof v === 'string') return v
  try {
    return typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
  } catch {
    return String(v)
  }
}

/**
 * Runs user code with a captured console. There is no backend and the only code
 * that can be run is what the dancer typed with their body, so `new Function` is fine.
 */
export function runCode(code: string): RunResult {
  const output: string[] = []
  const log = (...args: unknown[]) => { output.push(args.map(format).join(' ')) }
  const fakeConsole = { log, info: log, warn: log, error: log, debug: log }
  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const fn = new Function('console', `"use strict";\n${code}`)
    fn(fakeConsole)
    return { ok: true, output }
  } catch (e) {
    const err = e as Error
    return { ok: false, output, error: `${err?.name ?? 'Error'}: ${err?.message ?? String(e)}` }
  }
}

export const isHelloWorld = (r: RunResult) =>
  r.ok && r.output.some((l) => /hello[\s,]*world/i.test(l))
