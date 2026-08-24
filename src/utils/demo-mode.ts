export const DEMO_MODE_MESSAGE =
  'Demo mode: user changes are disabled. You can view data only.'

import { env } from '#/utils/env'

/**
 * Whether the panel runs in read-only demo mode.
 *
 * Two independent layers read this:
 *  - The server (the auth `before` hook and the custom admin API) blocks
 *    mutations at runtime from `process.env`, so flipping `DEMO_MODE` takes
 *    effect immediately without a rebuild. `vite.config.ts` loads `.env` (via
 *    `dotenv/config`) and `app-server.mjs` does the same for production, so
 *    `process.env.DEMO_MODE` is always available at runtime.
 *  - The client bundle bakes in `VITE_DEMO_MODE` at build time (the only way a
 *    static browser bundle can know) and uses it to hide controls / show the
 *    demo banner and toasts. `vite.config.ts` mirrors `DEMO_MODE` into
 *    `VITE_DEMO_MODE` when the latter is not set explicitly, so a single
 *    `DEMO_MODE` variable controls both layers.
 *
 * Reading order:
 *   1. `process.env.DEMO_MODE` / `process.env.VITE_DEMO_MODE` (server runtime)
 *   2. `import.meta.env.VITE_DEMO_MODE` (client build time)
 *   3. The documented default of demo mode ON.
 *
 * `DEMO_MODE=false` is the canonical way to disable demo mode; `VITE_DEMO_MODE`
 * may be set explicitly to override the client build-time value. Any value
 * other than `false` (or unset) leaves demo mode enabled. Access is guarded so
 * this is safe in both the browser (no `process`) and a bare Node bundle (no
 * `import.meta.env`).
 */
export function isDemoMode(): boolean {
  const runtimeValue =
    typeof process !== 'undefined'
      ? (process.env.DEMO_MODE ?? process.env.VITE_DEMO_MODE)
      : undefined

  const buildValue =
    typeof import.meta !== 'undefined'
      ? env.VITE_DEMO_MODE
      : undefined

  const value = runtimeValue ?? buildValue ?? 'true'
  return value.toLowerCase() !== 'false'
}
