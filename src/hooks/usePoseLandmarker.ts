import { PoseLandmarker } from '@mediapipe/tasks-vision'
import { useCallback, useRef, useState } from 'react'
// WASM runtime is bundled by Vite (see the `mediapipe-wasm` alias in vite.config.ts)
import wasmLoaderPath from 'mediapipe-wasm/vision_wasm_internal.js?url'
import wasmBinaryPath from 'mediapipe-wasm/vision_wasm_internal.wasm?url'
export const MODEL_URLS = {
  lite: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
  full: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
}

export type LoadState = 'idle' | 'loading' | 'ready' | 'error'

/** Lazily creates a MediaPipe PoseLandmarker (GPU, falls back to CPU). */
export function usePoseLandmarker() {
  const ref = useRef<PoseLandmarker | null>(null)
  const loading = useRef<Promise<PoseLandmarker> | null>(null)
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (ref.current) return ref.current
    if (loading.current) return loading.current
    setState('loading')
    loading.current = (async () => {
      const fileset = { wasmLoaderPath, wasmBinaryPath }
      const create = (delegate: 'GPU' | 'CPU') =>
        PoseLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_URLS.full, delegate },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
      try {
        return await create('GPU')
      } catch {
        return await create('CPU')
      }
    })()
    try {
      const lm = await loading.current
      ref.current = lm
      setState('ready')
      return lm
    } catch (e) {
      loading.current = null
      setState('error')
      setError(e instanceof Error ? e.message : String(e))
      throw e
    }
  }, [])

  return { landmarkerRef: ref, load, state, error }
}
