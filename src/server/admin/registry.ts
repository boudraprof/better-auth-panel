import type { AdminEndpoint } from './types'
import { getStats } from './endpoints/stats'
import { listAccounts } from './endpoints/accounts'
import { listSessions } from './endpoints/sessions'
import { listAuditLogs } from './endpoints/audit-logs'
import { getAnalytics } from './endpoints/analytics'
import { getEmailConfig } from './endpoints/email-config'
import { getUserActivity } from './endpoints/user-activity'
import { listRateLimits } from './endpoints/rate-limits'
import { listOrganizations } from './endpoints/organizations'
import { listOrganizationMembers } from './endpoints/organization-members'
import { getHardware } from './endpoints/hardware'
import { exportUsersCsv } from './endpoints/export-users'

/**
 * Registry of custom admin endpoints: full pathname → handlers.
 *
 * This is the single source of truth for what custom endpoints exist and
 * which are migrated. The route dispatches through this map first; any path
 * not present falls through to the legacy inline branches until migration is
 * complete. `ADMIN_CUSTOM_PATHS` (utils/admin-paths.ts) still owns the
 * forward-vs-handle decision and must include every key here.
 */
export const adminEndpoints: Record<string, AdminEndpoint> = {
  '/api/v1/admin/stats': {
    GET: (ctx) => getStats(ctx),
  },
  '/api/v1/admin/accounts': {
    GET: (ctx, { url }) => listAccounts(ctx, url.searchParams.get('userId')),
  },
  '/api/v1/admin/sessions': {
    GET: listSessions,
  },
  '/api/v1/admin/audit-logs': {
    GET: listAuditLogs,
  },
  '/api/v1/admin/analytics': {
    GET: getAnalytics,
  },
  '/api/v1/admin/email-config': {
    GET: getEmailConfig,
  },
  '/api/v1/admin/user-activity': {
    GET: getUserActivity,
  },
  '/api/v1/admin/rate-limits': {
    GET: listRateLimits,
  },
  '/api/v1/admin/organizations': {
    GET: listOrganizations,
  },
  '/api/v1/admin/organizations/members': {
    GET: listOrganizationMembers,
  },
  '/api/v1/admin/hardware': {
    GET: getHardware,
  },
  '/api/v1/admin/export-users': {
    GET: exportUsersCsv,
  },
}
