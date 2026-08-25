import { describe, expect, it, vi } from 'vitest'

// The dispatcher module wires the real db/env singletons at import time;
// replace them so the test stays in jsdom without touching env.
vi.mock('#/utils/config', () => ({
  db: {},
  schema: {},
}))
vi.mock('#/middleware/cors', () => ({
  corsJson: (
    _request: Request,
    data: unknown,
    init?: ResponseInit,
  ) =>
    new Response(JSON.stringify(data), {
      ...init,
      headers: { 'Content-Type': 'application/json' },
    }),
}))

/**
 * Unit tests for the migrated admin endpoints and the dispatcher's error
 * mapping — no HTTP, no module mocking: dependencies are injected.
 */

type Row = Record<string, unknown>

/** Minimal chainable drizzle stub: select().from().where().orderBy() → rows. */
function fakeDb(rows: Row[]) {
  const chain = () => {
    const builder = {
      from: () => builder,
      where: () => builder,
      orderBy: () => builder,
      limit: () => builder,
      groupBy: () => builder,
      then: (
        resolve: (rows: Row[]) => void,
        reject?: (e: unknown) => void,
      ) => Promise.resolve(rows).then(resolve, reject),
    }
    return builder
  }
  return {
    select: () => chain(),
    insert: () => {
      throw new Error('not implemented in fake')
    },
    update: () => {
      throw new Error('not implemented in fake')
    },
    delete: () => {
      throw new Error('not implemented in fake')
    },
  }
}

// Column references only flow into the fake query builder; plain objects suffice.
const schemaStub = {
  account: {
    id: {},
    provider: {},
    providerId: {},
    accountId: {},
    createdAt: {},
    userId: {},
  },
  user: { role: {}, emailVerified: {}, banned: {}, createdAt: {} },
} as never

function ctxWith(db: unknown) {
  return { db: db as never, schema: schemaStub }
}

import { AdminError } from '#/server/admin/types'
import { listAccounts } from '#/server/admin/endpoints/accounts'
import { getStats } from '#/server/admin/endpoints/stats'
import { runAdminHandler } from '#/server/admin/dispatch'
import logger from '#/utils/logger'

vi.mock('#/utils/logger', () => ({
  default: { error: vi.fn() },
}))

describe('listAccounts', () => {
  it('throws AdminError(400) when userId is missing', async () => {
    await expect(
      listAccounts(ctxWith(fakeDb([])), null),
    ).rejects.toMatchObject({
      name: 'AdminError',
      status: 400,
      message: 'userId is required',
    })
  })

  it('returns wrapped rows for a userId', async () => {
    const rows = [{ id: 'a1' }]
    const result = await listAccounts(
      ctxWith(fakeDb(rows)),
      'user-1',
    )
    expect(result).toEqual({ data: rows })
  })

  it('propagates db failures (dispatcher turns them into 500s)', async () => {
    const failing = {
      select: () => {
        throw new Error('boom')
      },
    }
    await expect(
      listAccounts(ctxWith(failing), 'user-1'),
    ).rejects.toThrow('boom')
  })
})

describe('getStats', () => {
  it('maps the aggregate row onto AdminStats', async () => {
    const row = {
      total: 10,
      admins: 2,
      verified: 7,
      banned: 1,
      recentUsers: 3,
    }
    const result = await getStats(ctxWith(fakeDb([row])))
    expect(result).toEqual(row)
  })
})

describe('runAdminHandler', () => {
  const request = new Request('http://localhost/api/v1/admin/x')

  it('wraps returned data in a 200 envelope', async () => {
    const res = await runAdminHandler(request, async () => ({ a: 1 }))
    expect(res.status).toBe(200)
    await expect(res.json()).resolves.toEqual({ a: 1 })
  })

  it('maps AdminError to its status and message', async () => {
    const res = await runAdminHandler(request, async () => {
      throw new AdminError(400, 'userId is required')
    })
    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: true,
      message: 'userId is required',
    })
  })

  it('maps unexpected errors to a logged 500', async () => {
    const res = await runAdminHandler(request, async () => {
      throw new Error('db exploded')
    })
    expect(res.status).toBe(500)
    await expect(res.json()).resolves.toEqual({
      error: true,
      message: 'Internal server error',
    })
    expect(logger.error).toHaveBeenCalled()
  })

  it('normalizes undefined data to an empty object', async () => {
    const res = await runAdminHandler(request, async () => undefined)
    await expect(res.json()).resolves.toEqual({})
  })
})
