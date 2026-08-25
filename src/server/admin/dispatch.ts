import { corsJson } from '#/middleware/cors'
import logger from '#/utils/logger'
import { db, schema } from '#/utils/config'
import type {
  AdminContext,
  AdminGetArgs,
  AdminPostArgs,
} from './types'
import { AdminError } from './types'
import { adminEndpoints } from './registry'

/**
 * Dispatcher for migrated admin endpoints.
 *
 * Owns, exactly once: the JSON envelope, error mapping (AdminError → its
 * status; anything else → logged 500), and the shared handler context.
 * Auth (`assertAdmin`) stays in the route; demo-mode policy for POSTs is
 * applied here via canMutateAdmin.
 */

function adminContext(): AdminContext {
  return { db, schema }
}

function toErrorResponse(request: Request, error: unknown): Response {
  if (error instanceof AdminError) {
    return corsJson(
      request,
      { error: true, message: error.message },
      { status: error.status },
    )
  }

  logger.error('Admin request failed', error, 'Admin')
  return corsJson(
    request,
    { error: true, message: 'Internal server error' },
    { status: 500 },
  )
}

/** Run an ad-hoc handler with the standard envelope + error mapping. */
export async function runAdminHandler(
  request: Request,
  run: (ctx: AdminContext) => Promise<unknown>,
): Promise<Response> {
  try {
    const data = await run(adminContext())
    return toResponse(request, data)
  } catch (error) {
    return toErrorResponse(request, error)
  }
}

/** Handlers may return a fully-formed Response (e.g. CSV downloads). */
function toResponse(request: Request, data: unknown): Response {
  if (data instanceof Response) return data
  return corsJson(request, data ?? {}, { status: 200 })
}

export function hasGetHandler(pathname: string): boolean {
  return Boolean(adminEndpoints[pathname]?.GET)
}

export function hasPostHandler(pathname: string): boolean {
  return Boolean(adminEndpoints[pathname]?.POST)
}

export async function handleAdminGet(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const endpoint = adminEndpoints[url.pathname]

  if (!endpoint?.GET) {
    throw new AdminError(404, 'Not found')
  }

  const args: AdminGetArgs = { url }
  try {
    const data = await endpoint.GET(adminContext(), args)
    return toResponse(request, data)
  } catch (error) {
    return toErrorResponse(request, error)
  }
}

export async function handleAdminPost(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const endpoint = adminEndpoints[url.pathname]

  if (!endpoint?.POST) {
    throw new AdminError(404, 'Not found')
  }

  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >
  const args: AdminPostArgs = { url, body }
  try {
    const data = await endpoint.POST(adminContext(), args)
    return toResponse(request, data)
  } catch (error) {
    return toErrorResponse(request, error)
  }
}
