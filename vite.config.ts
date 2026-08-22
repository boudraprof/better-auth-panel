import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { nitro } from 'nitro/vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-server resilience: when Vite re-optimizes dependencies (e.g. after a
// source edit) it aborts in-flight SSR requests. That surfaces as an
// `AbortError` (the aborted web `Request` signal) that rejects as an unhandled
// rejection and crashes the dev Node process. Aborted requests are benign — the
// client already disconnected / reloaded — so swallow `AbortError` and keep the
// server alive. The production server (`server.mjs`) already wraps every
// request in try/catch, so this guard is dev-only.
const isAbortError = (reason: unknown): boolean => {
  if (reason instanceof Error) return reason.name === 'AbortError'
  if (typeof reason === 'object' && reason !== null) {
    return (reason as { name?: unknown }).name === 'AbortError'
  }
  return false
}

// Swallow only `AbortError` (benign aborted requests). Anything else is
// re-thrown so the process still fails loudly on real errors.
process.on('unhandledRejection', (reason) => {
  if (!isAbortError(reason)) throw reason
})
process.on('uncaughtException', (err) => {
  if (!isAbortError(err)) throw err
})

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    tailwindcss(),
    tanstackStart(),
    nitro(),
    viteReact(),
  ],
  server: {
    host: '127.0.0.1',
    port: 8000,
    allowedHosts: ['is.demoteam.ch'],
    watch: {
      // Playwright writes these dirs during e2e runs; watching them triggers
      // full page reloads that abort in-flight API requests mid-test.
      ignored: [
        '**/test-results/**',
        '**/playwright-report/**',
        '**/dist/**',
        '**/.tanstack/**',
        '**/*.db',
        '**/*.db-wal',
        '**/*.db-shm',
      ],
    },
  },
})

export default config
