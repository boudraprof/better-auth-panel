import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ClassValue } from 'clsx'
import { useRouterState } from '@tanstack/react-router'

export function cn(...inputs: Array<ClassValue>) {
  return twMerge(clsx(inputs))
}

export function matchPaths() {
  const pathname = useRouterState().location.pathname
  const splited = pathname.split('/')
  return splited.includes('auth') ? false : true
}

export function isUrlPath(url: URL, path: string): boolean {
  const pathname = url.pathname
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return pathname === normalizedPath || pathname.endsWith(normalizedPath)
}
