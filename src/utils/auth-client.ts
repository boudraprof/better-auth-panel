import { createAuthClient } from 'better-auth/react'
import { adminClient, organizationClient } from 'better-auth/client/plugins'
import { env } from '#/utils/env'


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
