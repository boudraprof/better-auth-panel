import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getServerSession } from '#/utils/session'

/**
 * Route-level middleware for pages that require any authenticated (non-banned)
 * session — including plain users, support staff, and admins. Impersonating
 * sessions are allowed so admins can preview the user-facing area.
 */
export const authedMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getServerSession()

  if (!session) {
    throw redirect({ to: '/auth/signin' })
  }

  if (session.user.banned) {
    throw redirect({ to: '/auth/signin' })
  }

  return await next()
})
