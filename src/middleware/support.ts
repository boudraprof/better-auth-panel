import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getServerSession } from '#/utils/session'
import { normalizeRole } from '#/utils/permissions'

/**
 * Route-level middleware for Support Desk pages.
 * Admins and Support staff can access support tickets/messages.
 */
export const supportMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getServerSession()

  if (!session || session.user.banned || session.session.impersonatedBy) {
    throw redirect({ to: '/auth/signin' })
  }

  const role = normalizeRole(session.user.role)
  if (role !== 'support' && role !== 'admin') {
    throw redirect({ to: '/auth/signin' })
  }

  return await next()
})
