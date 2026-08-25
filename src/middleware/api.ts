import { createMiddleware } from '@tanstack/react-start'
import { getServerSession } from '#/utils/session'
import { unauthorized } from '#/utils/utils'
import type { AuthSession } from '#/types'

export const apiAuthMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await getServerSession(request.headers)

    if (!session) {
      throw unauthorized(request)
    }

    return await next()
  },
)

export type RequireApiAuthResult =
  | { session: AuthSession; response: null }
  | { session: null; response: Response }

export async function requireApiAuth(
  request: Request,
): Promise<RequireApiAuthResult> {
  const session = await getServerSession(request.headers)

  if (!session) {
    return { session: null, response: unauthorized(request) }
  }

  return { session, response: null }
}
