import type { BadgeVariant } from '#/types'

/**
 * Audit vocabulary: the single place mapping Better Auth paths to audit
 * action keys, and audit action keys to their display labels and colors.
 *
 * Every value in ADMIN_ACTIONS must have a key in ACTION_LABELS — a missing
 * entry silently renders as an unlabeled row in the audit log. The
 * consistency test (src/__tests__/audit-actions.test.ts) guards this.
 */

export const ADMIN_ACTIONS: Record<string, string> = {
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

export const ACTION_LABELS: Record<string, string> = {
  'user.ban': 'Ban User',
  'user.unban': 'Unban User',
  'user.delete': 'Delete User',
  'user.set-role': 'Change Role',
  'user.impersonate': 'Impersonate',
  'user.stop-impersonating': 'Stop Impersonating',
  'user.set-password': 'Set Password',
  'user.create': 'Create User',
  'user.update': 'Update User',
  'user.email-verify': 'Verify Email',
  'user.email-unverify': 'Unverify Email',
  'session.revoke': 'Revoke Session',
  'users.seed': 'Seed Users',
  'users.bulk-ban': 'Bulk Ban',
  'users.bulk-unban': 'Bulk Unban',
  'users.bulk-delete': 'Bulk Delete',
  'users.bulk-makeAdmin': 'Bulk Make Admin',
  'users.bulk-removeAdmin': 'Bulk Remove Admin',
}

export const ACTION_COLORS: Partial<Record<string, BadgeVariant>> = {
  'user.ban': 'destructive',
  'user.delete': 'destructive',
  'user.unban': 'default',
  'user.set-role': 'secondary',
  'user.impersonate': 'secondary',
  'user.set-password': 'secondary',
  'user.create': 'default',
  'user.update': 'secondary',
  'user.email-verify': 'default',
  'user.email-unverify': 'secondary',
}
