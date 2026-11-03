import { useCallback, useEffect, useRef, useState } from 'react'
import { applyBackspace } from './code/editing'
import { isHelloWorld, runCode, type RunResult } from './code/runner'
import { CodeEditor } from './components/CodeEditor'
import { drawSkeleton } from './components/drawSkeleton'
import { OutputPanel } from './components/OutputPanel'
import { ProgressRing } from './components/ProgressRing'
import { SemaphoreFigure, SemaphoreGuide, symbolLabel } from './components/SemaphoreGuide'
import {
  HOLD_MS, holdMsFor, POSE_BY_ID, RUN_HOLD_MS, SEMAPHORE_HOLD_MS, SEMAPHORE_TEMPLATE, TOKEN_POSES,
} from './config/poses'
import { Confetti } from './fx/Confetti'
import { setSoundEnabled, sfx, unlockAudio } from './fx/sound'
import { usePoseLandmarker } from './hooks/usePoseLandmarker'
import { Calibrator } from './pose/calibrator'
import { analyzePose, hipsVisible, measureCalibration, type PoseAnalysis } from './pose/classifier'
import { buildBody, POSE_FIXTURES, semaphoreBody } from './pose/fixtures'
import { HoldTracker } from './pose/holdTracker'
import { readSemaphore, type SemaphoreSymbol } from './pose/semaphore'
import type { Calibration, ClassifiedPose, Landmark, TokenPoseId } from './pose/types'

type Mode = 'token' | 'semaphore'
type Source = 'none' | 'camera' | 'video'
type Layout = 'landscape' | 'portrait'

interface Hud {
  /** Raw per-frame classification (for the big label) */
  pose: ClassifiedPose
  /** Candidate being held: TokenPoseId | 'RUN' | `SEM_${symbol}` */
  candidate: string | null
  progress: number
  locked: boolean
  semLive: SemaphoreSymbol | null
  hasBody: boolean
  fullBody: boolean
}

const EMPTY_HUD: Hud = { pose: null, candidate: null, progress: 0, locked: false, semLive: null, hasBody: false, fullBody: false }

/** Keyboard simulation uses synthetic bodies, so it needs a matching synthetic calibration. */
const SIM_CALIB: Calibration = measureCalibration(buildBody(POSE_FIXTURES.NEUTRAL))!

function simLandmarks(id: string, now: number): Landmark[] {
  if (id.startsWith('SEM_')) return semaphoreBody(id.slice(4) as SemaphoreSymbol)
  if (id === 'RUN') return buildBody({ ...POSE_FIXTURES.RUN, lift: 0.45 + 0.2 * Math.sin(now / 80) })
  if (id === 'NEUTRAL') return buildBody({ ...POSE_FIXTURES.NEUTRAL, offset: { x: 0, y: Math.sin(now / 500) * 0.004 } })
  return buildBody(POSE_FIXTURES[id as TokenPoseId])
}

/** Fit the synthetic figure inside the square sim canvas. */
const fitSim = (lm: Landmark[]) => lm.map((p) => ({ ...p, x: 0.5 + (p.x - 0.5) * 0.85, y: 0.1 + p.y * 0.82 }))

const readPref = <T,>(k: string, d: T): T => {
  try {
    const v = localStorage.getItem(`dtc:${k}`)
    return v === null ? d : (JSON.parse(v) as T)
  } catch {
    return d
  }
}
const writePref = (k: string, v: unknown) => {
  try { localStorage.setItem(`dtc:${k}`, JSON.stringify(v)) } catch { /* ignore */ }
}

function candidateLabel(c: string | null, pose: ClassifiedPose, mode: Mode): { emoji: string; name: string } {
  if (c === 'RUN') return { emoji: '🚀', name: POSE_BY_ID.RUN.name }
  if (c?.startsWith('SEM_')) {
    const s = c.slice(4) as SemaphoreSymbol
    return { emoji: symbolLabel(s), name: s === 'SPACE' ? '띄어쓰기' : s === 'CANCEL' ? '지우기' : s }
  }
  if (c && mode === 'token') {
    const p = POSE_BY_ID[c as TokenPoseId]
    return { emoji: p.emoji, name: p.name }
  }
  if (pose === 'NEUTRAL') return { emoji: '🧍', name: '차렷' }
  return { emoji: '', name: '' }
}

export default function App() {
  const [mode, setMode] = useState<Mode>(() => readPref('mode', 'token'))
  const [layout, setLayout] = useState<Layout>(() => readPref('layout', 'landscape'))
  const [mirror, setMirror] = useState(() => readPref('mirror', true))
  const [soundOn, setSoundOn] = useState(() => readPref('sound', true))
  const [showUI, setShowUI] = useState(true)
  const [started, setStarted] = useState(false)
  const [source, setSource] = useState<Source>('none')
  const [mediaError, setMediaError] = useState<string | null>(null)

  const [calibrating, setCalibrating] = useState(false)
  const [calibProgress, setCalibProgress] = useState(0)
  const [calibration, setCalibration] = useState<Calibration | null>(null)

  const [code, setCode] = useState('')
  const [letters, setLetters] = useState('')
  const [result, setResult] = useState<RunResult | null>(null)
  const [success, setSuccess] = useState(false)
  const [runKey, setRunKey] = useState(0)
  const [confettiKey, setConfettiKey] = useState(0)
  const [flash, setFlash] = useState<{ key: number; big: boolean }>({ key: 0, big: false })
  const [burst, setBurst] = useState<{ key: number; text: string }>({ key: 0, text: '' })
  const [shakeKey, setShakeKey] = useState(0)
  const [shaking, setShaking] = useState(false)
  useEffect(() => {
    if (!shakeKey) return
    setShaking(true)
    const t = setTimeout(() => setShaking(false), 600)
    return () => clearTimeout(t)
  }, [shakeKey])

  const [hud, setHud] = useState<Hud>(EMPTY_HUD)
  const [debug, setDebug] = useState<{ a: PoseAnalysis | null; fps: number }>({ a: null, fps: 0 })

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const { landmarkerRef, load: loadModel, state: modelState, error: modelError } = usePoseLandmarker()

  const fullCode = mode === 'token' ? code : SEMAPHORE_TEMPLATE.before + letters + SEMAPHORE_TEMPLATE.after

  // ---- live values for the rAF loop (avoid stale closures) ----
  const live = useRef({ mode, source, calibrating, calibration, fullCode })
  live.current = { mode, source, calibrating, calibration, fullCode }

  const holdFor = useCallback((id: string) => {
    if (id === 'RUN') return RUN_HOLD_MS
    return live.current.mode === 'token' ? holdMsFor(id) : SEMAPHORE_HOLD_MS
  }, [])
  const tracker = useRef(new HoldTracker({ holdMs: (id) => holdFor(id), gapMs: 160 }))
  const calibrator = useRef(new Calibrator(2000))
  const sim = useRef<{ id: string; until: number } | null>(null)

  useEffect(() => { tracker.current.reset() }, [mode])
  useEffect(() => { setSoundEnabled(soundOn); writePref('sound', soundOn) }, [soundOn])
  useEffect(() => writePref('mode', mode), [mode])
  useEffect(() => writePref('layout', layout), [layout])
  useEffect(() => writePref('mirror', mirror), [mirror])

  // ---- actions ----
  const doRun = useCallback(() => {
    sfx.run()
    const r = runCode(live.current.fullCode)
    const hello = isHelloWorld(r)
    setResult(r)
    setSuccess(hello)
    setRunKey((k) => k + 1)
    if (hello) {
      setConfettiKey((k) => k + 1)
      setFlash((f) => ({ key: f.key + 1, big: true }))
      setTimeout(() => sfx.success(), 250)
    } else if (!r.ok) {
      setShakeKey((k) => k + 1)
      setTimeout(() => sfx.error(), 150)
    }
  }, [])

  const showBurst = (text: string) => setBurst((b) => ({ key: b.key + 1, text }))

  const onConfirm = useCallback((id: string) => {
    sfx.confirm()
    setFlash((f) => ({ key: f.key + 1, big: false }))
    if (id === 'RUN') { showBurst('RUN ▶'); doRun(); return }
    if (id.startsWith('SEM_')) {
      const s = id.slice(4) as SemaphoreSymbol
      if (s === 'CANCEL') { sfx.erase(); setLetters(applyBackspace); showBurst('⌫'); return }
      const ch = s === 'SPACE' ? ' ' : s
      setLetters((l) => l + ch)
      showBurst(symbolLabel(s))
      return
    }
    const cfg = POSE_BY_ID[id as TokenPoseId]
    if (!cfg) return
    if (cfg.action.type === 'insert') {
      const text = cfg.action.text
      setCode((c) => c + text)
      showBurst(text)
    } else if (cfg.action.type === 'backspace') {
      sfx.erase()
      setCode(applyBackspace)
      showBurst('⌫')
    } else {
      showBurst('RUN ▶')
      doRun()
    }
  }, [doRun])
  const onConfirmRef = useRef(onConfirm)
  onConfirmRef.current = onConfirm

  const resetCode = useCallback(() => {
    setCode(''); setLetters(''); setResult(null); setSuccess(false); tracker.current.reset()
  }, [])

  // typing tick sound while the typewriter runs
  const prevLen = useRef(0)
  useEffect(() => {
    if (fullCode.length > prevLen.current) {
      const n = Math.min(12, fullCode.length - prevLen.current)
      for (let i = 0; i < n; i++) setTimeout(() => sfx.type(), i * 45)
    }
    prevLen.current = fullCode.length
  }, [fullCode])

  // ---- media sources ----
  const stopMedia = () => {
    const v = videoRef.current
    if (!v) return
    const s = v.srcObject as MediaStream | null
    s?.getTracks().forEach((t) => t.stop())
    v.srcObject = null
    if (v.src) { URL.revokeObjectURL(v.src); v.removeAttribute('src'); v.load() }
  }

  const beginCalibration = () => {
    calibrator.current.reset()
    setCalibProgress(0)
    setCalibrating(true)
  }

  const startCamera = async () => {
    unlockAudio()
    setStarted(true)
    setMediaError(null)
    stopMedia()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      const v = videoRef.current!
      v.srcObject = stream
      v.muted = true
      await v.play()
      setSource('camera')
      setMirror(true)
      beginCalibration()
      loadModel().catch(() => {})
    } catch (e) {
      setSource('none')
      setMediaError(`카메라를 열 수 없어요: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const startVideoFile = async (file: File) => {
    unlockAudio()
    setStarted(true)
    setMediaError(null)
    stopMedia()
    const v = videoRef.current!
    v.src = URL.createObjectURL(file)
    v.loop = true
    v.muted = true
    try {
      await v.play()
      setSource('video')
      beginCalibration()
      loadModel().catch(() => {})
    } catch (e) {
      setMediaError(`영상을 재생할 수 없어요: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const startKeyboardOnly = () => {
    unlockAudio()
    stopMedia()
    setStarted(true)
    setSource('none')
    setCalibrating(false)
  }

  // ---- keyboard: simulation + shortcuts ----
  useEffect(() => {
    const press = (id: string, repeat: boolean) => {
      const now = performance.now()
      if (repeat && sim.current?.id === id) sim.current.until = Math.max(sim.current.until, now + 200)
      else sim.current = { id, until: now + holdFor(id) + 120 }
    }
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input, textarea, select')) return
      const k = e.key
      if (k === 'Escape' || (k === 'h' && live.current.mode === 'token' && !e.shiftKey)) { setShowUI((s) => !s); return }
      if (e.shiftKey && !e.metaKey && !e.ctrlKey) {
        const map: Record<string, () => void> = {
          M: () => setMode((m) => (m === 'token' ? 'semaphore' : 'token')),
          L: () => setLayout((l) => (l === 'landscape' ? 'portrait' : 'landscape')),
          F: () => setMirror((m) => !m),
          C: () => beginCalibration(),
          R: () => resetCode(),
          S: () => setSoundOn((s) => !s),
        }
        const fn = map[k.toUpperCase()]
        if (fn) { e.preventDefault(); if (!e.repeat) fn() }
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (live.current.mode === 'token') {
        const p = TOKEN_POSES.find((x) => x.key === k)
        if (p) { e.preventDefault(); press(p.id, e.repeat) }
      } else {
        if (k === '7' || k === 'Enter') { e.preventDefault(); press('RUN', e.repeat) }
        else if (k === ' ') { e.preventDefault(); press('SEM_SPACE', e.repeat) }
        else if (k === 'Backspace') { e.preventDefault(); press('SEM_CANCEL', e.repeat) }
        else if (/^[a-z]$/i.test(k)) { e.preventDefault(); press(`SEM_${k.toUpperCase()}`, e.repeat) }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [holdFor, resetCode])

  // ---- main loop: detect → classify → debounce → act → draw ----
  useEffect(() => {
    let raf = 0
    let lastVideoTime = -1
    let lastLm: Landmark[] | null = null
    let lastDebugAt = 0
    let frames = 0
    let fpsAt = performance.now()
    let fps = 0
    let prevHud = EMPTY_HUD

    const loop = () => {
      raf = requestAnimationFrame(loop)
      const now = performance.now()
      const st = live.current
      const v = videoRef.current
      let raw: Landmark[] | null = null
      let aspect = 1
      let isSim = false

      const s = sim.current
      if (s && now < s.until) {
        raw = simLandmarks(s.id, now)
        isSim = true
      } else {
        sim.current = null
        const lmk = landmarkerRef.current
        if (st.source !== 'none' && v && v.readyState >= 2 && v.videoWidth) {
          aspect = v.videoWidth / v.videoHeight
          if (lmk && v.currentTime !== lastVideoTime) {
            lastVideoTime = v.currentTime
            try {
              lastLm = lmk.detectForVideo(v, now).landmarks[0] ?? null
            } catch {
              lastLm = null
            }
            frames++
          }
          raw = lastLm
        } else if (st.source === 'none') {
          raw = simLandmarks('NEUTRAL', now)
          isSim = true
        }
      }
      if (now - fpsAt > 1000) { fps = frames; frames = 0; fpsAt = now }

      const scaled = raw && (aspect === 1 ? raw : raw.map((p) => ({ ...p, x: p.x * aspect })))

      // calibration (real frames only)
      if (st.calibrating && !isSim) {
        const r = calibrator.current.update(scaled, now)
        setCalibProgress(r.progress)
        if (r.result) {
          setCalibration(r.result)
          setCalibrating(false)
          sfx.calibrated()
        }
      }

      // classification
      const calib = isSim ? SIM_CALIB : st.calibration
      const a = analyzePose(scaled, calib)
      let candidate: string | null = null
      let semLive: SemaphoreSymbol | null = null
      if (!(st.calibrating && !isSim)) {
        if (st.mode === 'token') {
          candidate = a?.pose && a.pose !== 'NEUTRAL' ? a.pose : null
        } else if (a?.pose === 'RUN') {
          candidate = 'RUN'
        } else {
          semLive = readSemaphore(scaled).symbol
          candidate = semLive ? `SEM_${semLive}` : null
        }
      }
      const hs = tracker.current.update(candidate, now)
      if (hs.confirmed) onConfirmRef.current(hs.confirmed)

      const next: Hud = {
        pose: a?.pose ?? null,
        candidate: hs.candidate,
        progress: Math.round(hs.progress * 50) / 50,
        locked: hs.locked || !!hs.confirmed,
        semLive,
        hasBody: !!raw,
        fullBody: !!scaled && hipsVisible(scaled),
      }
      if ((Object.keys(next) as Array<keyof Hud>).some((k) => next[k] !== prevHud[k])) {
        prevHud = next
        setHud(next)
      }
      if (now - lastDebugAt > 120) {
        lastDebugAt = now
        setDebug({ a, fps: isSim ? 60 : fps })
      }

      // draw
      const cv = canvasRef.current
      if (cv) {
        const w = isSim || !v?.videoWidth ? 900 : v.videoWidth
        const h = isSim || !v?.videoHeight ? 900 : v.videoHeight
        if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h }
        cv.dataset.sim = String(isSim)
        const ctx = cv.getContext('2d')
        if (ctx) {
          const holding = !!hs.candidate && hs.progress > 0
          drawSkeleton(ctx, raw && (isSim ? fitSim(raw) : raw), {
            color: holding ? '#7cf9ff' : '#b18cff',
            glow: holding ? 'rgba(80,240,255,.55)' : 'rgba(160,110,255,.45)',
            hot: holding,
          })
        }
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [landmarkerRef])

  // ---- render ----
  const label = candidateLabel(hud.candidate, hud.pose, mode)
  const holdTotal = hud.candidate ? holdFor(hud.candidate) : HOLD_MS
  const isSimView = source === 'none'

  const toolbar = (
    <div className="toolbar">
      <div className="brand">💃 dance<span>-to-</span>code</div>
      <div className="seg">
        <button className={mode === 'token' ? 'on' : ''} onClick={() => setMode('token')}>토큰 모드</button>
        <button className={mode === 'semaphore' ? 'on' : ''} onClick={() => setMode('semaphore')}>수기신호 🔥</button>
      </div>
      <div className="seg">
        <button className={layout === 'landscape' ? 'on' : ''} onClick={() => setLayout('landscape')}>16:9</button>
        <button className={layout === 'portrait' ? 'on' : ''} onClick={() => setLayout('portrait')}>9:16 릴스</button>
      </div>
      <button onClick={startCamera}>📷 카메라</button>
      <button onClick={() => fileRef.current?.click()}>🎞️ 영상 파일</button>
      <button onClick={startKeyboardOnly}>⌨️ 키보드만</button>
      <button onClick={() => setMirror((m) => !m)}>{mirror ? '🪞 미러 ON' : '🪞 미러 OFF'}</button>
      <button onClick={() => setSoundOn((s) => !s)}>{soundOn ? '🔊' : '🔇'}</button>
      {source !== 'none' && <button onClick={beginCalibration}>🧍 캘리브레이션</button>}
      <button onClick={resetCode}>🧹 지우기</button>
      <button className="primary" onClick={() => setShowUI(false)}>🎬 녹화 모드 (Esc)</button>
    </div>
  )

  const stage = (
    <div className={`stage ${shaking ? 'shake' : ''}`}>
      <div className={`mirror-wrap ${mirror ? 'mirrored' : ''}`}>
        <video ref={videoRef} className={`cam ${source === 'none' ? 'hidden' : ''}`} playsInline muted />
        <canvas ref={canvasRef} className={`skeleton ${isSimView ? 'sim' : ''}`} />
      </div>
      {source === 'none' && started && <div className="sim-badge">⌨️ KEYBOARD SIM</div>}

      <div className="mode-badge">{mode === 'token' ? 'TOKEN MODE' : 'SEMAPHORE · HARD'}</div>

      {hud.candidate && (
        <div className="ring-wrap">
          <ProgressRing progress={hud.progress} done={hud.locked} size={150} color={hud.locked ? '#3dffb5' : 'var(--accent)'}>
            <span className="ring-emoji">{label.emoji}</span>
          </ProgressRing>
          {!hud.locked && <div className="ring-ms">{Math.ceil((1 - hud.progress) * holdTotal / 100) / 10}s</div>}
        </div>
      )}

      <div className={`pose-name ${hud.locked ? 'locked' : ''} ${hud.candidate ? 'active' : ''}`}>
        {label.name || (hud.hasBody ? '·  ·  ·' : source !== 'none' ? (modelState === 'loading' ? '모델 불러오는 중…' : '사람을 찾는 중…') : '')}
      </div>

      {mode === 'semaphore' && (
        <div className="sem-preview">
          <div className="sem-preview-label">NOW</div>
          {hud.semLive ? (
            <>
              <div className="sem-preview-letter">{symbolLabel(hud.semLive)}</div>
              <SemaphoreFigure symbol={hud.semLive} mirror={mirror} size={64} />
            </>
          ) : <div className="sem-preview-letter dim">?</div>}
        </div>
      )}

      {flash.key > 0 && <div key={`f${flash.key}`} className={`flash ${flash.big ? 'big' : ''}`} />}
      {burst.key > 0 && <div key={`b${burst.key}`} className="burst">{burst.text}</div>}

      {calibrating && (
        <div className="calib">
          <ProgressRing progress={calibProgress} size={190} stroke={14} color="#ffd23f">
            <span className="ring-emoji">🧍</span>
          </ProgressRing>
          <div className="calib-title">차렷 자세로 2초!</div>
          <div className="calib-sub">
            {!hud.hasBody ? '카메라에 전신이 나오게 서 주세요' : !hud.fullBody ? '조금 뒤로 — 골반까지 보여야 해요' : '팔을 몸에 붙이고 가만히…'}
          </div>
          <button onClick={() => setCalibrating(false)}>건너뛰기 (점프 인식 꺼짐)</button>
        </div>
      )}

      {showUI && debug.a && (
        <div className="debug">
          <div>R θ {debug.a.right.theta.toFixed(0)}° · elbow {debug.a.right.elbowAngle.toFixed(0)}°</div>
          <div>L θ {debug.a.left.theta.toFixed(0)}° · elbow {debug.a.left.elbowAngle.toFixed(0)}°</div>
          <div>jump {debug.a.jump.toFixed(2)} {calibration || source === 'none' ? '' : '(캘리브레이션 필요)'} · {debug.fps}fps</div>
          <div>pose {debug.a.pose ?? '—'}</div>
        </div>
      )}
    </div>
  )

  const panel = (
    <div className="panel">
      <CodeEditor code={fullCode} filename={mode === 'token' ? 'dance.js' : 'semaphore.js'} />
      <OutputPanel result={result} success={success} runKey={runKey} />
    </div>
  )

  return (
    <div className={`app layout-${layout} ${showUI ? '' : 'clean'}`}>
      {showUI && toolbar}
      {!showUI && <button className="ui-restore" onClick={() => setShowUI(true)} title="UI 보이기 (Esc)">⚙︎</button>}

      <div className="frame">
        {stage}
        {panel}
      </div>

      {showUI && started && (
        <aside className="dock">
          {mode === 'token' ? (
            <>
              <h3>포즈 매핑</h3>
              <ul className="legend">
                {TOKEN_POSES.map((p) => (
                  <li key={p.id} className={hud.candidate === p.id ? 'active' : ''}>
                    <kbd>{p.key}</kbd>
                    <span className="lg-emoji">{p.emoji}</span>
                    <span className="lg-text">
                      <b>{p.name}</b>
                      <small>{p.how}</small>
                    </span>
                    <code>{p.action.type === 'insert' ? p.action.text : p.action.type === 'backspace' ? '⌫' : '▶ 실행'}</code>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h3>수기신호 (화면 기준)</h3>
              <SemaphoreGuide mirror={mirror} current={hud.semLive} />
              <p className="hint">키보드: A–Z 글자, Space 띄어쓰기, Backspace 지우기, 7/Enter 실행</p>
            </>
          )}
          <p className="hint">
            Esc 녹화모드 · Shift+M 모드 · Shift+L 레이아웃 · Shift+F 미러 · Shift+C 캘리브레이션 · Shift+R 지우기 · Shift+S 소리
          </p>
          {(mediaError || modelError) && <p className="err">{mediaError ?? `포즈 모델 로드 실패: ${modelError}`}</p>}
        </aside>
      )}

      {!started && (
        <div className="start">
          <div className="start-card">
            <h1>💃 dance<span>-to-</span>code</h1>
            <p>춤으로 <code>console.log("Hello World");</code> 를 입력하고, 점프해서 실행하세요.</p>
            <div className="start-actions">
              <button className="primary big" onClick={startCamera}>📷 웹캠으로 시작</button>
              <button className="big" onClick={() => fileRef.current?.click()}>🎞️ 영상 파일로 테스트</button>
              <button className="big" onClick={startKeyboardOnly}>⌨️ 키보드 시뮬레이션</button>
            </div>
            <p className="hint">키보드 1~7 = 각 포즈 · 카메라 영상은 브라우저 밖으로 나가지 않아요</p>
            {mediaError && <p className="err">{mediaError}</p>}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="video/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void startVideoFile(f)
          e.target.value = ''
        }}
      />
      <Confetti fireKey={confettiKey} />
    </div>
  )
}
