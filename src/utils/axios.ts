import axios from 'axios'
import { createIsomorphicFn } from '@tanstack/react-start'
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios'

const api: AxiosInstance = axios.create({
  // Server (SSR in-process calls) needs an absolute URL. On the client we use a
  // RELATIVE baseURL so requests resolve against the current origin — this keeps
  // them same-origin and lets the browser send the `better-auth.session_token`
  // cookie. An absolute baseURL (e.g. VITE_APP_URL=http://localhost:3000) would
  // make requests cross-origin when the app is opened via the network URL
  // (http://192.168.1.130:3000), and the browser would then withhold the cookie,
  // causing better-auth endpoints to return 401.
  baseURL:
    (typeof document !== 'undefined'
      ? ''
      : process.env.APP_URL || '') + '/api/v1',

  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
  // This instance is only ever used for in-process server calls to the app
  // itself (localhost). If the shell exports http_proxy/https_proxy (common on
  // corporate networks), Node would otherwise route these localhost requests
  // through the proxy and time out. Disable the proxy for this instance.
  proxy: false,
})

/**
 * Attaches the auth token for server-side requests.
 *
 * On the server (SSR fetches), axios does not forward browser cookies, so we
 * must inject a bearer token derived from the incoming request headers.
 *
 * On the client, we intentionally do nothing: same-origin requests already
 * carry the `better-auth.session_token` cookie automatically, and attaching
 * a bearer header from the client-side session store is actively harmful —
 * the `bearer` plugin overrides the request cookie with whichever session
 * the token decodes to. If the client store is stale (e.g. the user just
 * switched accounts), a wrong token would poison the cookie, producing 403s.
 */
const setAuthToken = createIsomorphicFn()
  .server(async (config: InternalAxiosRequestConfig) => {
    const { getRequestHeaders } = await import('@tanstack/react-start/server')
    const { auth } = await import('#/utils/auth')
    const headers = getRequestHeaders()
    const session = await auth.api.getSession({ headers })
    if (session?.session.token) {
      config.headers.set('Authorization', `Bearer ${session.session.token}`)
    }
  })
  .client(async (_config: InternalAxiosRequestConfig) => {
    // No bearer on the client: the browser sends the session cookie for
    // same-origin requests, which is authoritative and immune to
    // client-store staleness. See the doc above setAuthToken.
  })

api.interceptors.request.use(async (config) => {
  await setAuthToken(config)
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      if (typeof document !== 'undefined') {
        import('#/utils/auth-client').then(({ authClient }) =>
          authClient.signOut(),
        )
      }
    }
    return Promise.reject(error)
  },
)

export default api
