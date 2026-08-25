import { describe, it, expect, afterEach } from 'vitest'
import { canMutate, canMutateAdmin, isDemoMode } from '#/utils/demo-mode'

describe('isDemoMode', () => {
  afterEach(() => {
    delete process.env.DEMO_MODE
    delete process.env.VITE_DEMO_MODE
  })

  it('defaults to demo mode when no env is set (opt-out, not opt-in)', () => {
    delete process.env.DEMO_MODE
    delete process.env.VITE_DEMO_MODE
    expect(isDemoMode()).toBe(true)
  })

  it('returns false when DEMO_MODE=false', () => {
    process.env.DEMO_MODE = 'false'
    expect(isDemoMode()).toBe(false)
  })

  it('returns true when DEMO_MODE=true', () => {
    process.env.DEMO_MODE = 'true'
    expect(isDemoMode()).toBe(true)
  })

  it('treats any value other than "false" as demo mode', () => {
    process.env.DEMO_MODE = '0'
    expect(isDemoMode()).toBe(true)
  })

  it('honours the VITE_DEMO_MODE override', () => {
    process.env.VITE_DEMO_MODE = 'false'
    expect(isDemoMode()).toBe(false)
  })
})

describe('canMutate', () => {
  afterEach(() => {
    delete process.env.DEMO_MODE
    delete process.env.VITE_DEMO_MODE
  })

  it('allows everything when not in demo mode', () => {
    process.env.DEMO_MODE = 'false'
    expect(canMutate('/admin/ban-user')).toBe(true)
    expect(canMutate('/api/v1/admin/bulk-actions')).toBe(true)
  })

  it('blocks Better Auth mutation paths', () => {
    expect(canMutate('/admin/ban-user')).toBe(false)
    expect(canMutate('/change-password')).toBe(false)
    expect(canMutate('/organization/delete')).toBe(false)
  })

  it('allows non-mutating paths (sign-in, reads)', () => {
    expect(canMutate('/sign-in/email')).toBe(true)
    expect(canMutate('/api/v1/admin/list-sessions')).toBe(true)
  })
})

describe('canMutateAdmin', () => {
  afterEach(() => {
    delete process.env.DEMO_MODE
    delete process.env.VITE_DEMO_MODE
  })

  it('allows everything when not in demo mode', () => {
    process.env.DEMO_MODE = 'false'
    expect(canMutateAdmin('/api/v1/admin/seed-users')).toBe(true)
    expect(canMutateAdmin('/api/v1/admin/stats')).toBe(true)
  })

  it('blocks mutating custom admin endpoints', () => {
    expect(canMutateAdmin('/api/v1/admin/seed-users')).toBe(false)
    expect(canMutateAdmin('/api/v1/admin/bulk-actions')).toBe(false)
  })

  it('allows read-only custom admin endpoints', () => {
    expect(canMutateAdmin('/api/v1/admin/user-activity')).toBe(true)
  })
})
