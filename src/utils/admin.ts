import type { AdminCheckResult, AuthSession } from '#/types';






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

