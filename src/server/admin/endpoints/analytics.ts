import { count, desc, eq, gte, sql } from 'drizzle-orm'

import type { AdminContext } from '../types'
import type { AnalyticsData } from '#/types'

const EMPTY_ANALYTICS: AnalyticsData = {
  dailySignups: [],
  activeUsers: 0,
  auditBreakdown: [],
  newToday: 0,
  roleDistribution: [],
  verifiedUsers: 0,
  unverifiedUsers: 0,
  bannedUsers: 0,
  sessionsPerDay: [],
  cumulativeGrowth: [],
  totalUsers: 0,
}

/**
 * Analytics degrades gracefully: any query failure yields a zeroed payload
 * with a 200 rather than an error, so the dashboard always renders.
 */
export async function getAnalytics(
  ctx: AdminContext,
): Promise<AnalyticsData> {
  try {
    const now = new Date()
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    )
    const sevenDaysAgo = new Date(
      now.getTime() - 7 * 24 * 60 * 60 * 1000,
    )
    const yesterday = new Date(
      now.getTime() - 24 * 60 * 60 * 1000,
    )

    const [
      dailySignupsResult,
      activeUsersResult,
      auditBreakdownResult,
      newTodayResult,
      roleDistResult,
      verifiedResult,
      bannedResult,
      sessionsPerDayResult,
      cumulativeGrowthResult,
      totalUsersResult,
    ] = await Promise.all([
      ctx.db
        .select({
          date: sql<string>`DATE(${ctx.schema.user.createdAt})`,
          count: count(),
        })
        .from(ctx.schema.user)
        .where(gte(ctx.schema.user.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${ctx.schema.user.createdAt})`)
        .orderBy(sql`DATE(${ctx.schema.user.createdAt})`)
        .catch(() => []),

      ctx.db
        .select({ count: count() })
        .from(ctx.schema.session)
        .where(gte(ctx.schema.session.createdAt, sevenDaysAgo))
        .then((r) => r[0]?.count ?? 0)
        .catch(() => 0),

      ctx.db
        .select({
          action: ctx.schema.auditLog.action,
          count: count(),
        })
        .from(ctx.schema.auditLog)
        .groupBy(ctx.schema.auditLog.action)
        .orderBy(desc(count()))
        .catch(() => []),

      ctx.db
        .select({ count: count() })
        .from(ctx.schema.user)
        .where(gte(ctx.schema.user.createdAt, yesterday))
        .then((r) => r[0]?.count ?? 0)
        .catch(() => 0),

      ctx.db
        .select({
          role: ctx.schema.user.role,
          count: count(),
        })
        .from(ctx.schema.user)
        .groupBy(ctx.schema.user.role)
        .orderBy(desc(count()))
        .catch(() => []),

      ctx.db
        .select({ count: count() })
        .from(ctx.schema.user)
        .where(eq(ctx.schema.user.emailVerified, true))
        .then((r) => r[0]?.count ?? 0)
        .catch(() => 0),

      ctx.db
        .select({ count: count() })
        .from(ctx.schema.user)
        .where(eq(ctx.schema.user.banned, true))
        .then((r) => r[0]?.count ?? 0)
        .catch(() => 0),

      ctx.db
        .select({
          date: sql<string>`DATE(${ctx.schema.session.createdAt})`,
          count: count(),
        })
        .from(ctx.schema.session)
        .where(gte(ctx.schema.session.createdAt, thirtyDaysAgo))
        .groupBy(sql`DATE(${ctx.schema.session.createdAt})`)
        .orderBy(sql`DATE(${ctx.schema.session.createdAt})`)
        .catch(() => []),

      ctx.db
        .select({
          date: sql<string>`DATE(${ctx.schema.user.createdAt})`,
          count: count(),
        })
        .from(ctx.schema.user)
        .groupBy(sql`DATE(${ctx.schema.user.createdAt})`)
        .orderBy(sql`DATE(${ctx.schema.user.createdAt})`)
        .catch(() => []),

      ctx.db
        .select({ count: count() })
        .from(ctx.schema.user)
        .then((r) => r[0]?.count ?? 0)
        .catch(() => 0),
    ])

    let runningTotal = 0

    const cumulativeGrowth = cumulativeGrowthResult.map((row) => {
      runningTotal += row.count

      return {
        date: row.date,
        count: runningTotal,
      }
    })

    return {
      dailySignups: dailySignupsResult,
      activeUsers: activeUsersResult,
      auditBreakdown: auditBreakdownResult,
      newToday: newTodayResult,
      roleDistribution: roleDistResult,
      verifiedUsers: verifiedResult,
      unverifiedUsers: totalUsersResult - verifiedResult,
      bannedUsers: bannedResult,
      sessionsPerDay: sessionsPerDayResult,
      cumulativeGrowth,
      totalUsers: totalUsersResult,
    }
  } catch {
    return EMPTY_ANALYTICS
  }
}
