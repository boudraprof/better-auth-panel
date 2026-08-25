import { count, desc } from 'drizzle-orm'

import type { AdminContext } from '../types'

export async function listOrganizations(ctx: AdminContext) {
  const orgs = await ctx.db
    .select({
      id: ctx.schema.organization.id,
      name: ctx.schema.organization.name,
      slug: ctx.schema.organization.slug,
      logo: ctx.schema.organization.logo,
      createdAt: ctx.schema.organization.createdAt,
      updatedAt: ctx.schema.organization.updatedAt,
    })
    .from(ctx.schema.organization)
    .orderBy(desc(ctx.schema.organization.createdAt))

  const memberCounts = await ctx.db
    .select({
      organizationId: ctx.schema.member.organizationId,
      count: count(),
    })
    .from(ctx.schema.member)
    .groupBy(ctx.schema.member.organizationId)

  const countMap = new Map(
    memberCounts.map((row) => [row.organizationId, row.count]),
  )

  return {
    data: orgs.map((org) => ({
      ...org,
      memberCount: countMap.get(org.id) ?? 0,
    })),
  }
}
