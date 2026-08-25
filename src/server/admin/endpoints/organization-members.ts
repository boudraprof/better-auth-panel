import { eq } from 'drizzle-orm'

import type { AdminContext, AdminGetArgs } from '../types'
import { AdminError } from '../types'

export async function listOrganizationMembers(
  ctx: AdminContext,
  { url }: AdminGetArgs,
) {
  const orgId = url.searchParams.get('orgId')

  if (!orgId) {
    throw new AdminError(400, 'orgId is required')
  }

  const members = await ctx.db
    .select({
      id: ctx.schema.member.id,
      role: ctx.schema.member.role,
      createdAt: ctx.schema.member.createdAt,
      userId: ctx.schema.member.userId,
      name: ctx.schema.user.name,
      email: ctx.schema.user.email,
      image: ctx.schema.user.image,
    })
    .from(ctx.schema.member)
    .innerJoin(ctx.schema.user, eq(ctx.schema.member.userId, ctx.schema.user.id))
    .where(eq(ctx.schema.member.organizationId, orgId))
    .orderBy(ctx.schema.member.createdAt)

  return { data: members }
}
