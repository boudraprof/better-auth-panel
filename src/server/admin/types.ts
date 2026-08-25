import type { AppDatabase } from '#/utils/config'
import type * as schema from '#/db/schema'

/**
 * Thrown by handlers to short-circuit with a specific HTTP status. Anything
 * else thrown becomes a logged 500 — the dispatcher owns the envelope.
 */
export class AdminError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'AdminError'
  }
}

/**
 * Everything a handler may touch. Injected (not imported) so unit tests can
 * pass fakes without module mocking.
 */
export interface AdminContext {
  db: AppDatabase
  schema: typeof schema
}

export interface AdminGetArgs {
  url: URL
}

export interface AdminPostArgs {
  url: URL
  body: Record<string, unknown>
}

export type AdminGetHandler = (
  ctx: AdminContext,
  args: AdminGetArgs,
) => Promise<unknown>

export type AdminPostHandler = (
  ctx: AdminContext,
  args: AdminPostArgs,
) => Promise<unknown>

/** One custom admin endpoint: full pathname → supported methods. */
export interface AdminEndpoint {
  GET?: AdminGetHandler
  POST?: AdminPostHandler
}
