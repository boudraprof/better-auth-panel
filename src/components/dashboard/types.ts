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
