import { describe, it, expect, afterEach } from 'vitest'
import { isDemoMode } from '#/utils/demo-mode'

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
