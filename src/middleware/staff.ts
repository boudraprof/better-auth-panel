import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getServerSession } from '#/utils/session'
import { assertAdmin } from '#/utils/admin'

/**
 * Route-level middleware for Admin UI pages.
 * Only `admin` role is allowed access.
 */
export const staffMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getServerSession()

  const result = assertAdmin(session)
  if (!result.ok) {
    throw redirect({
      to: '/auth/signin',
    })
  }

  return await next()
})
