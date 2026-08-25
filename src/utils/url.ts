import { env } from '#/utils/env'

const BASE_URL = env.BETTER_AUTH_BASE_URL

function ensureAbsoluteUrl(url: string): string {
  if (!url) return BASE_URL
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  return `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`
}

export function requestUrl(request: Request): Request {
  try {
    const absoluteUrl = ensureAbsoluteUrl(request.url)
    return new Request(absoluteUrl, request)
  } catch {
    return request
  }
}
