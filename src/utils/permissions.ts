import type { Permission, Role } from "#/types"
import { ROLE_PERMISSIONS } from "./constants"


/**
 * Central role & permission model for the admin panel.
 *
 * Permissions are granular so the model can grow (e.g. a future "billing" role
 * with only `org:read` + `settings:email`). `admin` implicitly holds every
 * permission; enforcement helpers short-circuit on `admin`.
 */


/** Coerce an arbitrary string (from the DB) into a known role. */
export function normalizeRole(role: string | null | undefined): Role {
  return role === 'admin' ? 'admin' : 'user'
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
