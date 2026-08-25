import type { Gauge } from 'lucide-react'
import type { THEME_COLORS } from './utils/constants'
import type { LinkProps } from '@tanstack/react-router'
import type { getServerSession } from './utils/session'

export type ThemeColor = keyof typeof THEME_COLORS

export type NavItem = {
  label: string
  to: string
  icon: typeof Gauge
  activeOptions?: LinkProps['activeOptions']
  roles?: Array<'admin' | 'user'>
}

export type Role = 'admin' | 'user'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface ErrorContext {
  component?: string
  action?: string
  userId?: string
  metadata?: Record<string, unknown>
}

export interface TrackedError {
  message: string
  stack?: string
  context: ErrorContext
  timestamp: number
  url: string
}

export type AuthSession = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>
>

export type AdminCheckResult =
  | { ok: true; session: AuthSession }
  | { ok: false; status: number; message: string }

export type Organization = {
  id: string
  name: string
  slug: string
  logo: string | null
  createdAt: string
  updatedAt: string
  memberCount: number
}

export type OrgMember = {
  id: string
  role: string
  createdAt: string
  userId: string
  name: string | null
  email: string
  image: string | null
}

export type ApiUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: string | null
  emailVerified: boolean
  image?: string | null
  lastSeenAt?: Date | string | null
  createdAt: Date | string
}

export type EmailConfig = {
  id: string
  provider: string
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  fromEmail: string | null
  fromName: string | null
}


export type AuditEntry = {
  id: string
  actorId: string
  actorEmail: string | null
  action: string
  targetId: string | null
  targetEmail: string | null
  metadata: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

export type BadgeVariant = 'default' | 'destructive' | 'secondary' | 'outline'

export type HardwareData = {
  hostname: string
  platform: string
  distro?: string
  release?: string
  kernel?: string
  arch: string
  nodeVersion: string
  uptime: { days: number; hours: number; minutes: number; seconds: number }
  cpu: {
    model: string
    manufacturer?: string
    cores: number
    physicalCores?: number
    speed?: number
    loadPercent: number
    userPercent?: number
    systemPercent?: number
  }
  memory: {
    total: number
    used: number
    free: number
    available?: number
    percent: number
  }
  disk: {
    filesystem?: string
    mount?: string
    total: number
    used: number
    free: number
    percent: number
  } | null
}

export type DailySignup = { date: string; count: number }
export type AuditBreakdown = { action: string; count: number }
export type RoleDist = { role: string; count: number }
export type SessionsPerDay = { date: string; count: number }
export type CumulativeGrowth = { date: string; count: number }

export type AnalyticsData = {
  dailySignups: DailySignup[]
  activeUsers: number
  auditBreakdown: AuditBreakdown[]
  newToday: number
  roleDistribution: RoleDist[]
  verifiedUsers: number
  unverifiedUsers: number
  bannedUsers: number
  sessionsPerDay: SessionsPerDay[]
  cumulativeGrowth: CumulativeGrowth[]
  totalUsers: number
}

export type BulkAction = 'ban' | 'unban' | 'makeAdmin' | 'delete'

export type BulkActionsBarProps = {
  count: number
  loading: boolean
  onClear: () => void
  onAction: (action: BulkAction) => void
  /** When false (non-admin viewer), no bulk actions are exposed. */
  canManage?: boolean
}

export type UserAgentInfo = { browser: string; os: string; mobile: boolean }


export type User = {
  id: string
  name: string
  email: string
  role: string
  banned: boolean | null
  banReason: string | null
  banExpires: string | Date | null
  emailVerified: boolean
  image: string | null
  lastSeenAt: string | Date | null
  createdAt: string | Date
}

export type Session = {
  id: string
  userId: string
  expiresAt: string | Date
  token: string
  createdAt: string | Date
  updatedAt: string | Date
  ipAddress: string | null
  userAgent: string | null
  impersonatedBy?: string
}

export type Account = {
  id: string
  provider: string
  accountId: string
  createdAt: string
}

export type AdminStats = {
  total: number
  admins: number
  verified: number
  banned: number
  recentUsers: number
}

export type GlobalSession = {
  id: string
  userId: string
  ipAddress: string | null
  userAgent: string | null
  impersonatedBy?: string | null
  createdAt: string
  expiresAt: string
}


export type UserRowProps = {
  user: User
  selected: boolean
  onToggleSelect: () => void
  onViewDetails: (user: User) => void
  onSetRole: (user: User, role: 'user' | 'admin') => void
  onBan: (userId: string, reason?: string, expiresIn?: number) => void
  onUnban: (userId: string) => void
  /** When false, read-only rows hide selection + all mutating controls. */
  canManage?: boolean
}


export type ActivityLog = {
  id: string
  action: string
  createdAt: string
  metadata?: string
}

export type UserDetailDialogProps = {
  user: User | null
  onClose: () => void
  onUserDeleted: () => void
  onUserUpdated: (userId: string, patch: Partial<User>) => void
  /** When false (non-admin viewer), all mutating controls are hidden. */
  canManage?: boolean
}