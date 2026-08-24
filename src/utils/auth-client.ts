import { createAuthClient } from 'better-auth/react'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { env } from '#/utils/env'

// Use a same-origin baseURL on the client so the browser sends/receives the
// session cookie. An absolute baseURL (e.g. VITE_BETTER_AUTH_BASE_URL=
// http://localhost:3000) makes requests cross-origin when the app is opened via
// the network URL, which prevents the session cookie from being set/sent.
const clientBaseURL =
  typeof window !== 'undefined'
    ? window.location.origin
    : (env.VITE_BETTER_AUTH_BASE_URL || 'http://localhost:3000')

export const authClient = createAuthClient({
  baseURL: clientBaseURL,
  basePath: env.VITE_BETTER_AUTH_BASE_PATH || 'api/v1/auth',
  plugins: [
    adminClient(),
    organizationClient(),
  ],
})

export const {
  signIn,
  signOut,
  signUp,
  useSession,
  updateUser,
  deleteUser,
  changeEmail,
  changePassword,
  admin,
  organization,
} = authClient
