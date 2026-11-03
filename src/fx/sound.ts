/** Tiny WebAudio synth — no audio files needed. */
let ctx: AudioContext | null = null
let enabled = true

export function setSoundEnabled(v: boolean) { enabled = v }

/** Must be called from a user gesture once (browser autoplay policy). */
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (AC) ctx = new AC()
  }
  void ctx?.resume()
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18, slideTo?: number) {
  if (!ctx || !enabled) return
  const t0 = ctx.currentTime + start
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

export const sfx = {
  confirm() {
    tone(880, 0, 0.09, 'square', 0.08)
    tone(1320, 0.06, 0.14, 'square', 0.08)
  },
  type() { tone(2200 + Math.random() * 400, 0, 0.03, 'square', 0.03) },
  erase() { tone(500, 0, 0.15, 'sawtooth', 0.08, 180) },
  run() { tone(200, 0, 0.35, 'sawtooth', 0.1, 1200) },
  error() {
    tone(140, 0, 0.25, 'square', 0.12)
    tone(110, 0.2, 0.35, 'square', 0.12)
  },
  success() {
    ;[523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => tone(f, i * 0.09, 0.35, 'triangle', 0.16))
    tone(1567.98, 0.5, 0.8, 'triangle', 0.14)
    tone(2093, 0.55, 0.9, 'sine', 0.08)
  },
  calibrated() {
    tone(660, 0, 0.12, 'sine', 0.12)
    tone(990, 0.1, 0.2, 'sine', 0.12)
  },
}
