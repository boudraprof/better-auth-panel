import type { AuthSession } from '#/middleware/api'
import { normalizeRole, hasPermission  } from '#/utils/permissions'
import type {Permission} from '#/utils/permissions';

/**
 * Result of {@link assertAdmin}. Discriminates on `ok`.
 *  - `ok: true`  → caller may proceed; `session` is the non-null admin session.
 *  - `ok: false` → caller must bail with the given HTTP `status` + `message`.
 */
export type AdminCheckResult =
  | { ok: true; session: AuthSession }
  | { ok: false; status: number; message: string }

/**
 * Single source of truth for admin authorization, shared by the route-level
 * `adminMiddleware` and the raw `/v1/api/admin/*` endpoints (which any client
 * could call directly, so they must re-check auth themselves).
 *
 * Rejects when:
 *  - there is no session (401),
 *  - the user is not an admin (403),
 *  - the user is banned (403),
 *  - the session is an impersonation session (403) — admins should not be able
 *    to wield admin powers while impersonating another user.
 */
export function assertAdmin(session: AuthSession | null): AdminCheckResult {
  if (!session) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const { user, session: sess } = session

  if (user.role !== 'admin') {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  if (user.banned) {
    return { ok: false, status: 403, message: 'Account banned' }
  }

  if (sess.impersonatedBy) {
    return { ok: false, status: 403, message: 'Forbidden while impersonating' }
  }

  return { ok: true, session }
}

/**
 * Like {@link assertAdmin} but also admits the `support` role — i.e. anyone
 * allowed into the panel at all (admin or support). Rejects plain `user`s,
 * banned accounts, and impersonation sessions.
 */
export function assertStaff(session: AuthSession | null): AdminCheckResult {
  if (!session) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const { user, session: sess } = session

  if (user.banned) {
    return { ok: false, status: 403, message: 'Account banned' }
  }

  if (sess.impersonatedBy) {
    return { ok: false, status: 403, message: 'Forbidden while impersonating' }
  }

  if (normalizeRole(user.role) === 'user') {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true, session }
}

/**
 * Permission-scoped authorization. `admin` always passes; other roles are
 * checked against {@link hasPermission}. Banned accounts and impersonation
 * sessions are always rejected.
 */
export function assertPermission(
  session: AuthSession | null,
  permission: Permission,
): AdminCheckResult {
  if (!session) {
    return { ok: false, status: 401, message: 'Unauthorized' }
  }

  const { user, session: sess } = session

  if (user.banned) {
    return { ok: false, status: 403, message: 'Account banned' }
  }

  if (sess.impersonatedBy) {
    return { ok: false, status: 403, message: 'Forbidden while impersonating' }
  }

  if (!hasPermission(user.role, permission)) {
    return { ok: false, status: 403, message: 'Forbidden' }
  }

  return { ok: true, session }
}
