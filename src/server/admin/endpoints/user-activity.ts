import { desc, eq } from 'drizzle-orm'

import type { AdminContext, AdminGetArgs } from '../types'
import { AdminError } from '../types'

export async function getUserActivity(ctx: AdminContext, { url }: AdminGetArgs) {
  const userId = url.searchParams.get('userId')

  if (!userId) {
    throw new AdminError(400, 'userId is required')
  }

  const logs = await ctx.db
    .select()
    .from(ctx.schema.auditLog)
    .where(eq(ctx.schema.auditLog.targetId, userId))
    .orderBy(desc(ctx.schema.auditLog.createdAt))
    .limit(100)

  return { data: logs }
}
