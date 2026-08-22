import { describe, it, expect } from 'vitest'
import { assertAdmin } from '#/utils/admin'

const makeSession = (overrides: Record<string, any> = {}) => ({
  user: { id: 'u1', role: 'admin', banned: false, ...overrides.user },
  session: { ...overrides.session },
}) as any

describe('assertAdmin', () => {
  it('allows a valid admin session', () => {
    const result = assertAdmin(makeSession())
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.session.user.role).toBe('admin')
    }
  })

  it('rejects null session (401)', () => {
    const result = assertAdmin(null)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(401)
      expect(result.message).toBe('Unauthorized')
    }
  })

  it('rejects non-admin user (403)', () => {
    const result = assertAdmin(makeSession({ user: { role: 'user' } }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(403)
    }
  })

  it('rejects banned user (403)', () => {
    const result = assertAdmin(makeSession({ user: { role: 'admin', banned: true } }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Account banned')
    }
  })

  it('rejects impersonation session (403)', () => {
    const result = assertAdmin(makeSession({ session: { impersonatedBy: 'other-admin' } }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toBe('Forbidden while impersonating')
    }
  })
})
