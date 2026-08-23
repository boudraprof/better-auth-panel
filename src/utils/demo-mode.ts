export const DEMO_MODE_MESSAGE =
  'Demo mode: user changes are disabled. You can view data only.'

/**
 * Whether the panel runs in read-only demo mode.
 *
 * Two independent layers read this:
 *  - The server (the auth `before` hook) blocks mutations at runtime from
 *    `process.env`, so flipping `DEMO_MODE` takes effect immediately without a
 *    rebuild. We therefore prefer the runtime value.
 *  - The client bundle bakes in `VITE_DEMO_MODE` at build time (the only way a
 *    static browser bundle can know), and uses it to hide controls / show the
 *    demo banner and toasts.
 *
 * Reading order:
 *   1. `process.env.DEMO_MODE` / `process.env.VITE_DEMO_MODE` (server runtime)
 *   2. `import.meta.env.VITE_DEMO_MODE` (client build time)
 *   3. The documented default of demo mode ON.
 *
 * Both `DEMO_MODE=false` and `VITE_DEMO_MODE=false` disable demo mode; any other
 * value (or unset) leaves it enabled. Access is guarded so this is safe in both
 * the browser (no `process`) and a bare Node bundle (no `import.meta.env`).
 */
export function isDemoMode(): boolean {
  const runtimeValue =
    typeof process !== 'undefined'
      ? (process.env.DEMO_MODE ?? process.env.VITE_DEMO_MODE)
      : undefined

  const buildValue =
    typeof import.meta !== 'undefined'
      ? ((import.meta.env as Record<string, string | undefined> | undefined)
          ?.VITE_DEMO_MODE)
      : undefined

  const value = runtimeValue ?? buildValue ?? 'true'
  return value.toLowerCase() !== 'false'
}
