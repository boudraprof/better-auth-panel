/**
 * Central role & permission model for the admin panel.
 *
 * Beyond the binary admin/user the Better Auth admin plugin provides, we
 * introduce a `support` role: a read-only staff member who can inspect users,
 * sessions, orgs, audit logs and analytics but cannot mutate anything.
 *
 * Permissions are granular so the model can grow (e.g. a future "billing" role
 * with only `org:read` + `settings:email`). `admin` implicitly holds every
 * permission; enforcement helpers short-circuit on `admin`.
 */

export type Role = 'admin' | 'support' | 'user'

export type Permission =
  | 'user:read'
  | 'user:write'
  | 'user:ban'
  | 'user:delete'
  | 'user:role'
  | 'user:impersonate'
  | 'session:read'
  | 'session:revoke'
  | 'org:read'
  | 'org:delete'
  | 'audit:read'
  | 'analytics:read'
  | 'settings:email'
  | 'settings:security'
  | 'hardware:read'
  | 'ratelimit:read'
  | 'ratelimit:clear'
  | 'seed:users'

/** Roles an admin can assign to another user from the UI. */
export const ASSIGNABLE_ROLES: readonly Role[] = ['admin', 'support', 'user']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  support: 'Support',
  user: 'User',
}

/** Explicit permission grants per role. `admin` is handled separately. */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [
    'user:read',
    'user:write',
    'user:ban',
    'user:delete',
    'user:role',
    'user:impersonate',
    'session:read',
    'session:revoke',
    'org:read',
    'org:delete',
    'audit:read',
    'analytics:read',
    'settings:email',
    'settings:security',
    'hardware:read',
    'ratelimit:read',
    'ratelimit:clear',
    'seed:users',
  ],
  support: [
    'user:read',
    'session:read',
    'org:read',
    'audit:read',
    'analytics:read',
    'hardware:read',
    'ratelimit:read',
  ],
  user: [],
}

/** Coerce an arbitrary string (from the DB) into a known role. */
export function normalizeRole(role: string | null | undefined): Role {
  return role === 'admin' || role === 'support' ? role : 'user'
}

/** All permissions granted to a role (admin → every permission). */
export function getPermissions(role: string | null | undefined): Permission[] {
  const r = normalizeRole(role)
  if (r === 'admin') return [...ROLE_PERMISSIONS.admin]
  return ROLE_PERMISSIONS[r]
}

/** True if the role holds the given permission (admin always does). */
export function hasPermission(
  role: string | null | undefined,
  permission: Permission,
): boolean {
  const r = normalizeRole(role)
  if (r === 'admin') return true
  return ROLE_PERMISSIONS[r].includes(permission)
}
