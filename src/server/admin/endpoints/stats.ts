import { count, sql } from 'drizzle-orm'

import type { AdminContext } from '../types'
import type { AdminStats } from '#/types'

export async function getStats(ctx: AdminContext): Promise<AdminStats> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

  const [row] = await ctx.db
    .select({
      total: count(),
      admins: count(
        sql`CASE WHEN ${ctx.schema.user.role} = 'admin' THEN 1 END`,
      ),
      verified: count(
        sql`CASE WHEN ${ctx.schema.user.emailVerified} = true THEN 1 END`,
      ),
      banned: count(
        sql`CASE WHEN ${ctx.schema.user.banned} = true THEN 1 END`,
      ),
      recentUsers: count(
        sql`CASE WHEN ${ctx.schema.user.createdAt} >= ${since.toISOString()} THEN 1 END`,
      ),
    })
    .from(ctx.schema.user)

  return {
    total: row.total,
    admins: row.admins,
    verified: row.verified,
    banned: row.banned,
    recentUsers: row.recentUsers,
  }
}
