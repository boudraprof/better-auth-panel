import { describe, expect, it } from 'vitest'
import { ADMIN_ACTIONS, ACTION_LABELS } from '#/utils/audit-actions'

/**
 * Every audit action recorded via ADMIN_ACTIONS must have a display label —
 * a missing entry silently renders as an unlabeled row in the audit log.
 */
describe('audit vocabulary', () => {
  it('labels every action produced by ADMIN_ACTIONS', () => {
    const unlabeled = Object.values(ADMIN_ACTIONS).filter(
      (action) => !(action in ACTION_LABELS),
    )
    expect(unlabeled).toEqual([])
  })

  it('has no duplicate action keys across paths', () => {
    const values = Object.values(ADMIN_ACTIONS)
    expect(new Set(values).size).toBe(values.length)
  })
})
