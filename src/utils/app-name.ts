import { env } from '#/utils/env'
import { PAGE_TITLES } from './constants'


const configured = env.VITE_APP_NAME

export const APP_NAME = (configured ?? '').trim() || 'BA admin panel'

export function documentTitle(page?: string): string {
  return page ? `${page} · ${APP_NAME}` : APP_NAME
}

export function titleForPath(pathname: string): string {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  return documentTitle(PAGE_TITLES[normalizedPath])
}
