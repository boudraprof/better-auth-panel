/**
 * Demo mode: when enabled (the default), mutating operations are blocked so a
 * public demo stays browseable but read-only.
 *
 * This module is the single source of truth for demo policy. Server callers
 * ask `canMutate` (Better Auth namespace) or `canMutateAdmin` (custom admin
 * endpoints); client components use `useDemoAction()`.
 *
 * The flags are also declared in `#/utils/env` for validation, but are read
 * raw here: the validated proxy snapshots `process.env`/`import.meta.env` at
 * import time and throws on cross-realm access, while tests (and SSR) need
 * live reads without touching server-only vars in the browser.
 */

/** Message shown when a mutation is refused in demo mode. */
export const DEMO_MODE_MESSAGE =
  'Demo mode: user changes are disabled. You can view data only.'

/** Better Auth endpoints that mutate data. Checked by path as Better Auth sees it (`ctx.path`). */
export const DEMO_BLOCKED_PATHS = new Set([
  // Better Auth admin plugin mutations
  '/admin/ban-user',
  '/admin/create-user',
  '/admin/impersonate-user',
  '/admin/remove-user',
  '/admin/revoke-user-session',
  '/admin/revoke-user-sessions',
  '/admin/set-role',
  '/admin/set-user-password',
  '/admin/stop-impersonating',
  '/admin/unban-user',
  '/admin/update-user',
  // User self-service profile mutations
  '/update-user',
  '/change-email',
  '/change-password',
  '/delete-user',
  '/set-password',
  '/link-account',
  '/unlink-account',
  // Organization plugin mutations
  '/organization/create',
  '/organization/delete',
  '/organization/update',
  '/organization/set-active',
  '/organization/remove-member',
  '/organization/update-member-role',
  '/organization/leave',
  '/organization/invite-member',
  '/organization/cancel-invitation',
  '/organization/accept-invitation',
  '/organization/reject-invitation',
])

/** Custom admin POST endpoints that only read data, allowed even in demo mode. */
const DEMO_READ_ONLY_PATHS = new Set(['/api/v1/admin/user-activity'])

function demoModeValue(): string | undefined {
  if (typeof process !== 'undefined') {
    if (process.env.DEMO_MODE !== undefined) return process.env.DEMO_MODE
    if (process.env.VITE_DEMO_MODE !== undefined)
      return process.env.VITE_DEMO_MODE
  }
  return import.meta.env.VITE_DEMO_MODE
}

export function isDemoMode(): boolean {
  // Opt-out semantics: anything other than exactly "false" enables demo mode.
  return (demoModeValue() ?? 'true').trim().toLowerCase() !== 'false'
}

/**
 * True when a mutation against a Better Auth path is allowed. Deny-by-list:
 * only paths known to mutate data are refused.
 */
export function canMutate(path: string): boolean {
  if (!isDemoMode()) return true
  return !DEMO_BLOCKED_PATHS.has(path)
}

/**
 * True when a request to a custom admin endpoint (`/api/v1/admin/*`) may be
 * served. Allow-by-list: every custom endpoint is treated as mutating unless
 * explicitly marked read-only.
 */
export function canMutateAdmin(pathname: string): boolean {
  if (!isDemoMode()) return true
  return DEMO_READ_ONLY_PATHS.has(pathname)
}
