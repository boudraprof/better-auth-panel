import { describe, it, expect } from 'vitest'
import { isUrlPath, cn } from '#/utils/utils'

describe('isUrlPath', () => {
  it('matches when path is contained in URL', () => {
    const url = new URL('http://localhost:8000/v1/api/admin/stats')
    expect(isUrlPath(url, 'stats')).toBe(true)
  })

  it('does not match when path is not contained', () => {
    const url = new URL('http://localhost:8000/v1/api/admin/stats')
    expect(isUrlPath(url, 'users')).toBe(false)
  })

  it('matches nested paths', () => {
    const url = new URL('http://localhost:8000/v1/api/admin/sessions/revoke')
    expect(isUrlPath(url, 'sessions/revoke')).toBe(true)
  })
})

describe('cn', () => {
  it('merges class names', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toContain('px-4')
    expect(result).toContain('py-2')
  })

  it('handles conditional classes', () => {
    const conditional: string | false = false
    const result = cn('base', conditional, 'visible')
    expect(result).toContain('base')
    expect(result).toContain('visible')
    expect(result).not.toContain('hidden')
  })
})
