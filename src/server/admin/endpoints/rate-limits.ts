import { desc } from 'drizzle-orm'

import type { AdminContext } from '../types'

export async function listRateLimits(ctx: AdminContext) {
  const entries = await ctx.db
    .select()
    .from(ctx.schema.rateLimit)
    .orderBy(desc(ctx.schema.rateLimit.lastRequest))
    .limit(200)

  return { data: entries }
}
