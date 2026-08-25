import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import { useRouterState } from '@tanstack/react-router'



import { corsJson } from '#/middleware/cors'
import { env } from '#/utils/env'






export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function matchPaths() {
  const pathname = useRouterState().location.pathname
  const splited = pathname.split('/')
  return splited.includes('auth') ? false : true
}

export const unauthorized = (request: Request): Response => {
  return corsJson(
    request,
    { error: true, message: 'Unauthorized' },
    { status: 401 },
  )
}

export function isUrlPath(url: URL, path: string): boolean {
  const pathname = url.pathname
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return pathname === normalizedPath || pathname.endsWith(normalizedPath)
}



export function convertToBool(value: string): boolean  {
  const v = value.toLowerCase()
  return v === 'true' ? true : v === 'false' && false 
}




export function isDemoMode(): boolean {
  const runtimeValue =
    typeof process.env.DEMO_MODE  !== 'undefined'
      ? env.DEMO_MODE : env.VITE_DEMO_MODE

  return convertToBool(runtimeValue.toLowerCase())
}