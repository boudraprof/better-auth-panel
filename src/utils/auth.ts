import { dash, sentinel } from '@better-auth/infra'
import { eq } from 'drizzle-orm'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { createAuthMiddleware } from 'better-auth/api'
import { admin, bearer, openAPI, organization  } from 'better-auth/plugins'
import { APIError, betterAuth } from 'better-auth'

import { env, getTrustedOrigins } from '#/utils/env'
import { db, dbDriver, schema } from '#/utils/config'
import { audit } from '#/utils/audit'
import { isDemoMode } from '#/utils/utils'
import { sendEmail } from '#/utils/email'
import { ac, roles } from '#/utils/org-access'
import { ADMIN_ACTIONS, DEMO_BLOCKED_PATHS, DEMO_MODE_MESSAGE } from './constants'

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_BASE_URL,
  basePath: env.BETTER_AUTH_BASE_PATH,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: 'strict',
      httpOnly: true,
      secure: true,
      path: '/',
    },
    disableCSRFCheck: false,
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
      trustedProxies: (env.TRUSTED_PROXIES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      disableIpTracking: false,
    },
  },
  rateLimit: {
    enabled: true,
    window: 10,
    max: 100,
    storage: 'database',
    customRules: {
      '/sign-in/email': import.meta.env.DEV
        ? { window: 60, max: 200 }
        : { window: 60, max: 5 },
      '/sign-up/email': import.meta.env.DEV
        ? { window: 60, max: 200 }
        : { window: 60, max: 5 },
      '/request-password-reset': { window: 60, max: 5 },
      '/reset-password': { window: 60, max: 5 },
    },
  },
  user: {
    deleteUser: { enabled: true },
    changeEmail: { enabled: true, updateEmailWithoutVerification: false },
  },
  database: drizzleAdapter(db, {
    provider: dbDriver === 'sqlite' ? 'sqlite' : 'pg',
    schema: {
      user: schema.user,
      account: schema.account,
      session: schema.session,
      verification: schema.verification,
      rateLimit: schema.rateLimit,
      organization: schema.organization,
      member: schema.member,
      invitation: schema.invitation,
      team: schema.team,
      teamMember: schema.teamMember,
    },
  }),
  databaseHooks: {
    session: {
      create: {
        after: async (created: any) => {
          await audit({
            actorId: created?.userId,
            action: 'session.created',
            metadata: { sessionId: created?.id },
          }).catch(() => {})
        },
      },
      delete: {
        before: async (deleted: any) => {
          await audit({
            actorId: deleted?.userId,
            action: 'session.revoked',
            metadata: { sessionId: deleted?.id },
          }).catch(() => {})
        },
      },
    },
    user: {
      update: {
        after: async (updated: any, context: any) => {
          if (context?.body?.email) {
            await audit({
              actorId: updated.id,
              action: 'user.email-changed',
              targetId: updated.id,
              metadata: { newEmail: updated.email },
            }).catch(() => {})
          }
        },
      },
    },
  },
  onAPIError: {
    onError: () => {
      // no-op: preserve the JSON error response from better-auth
    },
  },
  emailAndPassword: {
    sendResetPassword: async ({ user: targetUser, url }) => {
      await sendEmail({
        to: targetUser.email,
        subject: 'Reset your Admin Panel password',
        text: `Click the link to reset your password: ${url}\n\nThis link expires in 1 hour.`,
        html: `<p>Click <a href="${url}">here</a> to reset your password.</p><p>This link expires in 1 hour.</p>`,
      })
    },
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user: targetUser, url }) => {
      await sendEmail({
        to: targetUser.email,
        subject: 'Verify your Admin Panel email',
        text: `Click the link to verify your email address: ${url}\n\nThis link expires in 1 hour.`,
        html: `<p>Click <a href="${url}">here</a> to verify your email address.</p><p>This link expires in 1 hour.</p>`,
      })
    },
  },
  // Encrypt OAuth access/refresh tokens at rest using AES-256-GCM.
  // account: {
  //   encryptOAuthTokens: true,
  //   storeStateStrategy: 'cookie',
  // },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
      strategy: 'jwe',
    },
  },
  plugins: [
    openAPI(),
    bearer(),
    organization({
      allowUserToCreateOrganization: true,
      ac,
      roles,
      teams: {
        enabled: true,
      },
      sendInvitationEmail: async ({
        email,
        organization,
        invitation,
        inviter,
      }) => {
        const baseUrl = env.BETTER_AUTH_URL || env.APP_URL || ''
        const acceptUrl = `${baseUrl}/accept-invitation?id=${invitation.id}`
        const result = await sendEmail({
          to: email,
          subject: `You're invited to ${organization.name}`,
          text: `${inviter.user.name} invited you to join ${organization.name}.\n\nAccept the invitation: ${acceptUrl}\n\nThis invitation expires on ${invitation.expiresAt ? new Date(invitation.expiresAt).toLocaleString() : 'soon'}.`,
          html: `<p><strong>${inviter.user.name}</strong> invited you to join <strong>${organization.name}</strong>.</p><p><a href="${acceptUrl}">Accept the invitation</a></p><p>This invitation ${invitation.expiresAt ? `expires on ${new Date(invitation.expiresAt).toLocaleString()}.` : 'expires soon.'}</p>`,
        })
        if (!result.success) {
          // Don't throw — the invitation record already exists; just log so the
          // admin knows the email didn't go out (e.g. SMTP not configured).
          console.warn(
            `[organization] Invitation email to ${email} failed: ${result.error}`,
          )
        }
      },
    }),
    admin({
      defaultRole: 'user',
      impersonationSessionDuration: 60 * 60,
      defaultBanReason: 'No reason provided',
    }),
    ...(env.BETTER_AUTH_API_KEY
      ? [
          dash(),
          sentinel({
            security: {
              credentialStuffing: { enabled: true },
              impossibleTravel: { enabled: true, action: 'challenge' },
              botBlocking: true,
              suspiciousIpBlocking: true,
              compromisedPassword: { enabled: true },
              emailValidation: { enabled: true, strictness: 'medium' },
            },
          }),
        ]
      : []),

    tanstackStartCookies(),
  ],
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (isDemoMode() && DEMO_BLOCKED_PATHS.has(ctx.path)) {
        throw new APIError('FORBIDDEN', {
          message: DEMO_MODE_MESSAGE,
        })
      }

      if (ctx.path === '/sign-up/email') {
        const requesterRole = ctx.context.session?.user?.role
        const isAdmin = requesterRole === 'admin'
        if (!isAdmin) {
          throw new APIError('FORBIDDEN', {
            message: 'Registration is not allowed',
          })
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      const userId =
        ctx.context.newSession?.user?.id ?? ctx.context.session?.user?.id
      if (userId) {
        await db
          .update(schema.user)
          .set({ lastSeenAt: new Date() })
          .where(eq(schema.user.id, userId))
      }

      const action = ADMIN_ACTIONS[ctx.path]
      if (action && ctx.context.session) {
        const body = (ctx.body || ctx.context.body || {}) as Record<
          string,
          unknown
        >
        await audit({
          actorId: ctx.context.session.session.userId,
          action,
          targetId: body.userId as string | undefined,
          metadata: { body },
          request: ctx.request,
        })
      }
    }),
  },
})
