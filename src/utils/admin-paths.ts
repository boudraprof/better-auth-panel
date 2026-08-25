/**
 * Custom admin endpoints handled by the catch-all route
 * (src/routes/api.v1.admin.$.ts). Any /api/v1/admin path NOT in this set is
 * forwarded to Better Auth's own handler.
 *
 * Candidate 1's dispatcher registry will derive this from the handler map;
 * until then it must be kept in sync with the route's isUrlPath branches.
 */
export const ADMIN_CUSTOM_PATHS = new Set([
  '/api/v1/admin/stats',
  '/api/v1/admin/accounts',
  '/api/v1/admin/sessions',
  '/api/v1/admin/sessions/revoke',
  '/api/v1/admin/seed-users',
  '/api/v1/admin/audit-logs',
  '/api/v1/admin/analytics',
  '/api/v1/admin/email-verify',
  '/api/v1/admin/set-role',
  '/api/v1/admin/bulk-actions',
  '/api/v1/admin/export-users',
  '/api/v1/admin/hardware',
  '/api/v1/admin/user-activity',
  '/api/v1/admin/email-config',
  '/api/v1/admin/email-config/test',
  '/api/v1/admin/rate-limits',
  '/api/v1/admin/organizations',
  '/api/v1/admin/organizations/members',
  '/api/v1/admin/organizations/delete',
  '/api/v1/admin/check-email',
])
