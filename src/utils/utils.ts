import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
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
import { useRouterState } from '@tanstack/react-router'
import type { LinkProps } from '@tanstack/react-router'

import { corsJson } from '#/middleware/cors'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function matchPaths() {
  const pathname = useRouterState().location.pathname
  const splited = pathname.split('/')
  return splited.includes('auth') ? false : true
}

export const THEME_COLORS = {
  light: '#f9fafb', // Tailwind gray-50
  dark: '#101828', // Tailwind gray-900
} as const

export type ThemeColor = keyof typeof THEME_COLORS

export const unauthorized = (request: Request): Response => {
  return corsJson(
    request,
    { error: true, message: 'Unauthorized' },
    { status: 401 },
  )
}

export function isUrlPath(url: URL, path: string): boolean {
  const pathname = url.pathname
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return pathname === normalizedPath || pathname.endsWith(normalizedPath)
}

export type NavItem = {
  label: string
  to: string
  icon: typeof Gauge
  activeOptions?: LinkProps['activeOptions']
  roles?: Array<'admin' | 'user'>
}

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
  { label: 'Organizations', to: '/organizations', icon: Users, roles: ['admin', 'user'] },
  { label: 'Hardware', to: '/hardware', icon: Radar, roles: ['admin'] },
  { label: 'Email', to: '/email-config', icon: Mail, roles: ['admin'] },
  { label: 'Rate Limits', to: '/rate-limits', icon: ShieldCheck, roles: ['admin'] },
  { label: 'My Account', to: '/profile', icon: UserCircle, roles: ['admin', 'user'] },
]
