// The application's display name, used in the document <title> and elsewhere.
// It is configurable per deployment via the VITE_APP_NAME env var so the same
// build can be branded differently without code changes. Falls back to
// "AP Admin Panel" when unset (e.g. local dev without a .env override).
const configured =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_APP_NAME as string | undefined)) ||
  undefined

export const APP_NAME = (configured ?? '').trim() || 'AP Admin Panel'

// Builds the document title for a page, e.g. "Dashboard · Admin Panel".
// Omit `page` to get just the app name (used for the root/landing route and
// as the base title in the root route's head).
export function documentTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME
}
