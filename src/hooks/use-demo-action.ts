import { useCallback } from 'react'
import { toast } from 'react-toastify'

import {
  DEMO_MODE_MESSAGE,
  isDemoMode,
} from '#/utils/demo-mode'

/**
 * Demo-mode guard for mutating UI actions.
 *
 * Replaces the per-component `showDemoModeMessage` copies: in demo mode,
 * `blocked()` shows the demo toast and returns true so callers can skip the
 * action (and optionally clean up); `run(action)` executes `action` unless
 * demo-blocked.
 *
 * const { blocked, run } = useDemoAction()
 * onClick={() => run(doThing)}
 * onSubmit={async () => { if (blocked()) return; ... }}
 */
export function useDemoAction() {
  const demoMode = isDemoMode()

  const blocked = useCallback((): boolean => {
    if (!demoMode) return false
    toast.info(DEMO_MODE_MESSAGE)
    return true
  }, [demoMode])

  const run = useCallback(
    <T>(action: () => T): T | undefined => {
      if (blocked()) return undefined
      return action()
    },
    [blocked],
  )

  return { demoMode, blocked, run }
}
