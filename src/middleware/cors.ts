import { getAllowedOrigins } from '#/utils/env'

export const corsHeaders = (origin: string | null): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins()
  const o =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0]
  return {
    'Access-Control-Allow-Origin': o,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export const withCors = (response: Response, request: Request): Response => {
  const origin = request.headers.get('origin')
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    response.headers.set(key, value)
  }
  return response
}

export const corsJson = (
  request: Request,
  data: unknown,
  init?: ResponseInit,
): Response => {
  const origin = request.headers.get('origin')
  const headers = new Headers(init?.headers)
  for (const [key, value] of Object.entries(corsHeaders(origin))) {
    headers.set(key, value)
  }
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(data), { ...init, headers })
}

/**
 * Reject cross-origin requests whose `Origin` is not in the allow-list.
 *
 * Browsers always send an `Origin` header on cross-origin requests (and on
 * same-origin POST/PUT/DELETE), so a present-but-unlisted origin is a clear
 * signal the call is coming from outside the app and should be blocked. A
 * missing `Origin` (e.g. a same-origin GET, or a non-browser client) is
 * allowed through — this guard is about stopping *other web apps*, not
 * server-to-server traffic.
 *
 * Returns a 403 `Response` to short-circuit, or `null` when the request may
 * proceed.
 */
export function originGuard(request: Request): Response | null {
  const origin = request.headers.get('origin')
  if (origin && !getAllowedOrigins().includes(origin)) {
    return corsJson(
      request,
      { error: true, message: 'Origin not allowed' },
      { status: 403 },
    )
  }
  return null
}
