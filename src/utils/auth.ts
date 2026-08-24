import { dash, sentinel } from '@better-auth/infra'
import { eq } from 'drizzle-orm'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { tanstackStartCookies } from 'better-auth/tanstack-start'
import { createAuthMiddleware } from 'better-auth/api'
import { admin, bearer, openAPI, organization } from 'better-auth/plugins'
import { APIError, betterAuth } from 'better-auth'

import { trustedOrigins } from '#/utils/env'
import { env } from '#/env'
import { db, dbDriver, schema } from '#/utils/config'
import { audit } from '#/utils/audit'
import { DEMO_MODE_MESSAGE, isDemoMode } from '#/utils/demo-mode'
import { sendEmail } from '#/utils/email'
import { ac, roles } from '#/utils/org-access'

// Every Better Auth endpoint that mutates persistent data. In demo mode all
// of these are rejected with a 403 before they touch the database. Reads
// (GET) such as list-users / get-user / list-members are intentionally NOT
// included so the demo stays fully browseable.
const DEMO_BLOCKED_PATHS = new Set([
  // Better Auth admin plugin mutations
  '/admin/ban-user',
  '/admin/create-user',
  '/admin/impersonate-user',
  '/admin/remove-user',
  '/admin/revoke-user-session',
  '/admin/revoke-user-sessions',
  '/admin/set-role',
  '/admin/set-user-password',
  '/admin/stop-impersonating',
  '/admin/unban-user',
  '/admin/update-user',
  // User self-service profile mutations
  '/update-user',
  '/change-email',
  '/change-password',
  '/delete-user',
  '/set-password',
  '/link-account',
  '/unlink-account',
  // Organization plugin mutations
  '/organization/create',
  '/organization/delete',
  '/organization/update',
  '/organization/set-active',
  '/organization/remove-member',
  '/organization/update-member-role',
  '/organization/leave',
  '/organization/invite-member',
  '/organization/cancel-invitation',
  '/organization/accept-invitation',
  '/organization/reject-invitation',
])

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_BASE_URL,
  basePath: env.BETTER_AUTH_BASE_PATH,
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins,
  // Harden cookies for an admin panel: force HTTPS cookies and strict
  // same-site so the session cookie is never sent on cross-site requests.
  advanced: {
    useSecureCookies: true,
    defaultCookieAttributes: {
      sameSite: 'strict',
      httpOnly: true,
      secure: true,
      path: '/',
    },
    // Keep CSRF protection on (default) — never disable for an admin panel.
    disableCSRFCheck: false,
    // Track client IP from common proxy headers. Only honored when the
    // request comes from a trusted proxy (TRUSTED_PROXIES env, comma-
    // separated IPs/CIDRs) so clients cannot spoof their IP. Without a
    // trusted proxy the socket address is used, which is safe by default.
    ipAddress: {
      ipAddressHeaders: ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip'],
      trustedProxies: (env.TRUSTED_PROXIES || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      disableIpTracking: false,
    },
  },
  // Brute-force protection. Persisted to the database so limits survive
  // restarts, with tightened per-endpoint rules on the sensitive auth routes.
  // In dev builds (incl. the Playwright suite, which signs in dozens of times
  // per run) allow a high ceiling; production keeps the strict brute-force
  // limits.
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
  // Log database-level events for security auditing (sessions, email changes).
  // NOTE: these hooks receive `(record, context)` positionally — older
  // better-auth versions passed `({ data })`.
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
          // The after-hook only receives the updated record — the previous
          // email is not passed. Detect an email change from the update body.
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

  // Do NOT redirect on API errors — that would bounce admin API callers to the
  // dashboard and mask the real error. Just let Better Auth return its JSON.
  onAPIError: {
    onError: () => {
      // no-op: preserve the JSON error response from better-auth
    },
  },
  emailAndPassword: {
    // Password reset emails are sent via DB-stored SMTP config.
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
    // Enforce minimum password length for credential accounts.
    minPasswordLength: 8,
    maxPasswordLength: 128,
    // Invalidate all sessions when a user resets their password.
    revokeSessionsOnPasswordReset: true,
  },
  // Email verification: send a verification link on sign-up and auto-sign-in
  // after clicking it. Emails go through the DB-stored SMTP config (same
  // channel as password resets). requireEmailVerification stays off so
  // existing/unverified accounts can still sign in; admins can toggle
  // verification per user from the dashboard.
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
  account: {
    encryptOAuthTokens: true,
    storeStateStrategy: 'cookie',
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    // Cache session in the cookie to cut DB lookups, with a short TTL.
    // Using 'jwe' (encrypted JWT) since the admin panel has elevated privileges.
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5,
      strategy: 'jwe',
    },
  },
  plugins: [
    // Interactive OpenAPI/Swagger docs for every auth endpoint (core + plugins)
    // at `{basePath}/reference` (e.g. api/v1/reference). Uses Scalar.
    openAPI(),
    bearer(),
    organization({
      allowUserToCreateOrganization: true,
      ac,
      roles,
      teams: {
        enabled: true,
      },
      sendInvitationEmail: async ({ email, organization, invitation, inviter }) => {
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
      // New users created by an admin start as regular users.
      defaultRole: 'user',
      // Impersonation sessions last 1 hour (plugin default), but we make it
      // explicit here for clarity.
      impersonationSessionDuration: 60 * 60,
      // Default reason shown when an admin bans a user without specifying one.
      defaultBanReason: 'No reason provided',
    }),
    // Better Auth Infrastructure plugins (dash analytics + sentinel abuse
    // protection). Only enabled when BETTER_AUTH_API_KEY is set — they phone
    // home to better-auth.com and are useless without the Dash API key.
    // Get a key at https://better-auth.com (account → API keys).
    ...(env.BETTER_AUTH_API_KEY
      ? [
          dash(),
          sentinel({
            security: {
              // Block credential-stuffing (many failed logins across accounts).
              credentialStuffing: { enabled: true },
              // Challenge logins that would require impossible travel.
              impossibleTravel: { enabled: true, action: 'challenge' },
              // Flag bots and suspicious IPs (log-only by default).
              botBlocking: true,
              suspiciousIpBlocking: true,
              // Reject sign-ups using known-breached passwords.
              compromisedPassword: { enabled: true },
              // Basic email format/domain sanity on sign-up.
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
    // Track "last seen" on every successful sign-in / session creation,
    // mirroring Better Auth Studio's lastSeenAt behaviour.
    after: createAuthMiddleware(async (ctx) => {
      // Sign-in creates a new session; get-session refreshes an existing one.
      // Either way, stamp lastSeenAt for the active user.
      const userId =
        ctx.context.newSession?.user?.id ?? ctx.context.session?.user?.id
      if (userId) {
        await db
          .update(schema.user)
          .set({ lastSeenAt: new Date() })
          .where(eq(schema.user.id, userId))
      }

      // Audit privileged admin actions handled by the admin plugin. These go
      // through auth.handler (not our custom endpoints), so we log them here.
      const ADMIN_ACTIONS: Record<string, string> = {
        '/admin/ban-user': 'user.ban',
        '/admin/unban-user': 'user.unban',
        '/admin/remove-user': 'user.delete',
        '/admin/set-role': 'user.set-role',
        '/admin/impersonate-user': 'user.impersonate',
        '/admin/stop-impersonating': 'user.stop-impersonating',
        '/admin/set-user-password': 'user.set-password',
        '/admin/create-user': 'user.create',
        '/admin/update-user': 'user.update',
      }
      const action = ADMIN_ACTIONS[ctx.path]
      if (action && ctx.context.session) {
        const body = (ctx.body || ctx.context.body || {}) as Record<string, unknown>
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
