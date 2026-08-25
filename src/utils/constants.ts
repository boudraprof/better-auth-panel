import type { BadgeVariant, LogLevel, NavItem, Permission, Role } from '#/types'
import {
  BarChart3,
  Gauge,
  Mail,
  Radar,
  ScrollText,
  ShieldCheck,
  UserCircle,
  Users,
} from 'lucide-react'








export const NAV_ITEMS: Array<NavItem> = [
  {
    label: 'Dashboard',
    to: '/',
    icon: Gauge,
    activeOptions: { exact: true },
    roles: ['admin'],
  },
  { label: 'Audit Log', to: '/audit-log', icon: ScrollText, roles: ['admin'] },
  { label: 'Analytics', to: '/analytics', icon: BarChart3, roles: ['admin'] },
  {
    label: 'Organizations',
    to: '/organizations',
    icon: Users,
    roles: ['admin', 'user'],
  },
  { label: 'Sys Info', to: '/sys-info', icon: Radar, roles: ['admin'] },
  { label: 'Email', to: '/email-config', icon: Mail, roles: ['admin'] },
  {
    label: 'Rate Limits',
    to: '/rate-limits',
    icon: ShieldCheck,
    roles: ['admin'],
  },
  {
    label: 'My Account',
    to: '/profile',
    icon: UserCircle,
    roles: ['admin', 'user'],
  },
]

export const THEME_COLORS = {
  light: '#f9fafb', // Tailwind gray-50
  dark: '#101828', // Tailwind gray-900
} as const

export const ASSIGNABLE_ROLES: readonly Role[] = ['admin', 'user']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
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
  user: [],
}

export const DEMO_BLOCKED_PATHS = new Set([
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
])

export const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/audit-log': 'Audit Log',
  '/email-config': 'Email',
  '/organizations': 'Organizations',
  '/profile': 'My Account',
  '/rate-limits': 'Rate Limits',
  '/sys-info': 'Sys Info',
  '/auth/forgotpassword': 'Forgot Password',
  '/auth/reset-password': 'Reset Password',
  '/auth/signin': 'Sign In',
}

export const PIE_COLORS = [
  '#4fb8b2',
  '#328f97',
  '#e7b84f',
  '#e74f4f',
  '#6ec89a',
  '#afcdc8',
]

export const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

export const MAX_QUEUE_SIZE = 50

export const MOBILE_BREAKPOINT = 768

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

export const DEMO_MODE_MESSAGE =
  'Demo mode: user changes are disabled. You can view data only.'


export  const PROVIDER_LABELS: Record<string, string> = {
  smtp: 'SMTP',
  sendgrid: 'SendGrid',
  resend: 'Resend',
  mailgun: 'Mailgun',
}


