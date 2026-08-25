import { and, count, desc, eq } from 'drizzle-orm'

import type { AdminContext, AdminGetArgs } from '../types'

export async function listAuditLogs(
  ctx: AdminContext,
  { url }: AdminGetArgs,
) {
  const page = parseInt(url.searchParams.get('page') || '0')
  const limit = parseInt(url.searchParams.get('limit') || '50')
  const action = url.searchParams.get('action')
  const actorId = url.searchParams.get('actorId')
  const offset = page * limit

  const whereConditions = []

  if (action) {
    whereConditions.push(eq(ctx.schema.auditLog.action, action))
  }

  if (actorId) {
    whereConditions.push(eq(ctx.schema.auditLog.actorId, actorId))
  }

  const where =
    whereConditions.length > 0
      ? and(...whereConditions)
      : undefined

  const [totalResult] = await ctx.db
    .select({ total: count() })
    .from(ctx.schema.auditLog)
    .where(where)

  const logs = await ctx.db
    .select()
    .from(ctx.schema.auditLog)
    .where(where)
    .orderBy(desc(ctx.schema.auditLog.createdAt))
    .limit(limit)
    .offset(offset)

  return {
    data: logs,
    total: totalResult.total,
  }
}
