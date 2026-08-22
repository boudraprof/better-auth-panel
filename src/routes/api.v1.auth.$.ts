import { createFileRoute } from '@tanstack/react-router'
import { auth } from '#/utils/auth'
import { withCors } from '#/middleware/cors'
import { requestUrl } from '#/utils/url'

export const Route = createFileRoute('/api/v1/auth/$')({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        return withCors(await auth.handler(requestUrl(request)), request)
      },
      POST: async ({ request }: { request: Request }) => {
        return withCors(await auth.handler(requestUrl(request)), request)
      },
    },
  },
})
