/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // self-host MediaPipe's WASM runtime (served from our own origin, no CDN needed)
      'mediapipe-wasm': fileURLToPath(new URL('./node_modules/@mediapipe/tasks-vision/wasm', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
