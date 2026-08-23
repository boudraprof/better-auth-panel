// The application's display name, used in the document <title> and elsewhere.
// It is configurable per deployment via the VITE_APP_NAME env var so the same
// build can be branded differently without code changes. Falls back to
// "BA admin panel" when unset (e.g. local dev without a .env override).
const configured =
  (typeof import.meta !== 'undefined' &&
    (import.meta.env.VITE_APP_NAME as string | undefined)) ||
  undefined

export const APP_NAME = (configured ?? '').trim() || 'BA admin panel'

const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/analytics': 'Analytics',
  '/audit-log': 'Audit Log',
  '/email-config': 'Email',
  '/organizations': 'Organizations',
  '/profile': 'My Account',
  '/rate-limits': 'Rate Limits',
  '/sys-info': 'Sys Info',
  '/auth/forgotpassword': 'Forgot Password',
  '/auth/reset-password': 'Reset Password',
  '/auth/signin': 'Sign In',
}

// Builds the document title for a page, e.g. "Dashboard · Admin Panel".
// Omit `page` to get just the app name (used for the root/landing route and
// as the base title in the root route's head).
export function documentTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME
}

export function titleForPath(pathname: string): string {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return documentTitle(PAGE_TITLES[normalizedPath])
}
