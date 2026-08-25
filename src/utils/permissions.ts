import type { Role } from "#/types"

/**
 * Role model for the admin panel.
 *
 * Enforcement today is role-based (`assertAdmin`); a permission-scoped layer
 * was removed as speculative — re-grow it (granular permissions, per-role
 * grants) when a second role with restricted access actually ships.
 */

/** Coerce an arbitrary string (from the DB) into a known role. */
export function normalizeRole(role: string | null | undefined): Role {
  return role === 'admin' ? 'admin' : 'user'
}
