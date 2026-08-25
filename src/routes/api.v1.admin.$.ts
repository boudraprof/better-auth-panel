import { randomBytes } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { desc, eq, inArray } from 'drizzle-orm'

import { db, schema } from '#/utils/config'
import { corsJson, withCors } from '#/middleware/cors'
import { getServerSession } from '#/utils/session'
import { auth } from '#/utils/auth'
import { requestUrl } from '#/utils/url'
import { assertAdmin } from '#/utils/admin'
import { isUrlPath } from '#/utils/utils'
import { audit } from '#/utils/audit'
import logger from '#/utils/logger'
import { ADMIN_CUSTOM_PATHS } from '#/utils/admin-paths'
import { canMutateAdmin, DEMO_MODE_MESSAGE } from '#/utils/demo-mode'
import {
  handleAdminGet,
  handleAdminPost,
  hasGetHandler,
  hasPostHandler,
  runAdminHandler,
} from '#/server/admin/dispatch'
import { getStats } from '#/server/admin/endpoints/stats'




async function rateLimit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now()
  const windowStart = now - windowMs

  try {
    // Upsert: increment count if within window, reset if window expired
    const rows: Array<{ count: number; lastRequest: number } | undefined> = await db
      .select({
        count: schema.rateLimit.count,
        lastRequest: schema.rateLimit.lastRequest,
      })
      .from(schema.rateLimit)
      .where(eq(schema.rateLimit.key, key))
      .limit(1)

    const row = rows[0]

    if (!row || row.lastRequest < windowStart) {
      // Window expired or new key — reset
      await db
        .insert(schema.rateLimit)
        .values({
          key,
          count: 1,
          lastRequest: now,
        })
        .onConflictDoUpdate({
          target: schema.rateLimit.key,
          set: {
            count: 1,
            lastRequest: now,
          },
        })

      return true
    }

    if (row.count >= max) return false

    await db
      .update(schema.rateLimit)
      .set({
        count: row.count + 1,
        lastRequest: now,
      })
      .where(eq(schema.rateLimit.key, key))

    return true
  } catch (error) {
    logger.error('Rate limit DB error, allowing request', error, 'RateLimit')
    return true // Fail open on DB errors
  }
}

async function requireAdmin(request: Request) {
  const ses = await getServerSession(request.headers)
  const result = assertAdmin(ses)

  if (!result.ok) {
    return {
      session: null,
      response: corsJson(
        request,
        {
          error: true,
          message: result.message,
        },
        {
          status: result.status,
        },
      ),
    }
  }

  return {
    session: result.session,
    response: null,
  }
}

export const Route = createFileRoute('/api/v1/admin/$')({
  server: {
    handlers: {
      OPTIONS: async ({ request }) => {
        const url = new URL(request.url)

        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }

        return corsJson(request, {}, { status: 204 })
      },

      GET: async ({ request }) => {
        const url = new URL(request.url)

        // Forward Better Auth's own admin endpoints
        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }

        const { response } = await requireAdmin(request)

        if (response) return response

        // Migrated endpoints dispatch through the registry first; anything
        // else falls through to the legacy inline branches below.
        if (hasGetHandler(url.pathname)) {
          return handleAdminGet(request)
        }

        /*
         * Global sessions
         */
        /*
         * Audit logs
         */
        /*
         * Analytics
         */
        /*
         * Email config
         */
        /*
         * User activity
         */
        /*
         * Rate limits
         */
        /*
         * Organizations
         */
        /*
         * Organization members
         */

        /*
         * Default: stats
         */
        return runAdminHandler(request, (ctx) => getStats(ctx))
      },

      POST: async ({ request }) => {
        const url = new URL(request.url)

        // Forward Better Auth's own admin endpoints
        if (!ADMIN_CUSTOM_PATHS.has(url.pathname)) {
          return withCors(await auth.handler(requestUrl(request)), request)
        }

        const {
          response,
          session: adminSession,
        } = await requireAdmin(request)

        if (response) return response

        const body = (await request
          .json()
          .catch(() => ({}))) as Record<string, unknown>

        // Demo mode: reject every mutating custom admin endpoint. The only
        // POST endpoint that is read-only (it just queries the audit log) is
        // `user-activity`, which we deliberately allow so the demo stays
        // browseable. Everything else writes to the database.
        if (!canMutateAdmin(url.pathname)) {
          return corsJson(
            request,
            { error: true, message: DEMO_MODE_MESSAGE },
            { status: 403 },
          )
        }

        // Migrated endpoints dispatch through the registry first; anything
        // else falls through to the legacy inline branches below.
        if (hasPostHandler(url.pathname)) {
          return handleAdminPost(request)
        }

        /*
         * Check whether an email is already taken (used by CreateUserDialog)
         */
        if (isUrlPath(url, 'check-email')) {
          const email = body.email as string | undefined

          if (!email) {
            return corsJson(
              request,
              { error: true, message: 'email is required' },
              { status: 400 },
            )
          }

          try {
            const [existing] = await db
              .select({ id: schema.user.id })
              .from(schema.user)
              .where(eq(schema.user.email, email))
              .limit(1)

            return corsJson(
              request,
              { exists: Boolean(existing) },
              { status: 200 },
            )
          } catch (error) {
            logger.error('Failed to check email', error, 'Admin')
            return corsJson(
              request,
              { error: true, message: 'Failed to check email' },
              { status: 500 },
            )
          }
        }

        /*
         * Toggle email verification
         */
        if (isUrlPath(url, 'email-verify')) {
          const userId = body.userId as
            | string
            | undefined

          const verified = body.verified as
            | boolean
            | undefined

          if (!userId) {
            return corsJson(
              request,
              {
                error: true,
                message: 'userId is required',
              },
              { status: 400 },
            )
          }

          try {
            await db
              .update(schema.user)
              .set({
                emailVerified:
                  verified ?? true,
              })
              .where(eq(schema.user.id, userId))

            await audit({
              actorId:
                adminSession.session.userId,
              action: verified
                ? 'user.email-verify'
                : 'user.email-unverify',
              targetId: userId,
              request,
            })

            return corsJson(
              request,
              { success: true },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to update email verification',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message:
                  'Failed to update email verification',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Set user role
         */
        if (isUrlPath(url, 'set-role')) {
          const userId = body.userId as
            | string
            | undefined

          const role = body.role as
            | string
            | undefined

          if (!userId || !role) {
            return corsJson(
              request,
              {
                error: true,
                message:
                  'userId and role are required',
              },
              { status: 400 },
            )
          }

          if (!['user', 'admin'].includes(role)) {
            return corsJson(
              request,
              {
                error: true,
                message: 'Invalid role',
              },
              { status: 400 },
            )
          }

          try {
            await auth.api.setRole({
              headers: request.headers,
              body: {
                userId,
                role: role as
                  | 'user'
                  | 'admin',
              },
            })

            await audit({
              actorId:
                adminSession.session.userId,
              action: 'user.set-role',
              targetId: userId,
              metadata: { role },
              request,
            })

            return corsJson(
              request,
              { success: true },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to set role',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message: 'Failed to set role',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Bulk actions
         */
        if (isUrlPath(url, 'bulk-actions')) {
          const userIds = body.userIds as
            | string[]
            | undefined

          const action = body.action as
            | string
            | undefined

          if (
            !userIds ||
            !Array.isArray(userIds) ||
            userIds.length === 0
          ) {
            return corsJson(
              request,
              {
                error: true,
                message:
                  'userIds array is required',
              },
              { status: 400 },
            )
          }

          if (
            !action ||
            ![
              'ban',
              'unban',
              'delete',
              'makeAdmin',
              'removeAdmin',
            ].includes(action)
          ) {
            return corsJson(
              request,
              {
                error: true,
                message: 'Invalid action',
              },
              { status: 400 },
            )
          }

          try {
            for (const userId of userIds) {
              if (action === 'ban') {
                await auth.api.banUser({
                  headers: request.headers,
                  body: { userId },
                })
              } else if (
                action === 'unban'
              ) {
                await auth.api.unbanUser({
                  headers: request.headers,
                  body: { userId },
                })
              } else if (
                action === 'delete'
              ) {
                await auth.api.removeUser({
                  headers: request.headers,
                  body: { userId },
                })
              } else if (
                action === 'makeAdmin'
              ) {
                await auth.api.setRole({
                  headers: request.headers,
                  body: {
                    userId,
                    role: 'admin',
                  },
                })
              } else if (
                action === 'removeAdmin'
              ) {
                await auth.api.setRole({
                  headers: request.headers,
                  body: {
                    userId,
                    role: 'user',
                  },
                })
              }
            }

            await audit({
              actorId:
                adminSession.session.userId,
              action: `users.bulk-${action}`,
              metadata: {
                userIds,
                count: userIds.length,
              },
              request,
            })

            return corsJson(
              request,
              {
                success: true,
                count: userIds.length,
              },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Bulk action failed',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message: 'Bulk action failed',
              },
              { status: 500 },
            )
          }
        }

        /*
         * User activity
         */
        if (isUrlPath(url, 'user-activity')) {
          const userId = body.userId as
            | string
            | undefined

          if (!userId) {
            return corsJson(
              request,
              {
                error: true,
                message: 'userId is required',
              },
              { status: 400 },
            )
          }

          try {
            const logs = await db
              .select()
              .from(schema.auditLog)
              .where(
                eq(
                  schema.auditLog.targetId,
                  userId,
                ),
              )
              .orderBy(desc(schema.auditLog.createdAt))
              .limit(100)

            return corsJson(
              request,
              { data: logs },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to fetch user activity',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message: 'Failed to fetch activity',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Test email
         */
        if (
          isUrlPath(
            url,
            'email-config/test',
          )
        ) {
          try {
            const {
              sendTestEmail,
            } = await import('#/utils/email')

            const to =
              (body.to as string) || ''

            if (!to) {
              return corsJson(
                request,
                {
                  error: true,
                  message:
                    'Recipient email is required',
                },
                { status: 400 },
              )
            }

            const result =
              await sendTestEmail(to)

            if (result.success) {
              return corsJson(
                request,
                { success: true },
                { status: 200 },
              )
            }

            return corsJson(
              request,
              {
                success: false,
                error: result.error,
              },
              { status: 400 },
            )
          } catch (error) {
            logger.error(
              'Failed to send test email',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message:
                  'Failed to send test email',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Save SMTP settings
         */
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
            const existing = await db
              .select()
              .from(schema.emailConfig)
              .limit(1)

            if (existing.length > 0) {
              await db
                .update(schema.emailConfig)
                .set(config)
                .where(
                  eq(
                    schema.emailConfig.id,
                    existing[0].id,
                  ),
                )
            } else {
              await db
                .insert(schema.emailConfig)
                .values(config)
            }

            return corsJson(
              request,
              { success: true },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to fetch email config',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message:
                  'Failed to save email config',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Clear rate limits
         */
        if (isUrlPath(url, 'rate-limits')) {
          const action = body.action as
            | string
            | undefined

          if (action === 'clear') {
            try {
              await db
                .delete(schema.rateLimit)

              await audit({
                actorId:
                  adminSession.session.userId,
                action:
                  'rate-limits.clear',
                request,
              })

              return corsJson(
                request,
                { success: true },
                { status: 200 },
              )
            } catch (error) {
              logger.error(
                'Failed to clear rate limits',
                error,
                'Admin',
              )

              return corsJson(
                request,
                {
                  error: true,
                  message:
                    'Failed to clear rate limits',
                },
                { status: 500 },
              )
            }
          }

          return corsJson(
            request,
            {
              error: true,
              message: 'Invalid action',
            },
            { status: 400 },
          )
        }

        /*
         * Delete organization
         */
        if (
          isUrlPath(
            url,
            'organizations/delete',
          )
        ) {
          const orgId = body.orgId as
            | string
            | undefined

          if (!orgId) {
            return corsJson(
              request,
              {
                error: true,
                message: 'orgId is required',
              },
              { status: 400 },
            )
          }

          try {
            const [org] = await db
              .select({
                id: schema.organization.id,
                name: schema.organization.name,
              })
              .from(schema.organization)
              .where(
                eq(
                  schema.organization.id,
                  orgId,
                ),
              )
              .limit(1)

            if (!org) {
              return corsJson(
                request,
                {
                  error: true,
                  message:
                    'Organization not found',
                },
                { status: 404 },
              )
            }

            const teamIds = await db
              .select({
                id: schema.team.id,
              })
              .from(schema.team)
              .where(
                eq(
                  schema.team.organizationId,
                  orgId,
                ),
              )

            const teamIdList = teamIds.map(
              (t: { id: string }) => t.id,
            )

            if (teamIdList.length > 0) {
              await db
                .delete(schema.teamMember)
                .where(
                  inArray(
                    schema.teamMember.teamId,
                    teamIdList,
                  ),
                )
            }

            await db
              .delete(schema.team)
              .where(
                eq(
                  schema.team.organizationId,
                  orgId,
                ),
              )

            await db
              .delete(schema.invitation)
              .where(
                eq(
                  schema.invitation.organizationId,
                  orgId,
                ),
              )

            await db
              .delete(schema.member)
              .where(
                eq(
                  schema.member.organizationId,
                  orgId,
                ),
              )

            await db
              .delete(schema.organization)
              .where(
                eq(
                  schema.organization.id,
                  orgId,
                ),
              )

            await audit({
              actorId:
                adminSession.session.userId,
              action:
                'organization.delete',
              targetId: orgId,
              metadata: {
                name: org.name,
              },
              request,
            })

            return corsJson(
              request,
              { success: true },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to delete organization',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message:
                  'Failed to delete organization',
              },
              { status: 500 },
            )
          }
        }

        if (
          !isUrlPath(url, 'seed-users') &&
          !isUrlPath(
            url,
            '/sessions/revoke',
          )
        ) {
          return corsJson(
            request,
            {
              error: true,
              message: 'Not found',
            },
            { status: 404 },
          )
        }

        /*
         * Revoke session
         */
        if (
          isUrlPath(
            url,
            '/sessions/revoke',
          )
        ) {
          if (
            typeof body.sessionId !==
              'string' ||
            body.sessionId.length === 0
          ) {
            return corsJson(
              request,
              {
                error: true,
                message:
                  'sessionId is required',
              },
              { status: 400 },
            )
          }

          try {
            const [target] = await db
              .select({
                token: schema.session.token,
                userId:
                  schema.session.userId,
              })
              .from(schema.session)
              .where(
                eq(
                  schema.session.id,
                  body.sessionId,
                ),
              )
              .limit(1)

            if (!target?.token) {
              return corsJson(
                request,
                {
                  error: true,
                  message:
                    'Session not found',
                },
                { status: 404 },
              )
            }

            await auth.api.revokeSession({
              headers: request.headers,
              body: {
                token: target.token,
              },
            })

            await audit({
              actorId:
                adminSession.session.userId,
              action:
                'session.revoke',
              targetId: target.userId,
              metadata: {
                sessionId: body.sessionId,
              },
              request,
            })

            return corsJson(
              request,
              { success: true },
              { status: 200 },
            )
          } catch (error) {
            logger.error(
              'Failed to revoke session',
              error,
              'Admin',
            )

            return corsJson(
              request,
              {
                error: true,
                message:
                  'Failed to revoke session',
              },
              { status: 500 },
            )
          }
        }

        /*
         * Bulk seed
         */
        if (
          !await rateLimit(
            'seed-users',
            5,
            60_000,
          )
        ) {
          return corsJson(
            request,
            {
              error: true,
              message:
                'Too many requests, try again later',
            },
            { status: 429 },
          )
        }

        const countReq = Number(body.count)

        if (
          !Number.isFinite(countReq) ||
          countReq <= 0
        ) {
          return corsJson(
            request,
            {
              error: true,
              message:
                'count must be a positive number',
            },
            { status: 400 },
          )
        }

        const safeCount = Math.min(
          Math.max(Math.floor(countReq), 1),
          100,
        )

        try {
          const created: Array<{
            email: string
          }> = []

          for (
            let i = 0;
            i < safeCount;
            i++
          ) {
            const suffix =
              randomBytes(4).toString(
                'hex',
              )

            const email = `seed_${suffix}@example.com`

            const password =
              randomBytes(8).toString(
                'base64url',
              )

            await auth.api.createUser({
              body: {
                email,
                name: `Seed User ${suffix}`,
                password,
              },
            })

            created.push({ email })
          }

          await audit({
            actorId:
              adminSession.session.userId,
            action: 'users.seed',
            metadata: {
              count: created.length,
            },
            request,
          })

          return corsJson(
            request,
            {
              success: true,
              count: created.length,
            },
            { status: 200 },
          )
        } catch (error) {
          logger.error(
            'Failed to seed users',
            error,
            'Admin',
          )

          return corsJson(
            request,
            {
              error: true,
              message:
                'Failed to seed users',
            },
            { status: 500 },
          )
        }
      },
    },
  },
})
