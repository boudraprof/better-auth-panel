export const DEMO_MODE_MESSAGE =
  'Demo mode: user changes are disabled. You can view data only.'

export function isDemoMode(): boolean {
  const value =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env.VITE_DEMO_MODE as string | undefined)) ||
    process.env.DEMO_MODE ||
    process.env.VITE_DEMO_MODE ||
    'true'

  return value.toLowerCase() !== 'false'
}
