import type { AdminContext } from '../types'

export async function getEmailConfig(ctx: AdminContext) {
  const config = await ctx.db
    .select()
    .from(ctx.schema.emailConfig)
    .limit(1)

  return { data: config[0] || null }
}
