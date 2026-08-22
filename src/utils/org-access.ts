import { createAccessControl } from 'better-auth/plugins'
import { defaultStatements } from 'better-auth/plugins/organization/access'

/**
 * Custom RBAC for the organization plugin.
 *
 * We extend Better Auth's default organization statements with a `billing`
 * resource so orgs can have a `billing` role that can manage subscriptions and
 * read members but cannot mutate other members or the org itself. The default
 * `admin` / `owner` / `member` roles are reused from the plugin; we only add
 * the extra `billing` role and keep the access-control object (`ac`) so the
 * plugin enforces permissions on its endpoints.
 *
 * The `ac` object is passed to the `organization()` plugin via the `ac` option,
 * and the extra roles are passed via `roles`. See `src/utils/auth.ts`.
 */

// Reuse the plugin's default statements (organization / member / invitation /
// team / ac) and add a `billing` resource with its own actions.
export const statement = {
  ...defaultStatements,
  billing: ['read', 'manage'] as const,
} as const

export const ac = createAccessControl(statement)

// Re-create the built-in roles against our access control so they stay in sync
// with the extended statements. `adminAc`/`ownerAc`/`memberAc` from the plugin
// are typed against the default statements; we rebuild them here to keep a
// single source of truth.
export const owner = ac.newRole({
  organization: ['update', 'delete'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  billing: ['read', 'manage'],
})

export const admin = ac.newRole({
  organization: ['update'],
  member: ['create', 'update', 'delete'],
  invitation: ['create', 'cancel'],
  team: ['create', 'update', 'delete'],
  ac: ['create', 'read', 'update', 'delete'],
  billing: ['read', 'manage'],
})

export const member = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  billing: ['read'],
})

// Custom role: can view the org and manage billing, but cannot touch members,
// invitations or teams. Useful for finance staff in a multi-tenant org.
export const billing = ac.newRole({
  organization: [],
  member: [],
  invitation: [],
  team: [],
  ac: ['read'],
  billing: ['read', 'manage'],
})

export const roles = {
  owner,
  admin,
  member,
  billing,
}
