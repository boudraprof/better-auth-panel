import type { AdminCheckResult, AuthSession, Permission } from '#/types';
import { hasPermission } from '#/utils/permissions'






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
