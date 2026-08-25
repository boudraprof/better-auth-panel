import type { NavItem } from '#/types'
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

/**
 * UI-only constants (navigation, theming, page titles). Server-side
 * contracts live next to their consumers:
 *  - audit vocabulary: #/utils/audit-actions
 *  - custom admin paths: #/utils/admin-paths
 *  - demo mode policy: #/utils/demo-mode
 */

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

export const MOBILE_BREAKPOINT = 768

export const PROVIDER_LABELS: Record<string, string> = {
  smtp: 'SMTP',
  sendgrid: 'SendGrid',
  resend: 'Resend',
  mailgun: 'Mailgun',
}
