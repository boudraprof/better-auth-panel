import { eq } from 'drizzle-orm'

import type { AdminContext } from '../types'
import { AdminError } from '../types'

export async function listAccounts(ctx: AdminContext, userId: string | null) {
  if (!userId) {
    throw new AdminError(400, 'userId is required')
  }

  const accounts = await ctx.db
    .select({
      id: ctx.schema.account.id,
      provider: ctx.schema.account.providerId,
      accountId: ctx.schema.account.accountId,
      createdAt: ctx.schema.account.createdAt,
    })
    .from(ctx.schema.account)
    .where(eq(ctx.schema.account.userId, userId))
    .orderBy(ctx.schema.account.createdAt)

  return { data: accounts }
}
