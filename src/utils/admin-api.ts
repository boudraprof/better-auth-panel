import api from '#/utils/axios'
import type { BulkAction } from '#/types'

/**
 * Typed client for the custom admin endpoints (`/api/v1/admin/*`).
 *
 * URLs, params and response envelopes live here and only here — call sites
 * never hand-write axios paths. Better Auth operations keep using
 * `authClient`'s admin plugin; this module covers everything the catch-all
 * route implements itself.
 */

export interface AuditLogsPage<T> {
  data: T[]
  total: number
}

export interface EmailConfigInput {
  provider?: string
  smtpHost?: string
  smtpPort?: number
  smtpUser?: string
  smtpPass?: string
  fromEmail?: string
  fromName?: string
}

export async function setRole(params: {
  userId: string
  role: 'user' | 'admin'
}): Promise<void> {
  await api.post('/admin/set-role', params)
}

export async function bulkAction(params: {
  userIds: string[]
  action: BulkAction
}): Promise<void> {
  await api.post('/admin/bulk-actions', params)
}

export async function exportUsersCsv(): Promise<Blob> {
  const response = await api.get('/admin/export-users', {
    responseType: 'blob',
  })
  return response.data as Blob
}

export async function deleteOrganization(orgId: string): Promise<void> {
  await api.post('/admin/organizations/delete', { orgId })
}

export async function clearRateLimits(): Promise<void> {
  await api.post('/admin/rate-limits', { action: 'clear' })
}

export async function listAuditLogs<T>(params: {
  page: number
  limit: number
  action?: string
}): Promise<AuditLogsPage<T>> {
  const { data } = await api.get<AuditLogsPage<T>>('/admin/audit-logs', {
    params,
  })
  return data
}

export async function saveEmailConfig(config: EmailConfigInput): Promise<void> {
  await api.post('/admin/email-config', config)
}

export async function testEmailConfig(to: string): Promise<{
  success?: boolean
  error?: string
}> {
  const { data } = await api.post<{ success?: boolean; error?: string }>(
    '/admin/email-config/test',
    { to },
  )
  return data
}

export async function verifyEmail(params: {
  userId: string
  verified: boolean
}): Promise<void> {
  await api.post('/admin/email-verify', params)
}

export async function seedUsers(count: number): Promise<void> {
  await api.post('/admin/seed-users', { count })
}

export async function revokeSession(sessionId: string): Promise<void> {
  await api.post('/admin/sessions/revoke', { sessionId })
}

export async function checkEmail(
  email: string,
): Promise<{ exists: boolean }> {
  const { data } = await api.post<{ exists: boolean }>('/admin/check-email', {
    email,
  })
  return data
}

/* ---- Reads ---- */

export async function getStats<T>(): Promise<T> {
  const { data } = await api.get<T>('/admin/stats')
  return data
}

export async function getAnalytics<T>(): Promise<T> {
  const { data } = await api.get<T>('/admin/analytics')
  return data
}

export async function getHardware<T>(): Promise<T> {
  const { data } = await api.get<T>('/admin/hardware')
  return data
}

export async function listSessions<T>(): Promise<{ data: T[] }> {
  const { data } = await api.get<{ data: T[] }>('/admin/sessions')
  return data
}

export async function listAccounts<T>(userId: string): Promise<{ data: T[] }> {
  const { data } = await api.get<{ data: T[] }>('/admin/accounts', {
    params: { userId },
  })
  return data
}

export async function listOrganizations<T>(): Promise<{ data?: T[] }> {
  const { data } = await api.get<{ data?: T[] }>('/admin/organizations')
  return data
}

export async function listOrganizationMembers<T>(
  orgId: string,
): Promise<{ data?: T[] }> {
  const { data } = await api.get<{ data?: T[] }>(
    '/admin/organizations/members',
    { params: { orgId } },
  )
  return data
}

export async function listRateLimits<T>(): Promise<{ data?: T[] }> {
  const { data } = await api.get<{ data?: T[] }>('/admin/rate-limits')
  return data
}

export async function getEmailConfig<T>(): Promise<{ data: T | null }> {
  const { data } = await api.get<{ data: T | null }>('/admin/email-config')
  return data
}

export async function getUserActivity<T>(params: {
  userId: string
}): Promise<{ data: T[] }> {
  const { data } = await api.get<{ data: T[] }>('/admin/user-activity', {
    params,
  })
  return data
}
