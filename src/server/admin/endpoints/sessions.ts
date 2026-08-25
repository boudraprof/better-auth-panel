import { eq } from 'drizzle-orm'

import type { AdminContext, AdminGetArgs } from '../types'

export async function listSessions(ctx: AdminContext, { url }: AdminGetArgs) {
  const userIdFilter = url.searchParams.get('userId')

  const rows = await ctx.db
    .select({
      id: ctx.schema.session.id,
      userId: ctx.schema.session.userId,
      ipAddress: ctx.schema.session.ipAddress,
      userAgent: ctx.schema.session.userAgent,
      impersonatedBy: ctx.schema.session.impersonatedBy,
      createdAt: ctx.schema.session.createdAt,
      expiresAt: ctx.schema.session.expiresAt,
    })
    .from(ctx.schema.session)
    .where(
      userIdFilter
        ? eq(ctx.schema.session.userId, userIdFilter)
        : undefined,
    )
    .orderBy(ctx.schema.session.createdAt)

  return { data: rows }
}
