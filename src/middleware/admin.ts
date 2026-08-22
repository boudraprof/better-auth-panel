import { redirect } from '@tanstack/react-router'
import { createMiddleware } from '@tanstack/react-start'
import { getServerSession } from '#/utils/session'
import { assertAdmin } from '#/utils/admin'

export const adminMiddleware = createMiddleware().server(async ({ next }) => {
  const session = await getServerSession()

  const result = assertAdmin(session)
  if (!result.ok) {
    // Everyone who fails the admin check — unauthenticated users, plain
    // users, banned accounts, and impersonation sessions — goes back to
    // sign-in. The panel is admin-only; there is no "forbidden" page.
    // (NOT back to '/' — that route is admin-protected too and would loop.)
    throw redirect({
      to: '/auth/signin',
    })
  }

  return await next()
})
