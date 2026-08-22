import { randomBytes, randomUUID } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { and, count, desc, eq, gte, inArray, ne, sql } from 'drizzle-orm'
import { cpus, freemem, hostname, loadavg, totalmem, uptime } from 'node:os'

import { db, schema } from '#/utils/config'
import { corsJson, withCors } from '#/middleware/cors'
import { getServerSession } from '#/utils/session'
import { auth } from '#/utils/auth'
import { requestUrl } from '#/utils/url'
import { assertAdmin } from '#/utils/admin'
import { isUrlPath } from '#/utils/utils'
import { audit } from '#/utils/audit'
import logger from '#/utils/logger'

/**
 * Database-backed rate limiter (per route key). Uses the `rate_limit` table
 * so limits survive restarts and are visible in the Rate Limits admin UI.
 */
async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Upsert: increment count if within window, reset if window expired
    const rows: Array<{ count: number; lastRequest: number } | undefined> = await db
      .select({ count: schema.rateLimit.count, lastRequest: schema.rateLimit.lastRequest })
      .from(schema.rateLimit)
      .where(eq(schema.rateLimit.key, key))
      .limit(1)
    const row = rows[0]

    if (!row || row.lastRequest < windowStart) {
      // Window expired or new key — reset
      await db
        .insert(schema.rateLimit)
        .values({ id: randomUUID(), key, count: 1, lastRequest: now })
        .onConflictDoUpdate({
          target: schema.rateLimit.key,
          set: { count: 1, lastRequest: now },
        })
      return true
    }

    if (row.count >= max) return false

    await db
      .update(schema.rateLimit)
      .set({ count: row.count + 1, lastRequest: now })
      .where(eq(schema.rateLimit.key, key))
    return true
  } catch (error) {
    logger.error('Rate limit DB error, allowing request', error, 'RateLimit')
    return true // Fail open on DB errors
  }
}

/**
 * Custom admin subpaths handled by this route. Anything else under
 * /v1/api/admin/* (e.g. Better Auth's own /admin/list-users, /admin/ban-user)
 * is forwarded to auth.handler so the admin plugin keeps working.
 */
const ADMIN_CUSTOM_PATHS = new Set([
  '/v1/api/admin/stats',
  '/v1/api/admin/accounts',
  '/v1/api/admin/sessions',
  '/v1/api/admin/sessions/revoke',
  '/v1/api/admin/seed-users',
  '/v1/api/admin/audit-logs',
  '/v1/api/admin/analytics',
  '/v1/api/admin/email-verify',
  '/v1/api/admin/bulk-actions',
  '/v1/api/admin/export-users',
  '/v1/api/admin/hardware',
  '/v1/api/admin/disable-2fa',
  '/v1/api/admin/user-activity',
  '/v1/api/admin/email-config',
  '/v1/api/admin/email-config/test',
  '/v1/api/admin/rate-limits',
  '/v1/api/admin/organizations',
  '/v1/api/admin/organizations/members',
  '/v1/api/admin/organizations/delete',
  '/v1/api/admin/oauth-providers',
])

/**
 * Admin-only endpoints that mirror Better Auth Studio's dashboard extras:
 *  - GET /v1/api/admin/stats      -> user counts (total, admins, verified, banned)
 *  - GET /v1/api/admin/accounts   -> linked accounts for a given userId
 *  - POST /v1/api/admin/seed-users -> bulk-create random test users
 *
 * Authorization is enforced here (admin role) in addition to the route-level
 * adminMiddleware used by the /admin page, because these are raw API endpoints
 * any client could call directly.
 */
async function requireAdmin(request: Request) {
  const ses = await getServerSession(request.headers)
  const result = assertAdmin(ses)
  if (!result.ok) {
    return {
      session: null,
      response: corsJson(request, { error: true, message: result.message }, { status: result.status }),
    }
  }
  return { session: result.session, response: null }
}

export const Route = createFileRoute('/api/v1/admin/$')({
  server: {
    handlers: {
      // Handle CORS preflight for our custom admin endpoints. Better Auth's own
      // /admin/* endpoints are forwarded to auth.handler (which answers OPTIONS
      // itself), but our custom paths live in ADMIN_CUSTOM_PATHS and are NOT
      // forwarded, so we must answer the preflight here or cross-origin calls
      // (e.g. from the mobile app) would be blocked by the browser.
      OPTIONS: async ({ request }) => {
        const url = new URL(request.url)
        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }
        return corsJson(request, {}, { status: 204 })
      },
      GET: async ({ request }) => {
        const url = new URL(request.url)
        // Forward Better Auth's own admin endpoints (list-users, ban-user, etc.)
        // to the auth handler; only intercept our custom dashboard endpoints.
        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }

        const { response } = await requireAdmin(request)
        if (response) return response

        const userId = url.searchParams.get('userId')

        if (isUrlPath(url, 'accounts')) {
          if (!userId) {
            return corsJson(
              request,
              { error: true, message: 'userId is required' },
              { status: 400 },
            )
          }
          try {
            const accounts = await db
              .select({
                id: schema.account.id,
                provider: schema.account.providerId,
                accountId: schema.account.accountId,
                createdAt: schema.account.createdAt,
              })
              .from(schema.account)
              .where(eq(schema.account.userId, userId))
              .orderBy(schema.account.createdAt)

            return corsJson(request, { data: accounts }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch accounts', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to fetch accounts' },
              { status: 500 },
            )
          }
        }

        // Global sessions across all users (optionally filtered by userId).
        if (isUrlPath(url, 'sessions')) {
          const userIdFilter = url.searchParams.get('userId')
          try {
            const rows = await db
              .select({
                id: schema.session.id,
                userId: schema.session.userId,
                ipAddress: schema.session.ipAddress,
                userAgent: schema.session.userAgent,
                impersonatedBy: schema.session.impersonatedBy,
                createdAt: schema.session.createdAt,
                expiresAt: schema.session.expiresAt,
              })
              .from(schema.session)
              .where(userIdFilter ? eq(schema.session.userId, userIdFilter) : undefined)
              .orderBy(schema.session.createdAt)

            return corsJson(request, { data: rows }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch sessions', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to fetch sessions' },
              { status: 500 },
            )
          }
        }

        // Audit logs
        if (isUrlPath(url, 'audit-logs')) {
          const page = parseInt(url.searchParams.get('page') || '0')
          const limit = parseInt(url.searchParams.get('limit') || '50')
          const action = url.searchParams.get('action')
          const actorId = url.searchParams.get('actorId')
          const offset = page * limit

          try {
            const whereConditions = []
            if (action) whereConditions.push(eq(schema.auditLog.action, action))
            if (actorId) whereConditions.push(eq(schema.auditLog.actorId, actorId))

            const where = whereConditions.length > 0 ? and(...whereConditions) : undefined

            const [totalResult] = await db
              .select({ total: count() })
              .from(schema.auditLog)
              .where(where)

            const logs = await db
              .select()
              .from(schema.auditLog)
              .where(where)
              .orderBy(desc(schema.auditLog.createdAt))
              .limit(limit)
              .offset(offset)

            return corsJson(
              request,
              { data: logs, total: totalResult.total },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Failed to fetch audit logs', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to fetch audit logs' },
              { status: 500 },
            )
          }
        }

        // Analytics data
        if (isUrlPath(url, 'analytics')) {
          try {
            const now = new Date()
            const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

            // Run all queries in parallel with individual error handling
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
              db
                .select({
                  date: sql<string>`DATE(${schema.user.createdAt})`,
                  count: count(),
                })
                .from(schema.user)
                .where(gte(schema.user.createdAt, thirtyDaysAgo))
                .groupBy(sql`DATE(${schema.user.createdAt})`)
                .orderBy(sql`DATE(${schema.user.createdAt})`)
                .catch(() => []),
              db
                .select({ count: count() })
                .from(schema.session)
                .where(gte(schema.session.createdAt, sevenDaysAgo))
                .then((r: Array<{ count: number }>) => r[0]?.count ?? 0)
                .catch(() => 0),
              db
                .select({
                  action: schema.auditLog.action,
                  count: count(),
                })
                .from(schema.auditLog)
                .groupBy(schema.auditLog.action)
                .orderBy(desc(count()))
                .catch(() => []),
              db
                .select({ count: count() })
                .from(schema.user)
                .where(gte(schema.user.createdAt, yesterday))
                .then((r: Array<{ count: number }>) => r[0]?.count ?? 0)
                .catch(() => 0),
              // Role distribution
              db
                .select({
                  role: schema.user.role,
                  count: count(),
                })
                .from(schema.user)
                .groupBy(schema.user.role)
                .orderBy(desc(count()))
                .catch(() => []),
              // Email verified vs unverified
              db
                .select({ count: count() })
                .from(schema.user)
                .where(eq(schema.user.emailVerified, true))
                .then((r: Array<{ count: number }>) => r[0]?.count ?? 0)
                .catch(() => 0),
              // Banned count
              db
                .select({ count: count() })
                .from(schema.user)
                .where(eq(schema.user.banned, true))
                .then((r: Array<{ count: number }>) => r[0]?.count ?? 0)
                .catch(() => 0),
              // Sessions created per day (last 30 days)
              db
                .select({
                  date: sql<string>`DATE(${schema.session.createdAt})`,
                  count: count(),
                })
                .from(schema.session)
                .where(gte(schema.session.createdAt, thirtyDaysAgo))
                .groupBy(sql`DATE(${schema.session.createdAt})`)
                .orderBy(sql`DATE(${schema.session.createdAt})`)
                .catch(() => []),
              // Cumulative user growth (running total)
              db
                .select({
                  date: sql<string>`DATE(${schema.user.createdAt})`,
                  count: count(),
                })
                .from(schema.user)
                .groupBy(sql`DATE(${schema.user.createdAt})`)
                .orderBy(sql`DATE(${schema.user.createdAt})`)
                .catch(() => []),
              // Total users count
              db
                .select({ count: count() })
                .from(schema.user)
                .then((r: Array<{ count: number }>) => r[0]?.count ?? 0)
                .catch(() => 0),
            ])

            // Compute cumulative growth
            let runningTotal = 0
            const cumulativeGrowth = cumulativeGrowthResult.map(
              (row: { date: string; count: number }) => {
                runningTotal += row.count
                return { date: row.date, count: runningTotal }
              },
            )

            // Compute total unverified
            const totalVerified = verifiedResult
            const totalUnverified = totalUsersResult - totalVerified

            return corsJson(
              request,
              {
                dailySignups: dailySignupsResult,
                activeUsers: activeUsersResult,
                auditBreakdown: auditBreakdownResult,
                newToday: newTodayResult,
                roleDistribution: roleDistResult,
                verifiedUsers: totalVerified,
                unverifiedUsers: totalUnverified,
                bannedUsers: bannedResult,
                sessionsPerDay: sessionsPerDayResult,
                cumulativeGrowth,
                totalUsers: totalUsersResult,
              },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Analytics query failed', error, 'Admin')
            // Return partial data on failure
            return corsJson(
              request,
              {
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
              },
              { status: 200 },
            )
          }
        }

        // Export users as CSV
        // Get email config
        if (isUrlPath(url, 'email-config')) {
          try {
            const config = await db.select().from(schema.emailConfig).limit(1)
            return corsJson(request, { data: config[0] || null }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch email config', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch email config' }, { status: 500 })
          }
        }

        // Get user activity timeline
        if (isUrlPath(url, 'user-activity')) {
          const activityUserId = url.searchParams.get('userId')
          if (!activityUserId) {
            return corsJson(request, { error: true, message: 'userId is required' }, { status: 400 })
          }
          try {
            const logs = await db
              .select()
              .from(schema.auditLog)
              .where(eq(schema.auditLog.targetId, activityUserId))
              .orderBy(desc(schema.auditLog.createdAt))
              .limit(100)
            return corsJson(request, { data: logs }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch user activity', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch activity' }, { status: 500 })
          }
        }

        // Rate limits - view current rate limit state
        if (isUrlPath(url, 'rate-limits')) {
          try {
            const entries = await db
              .select()
              .from(schema.rateLimit)
              .orderBy(desc(schema.rateLimit.lastRequest))
              .limit(200)
            return corsJson(request, { data: entries }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch rate limits', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch rate limits' }, { status: 500 })
          }
        }

        // Organizations — list all orgs with member counts.
        if (isUrlPath(url, 'organizations') && !isUrlPath(url, 'organizations/members')) {
          try {
            const orgs = await db
              .select({
                id: schema.organization.id,
                name: schema.organization.name,
                slug: schema.organization.slug,
                logo: schema.organization.logo,
                createdAt: schema.organization.createdAt,
                updatedAt: schema.organization.updatedAt,
              })
              .from(schema.organization)
              .orderBy(desc(schema.organization.createdAt))

            const memberCounts = await db
              .select({
                organizationId: schema.member.organizationId,
                count: count(),
              })
              .from(schema.member)
              .groupBy(schema.member.organizationId)

            const countMap = new Map(
              memberCounts.map((row: { organizationId: string; count: number }) => [
                row.organizationId,
                row.count,
              ]),
            )

            return corsJson(
              request,
              {
                data: orgs.map(
                  (org: {
                    id: string
                    name: string
                    slug: string
                    logo: string | null
                    createdAt: Date
                    updatedAt: Date
                  }) => ({
                    ...org,
                    memberCount: countMap.get(org.id) ?? 0,
                  }),
                ),
              },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Failed to fetch organizations', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch organizations' }, { status: 500 })
          }
        }

        // Organizations — members of a single org (?orgId=...).
        if (isUrlPath(url, 'organizations/members')) {
          const orgId = url.searchParams.get('orgId')
          if (!orgId) {
            return corsJson(request, { error: true, message: 'orgId is required' }, { status: 400 })
          }
          try {
            const members = await db
              .select({
                id: schema.member.id,
                role: schema.member.role,
                createdAt: schema.member.createdAt,
                userId: schema.member.userId,
                name: schema.user.name,
                email: schema.user.email,
                image: schema.user.image,
              })
              .from(schema.member)
              .innerJoin(schema.user, eq(schema.member.userId, schema.user.id))
              .where(eq(schema.member.organizationId, orgId))
              .orderBy(schema.member.createdAt)

            return corsJson(request, { data: members }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch organization members', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch members' }, { status: 500 })
          }
        }

        // OAuth providers — linked-account stats + recent links.
        if (isUrlPath(url, 'oauth-providers')) {
          try {
            const providerStats = await db
              .select({
                provider: schema.account.providerId,
                count: count(),
              })
              .from(schema.account)
              .groupBy(schema.account.providerId)
              .orderBy(desc(count()))

            const linked = await db
              .select({
                id: schema.account.id,
                provider: schema.account.providerId,
                accountId: schema.account.accountId,
                userId: schema.account.userId,
                createdAt: schema.account.createdAt,
                email: schema.user.email,
                name: schema.user.name,
              })
              .from(schema.account)
              .innerJoin(schema.user, eq(schema.account.userId, schema.user.id))
              .where(ne(schema.account.providerId, 'credential'))
              .orderBy(desc(schema.account.createdAt))
              .limit(100)

            return corsJson(
              request,
              {
                providerStats,
                linkedAccounts: linked,
                totalLinked: providerStats
                  .filter((p: { provider: string }) => p.provider !== 'credential')
                  .reduce((sum: number, p: { count: number }) => sum + p.count, 0),
              },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Failed to fetch OAuth providers', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch OAuth providers' }, { status: 500 })
          }
        }

        // Hardware / system status
        if (isUrlPath(url, 'hardware')) {
          try {
            const memTotal = totalmem()
            const memFree = freemem()
            const memUsed = memTotal - memFree
            const cpuInfo = cpus()
            const avgLoad = loadavg()
            const upTime = uptime()

            // Get disk info from root filesystem
            let diskTotal = 0
            let diskFree = 0
            try {
              const { execSync } = await import('node:child_process')
              const df = execSync('df -k / | tail -1', { encoding: 'utf8' })
              const parts = df.trim().split(/\s+/)
              diskTotal = parseInt(parts[1], 10) * 1024 || 0
              diskFree = parseInt(parts[3], 10) * 1024 || 0
            } catch {
              // df might not be available
            }

            const days = Math.floor(upTime / 86400)
            const hours = Math.floor((upTime % 86400) / 3600)
            const minutes = Math.floor((upTime % 3600) / 60)

            return corsJson(
              request,
              {
                hostname: hostname(),
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
                uptime: { days, hours, minutes, seconds: Math.floor(upTime % 60) },
                cpu: {
                  model: cpuInfo[0]?.model || 'N/A',
                  cores: cpuInfo.length,
                  loadAvg: {
                    '1m': avgLoad[0],
                    '5m': avgLoad[1],
                    '15m': avgLoad[2],
                  },
                  loadPercent: Math.min(Math.round((avgLoad[0] / cpuInfo.length) * 100), 100),
                },
                memory: {
                  total: memTotal,
                  used: memUsed,
                  free: memFree,
                  percent: Math.round((memUsed / memTotal) * 100),
                },
                disk: {
                  total: diskTotal,
                  free: diskFree,
                  used: diskTotal - diskFree,
                  percent: diskTotal > 0 ? Math.round(((diskTotal - diskFree) / diskTotal) * 100) : 0,
                },
              },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Failed to fetch hardware status', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to fetch hardware status' },
              { status: 500 },
            )
          }
        }

        if (isUrlPath(url, 'export-users')) {
          try {
            const users = await db
              .select({
                id: schema.user.id,
                name: schema.user.name,
                email: schema.user.email,
                role: schema.user.role,
                emailVerified: schema.user.emailVerified,
                banned: schema.user.banned,
                banReason: schema.user.banReason,
                lastSeenAt: schema.user.lastSeenAt,
                createdAt: schema.user.createdAt,
              })
              .from(schema.user)
              .orderBy(schema.user.createdAt)

            const csvHeader = 'ID,Name,Email,Role,Email Verified,Banned,Ban Reason,Last Seen,Created At'
            const csvRows = users.map(
              (u: {
                id: string
                name: string | null
                email: string
                role: string | null
                emailVerified: boolean
                banned: boolean
                banReason: string | null
                lastSeenAt: Date | null
                createdAt: Date
              }) =>
                [
                  u.id,
                  `"${(u.name || '').replace(/"/g, '""')}"`,
                  u.email,
                  u.role,
                  u.emailVerified ? 'Yes' : 'No',
                  u.banned ? 'Yes' : 'No',
                  `"${(u.banReason || '').replace(/"/g, '""')}"`,
                  u.lastSeenAt ? new Date(u.lastSeenAt).toISOString() : '',
                  new Date(u.createdAt).toISOString(),
                ].join(','),
            )
            const csv = [csvHeader, ...csvRows].join('\n')

            return new Response(csv, {
              status: 200,
              headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': 'attachment; filename="users-export.csv"',
                'Access-Control-Allow-Origin': '*',
              },
            })
          } catch (error) {
            logger.error('Failed to export users', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to export users' },
              { status: 500 },
            )
          }
        }

        // Default: stats — single round-trip using conditional aggregation
        // instead of five separate count() queries.
        try {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000)
          const [row] = await db
            .select({
              total: count(),
              admins: count(sql`CASE WHEN ${schema.user.role} = 'admin' THEN 1 END`),
              verified: count(sql`CASE WHEN ${schema.user.emailVerified} = true THEN 1 END`),
              banned: count(sql`CASE WHEN ${schema.user.banned} = true THEN 1 END`),
              recentUsers: count(sql`CASE WHEN ${schema.user.createdAt} >= ${since.toISOString()} THEN 1 END`),
            })
            .from(schema.user)

          return corsJson(
            request,
            {
              total: row.total,
              admins: row.admins,
              verified: row.verified,
              banned: row.banned,
              recentUsers: row.recentUsers,
            },
            { status: 200 },
          )
        } catch (error) {
          logger.error('Failed to fetch stats', error, 'Admin')
          return corsJson(
            request,
            { error: true, message: 'Failed to fetch stats' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        const url = new URL(request.url)
        // Forward Better Auth's own admin endpoints to the auth handler.
        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }

        const { response, session: adminSession } = await requireAdmin(request)
        if (response) return response

        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>

        // Toggle email verification
        if (isUrlPath(url, 'email-verify')) {
          const userId = body.userId as string | undefined
          const verified = body.verified as boolean | undefined
          if (!userId) {
            return corsJson(request, { error: true, message: 'userId is required' }, { status: 400 })
          }
          try {
            await db.update(schema.user).set({ emailVerified: verified ?? true }).where(eq(schema.user.id, userId))
            await audit({
              actorId: adminSession.session.userId,
              action: verified ? 'user.email-verify' : 'user.email-unverify',
              targetId: userId,
              request,
            })
            return corsJson(request, { success: true }, { status: 200 })
          } catch (error) {
            logger.error('Failed to update email verification', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to update email verification' }, { status: 500 })
          }
        }

        // Bulk actions (ban, unban, delete, setRole)
        if (isUrlPath(url, 'bulk-actions')) {
          const userIds = body.userIds as string[] | undefined
          const action = body.action as string | undefined
          if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return corsJson(request, { error: true, message: 'userIds array is required' }, { status: 400 })
          }
          if (!action || !['ban', 'unban', 'delete', 'makeAdmin', 'removeAdmin'].includes(action)) {
            return corsJson(request, { error: true, message: 'Invalid action' }, { status: 400 })
          }

          try {
            for (const userId of userIds) {
              if (action === 'ban') {
                await auth.api.banUser({ headers: request.headers, body: { userId } })
              } else if (action === 'unban') {
                await auth.api.unbanUser({ headers: request.headers, body: { userId } })
              } else if (action === 'delete') {
                await auth.api.removeUser({ headers: request.headers, body: { userId } })
              } else if (action === 'makeAdmin') {
                await auth.api.setRole({ headers: request.headers, body: { userId, role: 'admin' } })
              } else if (action === 'removeAdmin') {
                await auth.api.setRole({ headers: request.headers, body: { userId, role: 'user' } })
              }
            }
            await audit({
              actorId: adminSession.session.userId,
              action: `users.bulk-${action}`,
              metadata: { userIds, count: userIds.length },
              request,
            })
            return corsJson(request, { success: true, count: userIds.length }, { status: 200 })
          } catch (error) {
            logger.error('Bulk action failed', error, 'Admin')
            return corsJson(request, { error: true, message: 'Bulk action failed' }, { status: 500 })
          }
        }

        // Disable 2FA for a user
        if (isUrlPath(url, 'disable-2fa')) {
          const userId = body.userId as string | undefined
          if (!userId) {
            return corsJson(request, { error: true, message: 'userId is required' }, { status: 400 })
          }
          try {
            await db.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, userId))
            await db.update(schema.user).set({ twoFactorEnabled: false }).where(eq(schema.user.id, userId))
            await audit({
              actorId: adminSession.session.userId,
              action: 'user.disable-2fa',
              targetId: userId,
              request,
            })
            return corsJson(request, { success: true }, { status: 200 })
          } catch (error) {
            logger.error('Failed to disable 2FA', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to disable 2FA' }, { status: 500 })
          }
        }

        // Get user activity timeline
        if (isUrlPath(url, 'user-activity')) {
          const userId = body.userId as string | undefined
          if (!userId) {
            return corsJson(request, { error: true, message: 'userId is required' }, { status: 400 })
          }
          try {
            const logs = await db
              .select()
              .from(schema.auditLog)
              .where(eq(schema.auditLog.targetId, userId))
              .orderBy(desc(schema.auditLog.createdAt))
              .limit(100)
            return corsJson(request, { data: logs }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch user activity', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to fetch activity' }, { status: 500 })
          }
        }

        // Email config - send test email
        if (isUrlPath(url, 'email-config/test')) {
          try {
            const { sendTestEmail } = await import('#/utils/email')
            const to = (body.to as string) || ''
            if (!to) {
              return corsJson(request, { error: true, message: 'Recipient email is required' }, { status: 400 })
            }
            const result = await sendTestEmail(to)
            if (result.success) {
              return corsJson(request, { success: true }, { status: 200 })
            }
            return corsJson(request, { success: false, error: result.error }, { status: 400 })
          } catch (error) {
            logger.error('Failed to send test email', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to send test email' }, { status: 500 })
          }
        }

        // Email config - save SMTP settings
        if (isUrlPath(url, 'email-config')) {
          const config = body as {
            provider?: string
            smtpHost?: string
            smtpPort?: number
            smtpUser?: string
            smtpPass?: string
            fromEmail?: string
            fromName?: string
          }
          try {
            const existing = await db.select().from(schema.emailConfig).limit(1)
            if (existing.length > 0) {
              await db.update(schema.emailConfig).set(config).where(eq(schema.emailConfig.id, existing[0].id))
            } else {
              await db.insert(schema.emailConfig).values(config)
            }
            return corsJson(request, { success: true }, { status: 200 })
          } catch (error) {
            logger.error('Failed to fetch email config', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to save email config' }, { status: 500 })
          }
        }

        // Rate limits - clear all rate limit entries
        if (isUrlPath(url, 'rate-limits')) {
          const action = body.action as string | undefined
          if (action === 'clear') {
            try {
              await db.delete(schema.rateLimit)
              await audit({
                actorId: adminSession.session.userId,
                action: 'rate-limits.clear',
                request,
              })
              return corsJson(request, { success: true }, { status: 200 })
            } catch (error) {
              logger.error('Failed to clear rate limits', error, 'Admin')
              return corsJson(request, { error: true, message: 'Failed to clear rate limits' }, { status: 500 })
            }
          }
          return corsJson(request, { error: true, message: 'Invalid action' }, { status: 400 })
        }

        // Organizations - delete an org (admin action). Members, invitations
        // and teams are removed first in FK dependency order so the delete
        // works regardless of cascade enforcement on either driver.
        if (isUrlPath(url, 'organizations/delete')) {
          const orgId = body.orgId as string | undefined
          if (!orgId) {
            return corsJson(request, { error: true, message: 'orgId is required' }, { status: 400 })
          }
          try {
            const [org] = await db
              .select({ id: schema.organization.id, name: schema.organization.name })
              .from(schema.organization)
              .where(eq(schema.organization.id, orgId))
              .limit(1)
            if (!org) {
              return corsJson(request, { error: true, message: 'Organization not found' }, { status: 404 })
            }

            const teamIds = await db
              .select({ id: schema.team.id })
              .from(schema.team)
              .where(eq(schema.team.organizationId, orgId))
            const teamIdList = teamIds.map((t: { id: string }) => t.id)

            if (teamIdList.length > 0) {
              await db
                .delete(schema.teamMember)
                .where(inArray(schema.teamMember.teamId, teamIdList))
            }
            await db.delete(schema.team).where(eq(schema.team.organizationId, orgId))
            await db.delete(schema.invitation).where(eq(schema.invitation.organizationId, orgId))
            await db.delete(schema.member).where(eq(schema.member.organizationId, orgId))
            await db.delete(schema.organization).where(eq(schema.organization.id, orgId))

            await audit({
              actorId: adminSession.session.userId,
              action: 'organization.delete',
              targetId: orgId,
              metadata: { name: org.name },
              request,
            })
            return corsJson(request, { success: true }, { status: 200 })
          } catch (error) {
            logger.error('Failed to delete organization', error, 'Admin')
            return corsJson(request, { error: true, message: 'Failed to delete organization' }, { status: 500 })
          }
        }

        if (!isUrlPath(url, 'seed-users') && !isUrlPath(url, '/sessions/revoke')) {
          return corsJson(
            request,
            { error: true, message: 'Not found' },
            { status: 404 },
          )
        }

        // Revoke a single session by id (global admin action).
        if (isUrlPath(url, '/sessions/revoke')) {
          if (typeof body.sessionId !== 'string' || body.sessionId.length === 0) {
            return corsJson(
              request,
              { error: true, message: 'sessionId is required' },
              { status: 400 },
            )
          }
          try {
            const [target] = await db
              .select({ token: schema.session.token, userId: schema.session.userId })
              .from(schema.session)
              .where(eq(schema.session.id, body.sessionId))
              .limit(1)
            if (!target.token) {
              return corsJson(
                request,
                { error: true, message: 'Session not found' },
                { status: 404 },
              )
            }
            await auth.api.revokeSession({
              headers: request.headers,
              body: { token: target.token },
            })
            await audit({
              actorId: adminSession.session.userId,
              action: 'session.revoke',
              targetId: target.userId,
              metadata: { sessionId: body.sessionId },
              request,
            })
            return corsJson(request, { success: true }, { status: 200 })
          } catch (error) {
            logger.error('Failed to revoke session', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to revoke session' },
              { status: 500 },
            )
          }
        }

        // Bulk seed — rate limited to 5 requests / minute to blunt abuse.
        if (!await rateLimit('seed-users', 5, 60_000)) {
          return corsJson(
            request,
            { error: true, message: 'Too many requests, try again later' },
            { status: 429 },
          )
        }

        const countReq = Number(body.count)
        if (!Number.isFinite(countReq) || countReq <= 0) {
          return corsJson(
            request,
            { error: true, message: 'count must be a positive number' },
            { status: 400 },
          )
        }
        const safeCount = Math.min(Math.max(Math.floor(countReq), 1), 100)

        try {
          const created: Array<{ email: string }> = []
          for (let i = 0; i < safeCount; i++) {
            const suffix = randomBytes(4).toString('hex')
            const email = `seed_${suffix}@example.com`
            const password = randomBytes(8).toString('base64url')
            await auth.api.createUser({
              body: { email, name: `Seed User ${suffix}`, password },
            })
            created.push({ email })
          }
          await audit({
            actorId: adminSession.session.userId,
            action: 'users.seed',
            metadata: { count: created.length },
            request,
          })
          return corsJson(
            request,
            { success: true, count: created.length },
            { status: 200 },
          )
        } catch (error) {
          logger.error('Failed to seed users', error, 'Admin')
          return corsJson(
            request,
            { error: true, message: 'Failed to seed users' },
            { status: 500 },
          )
        }
      },
    },
  },
})
