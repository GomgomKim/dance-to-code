/** Pure helpers for editing the code buffer and the typewriter animation. */

export function applyBackspace(code: string): string {
  return [...code].slice(0, -1).join('')
}

export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length)
  let i = 0
  while (i < n && a[i] === b[i]) i++
  return i
}

/**
 * One typewriter step: move `shown` toward `target`.
 * Deletions happen instantly, insertions `chars` characters at a time.
 */
export function typewriterStep(shown: string, target: string, chars = 1): string {
  if (shown === target) return shown
  const p = commonPrefixLength(shown, target)
  if (p < shown.length) return target.slice(0, p)
  return target.slice(0, Math.min(target.length, shown.length + chars))
}
