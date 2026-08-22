import { ShieldCheck } from 'lucide-react'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '#/components/ui/tooltip'
import { useSession } from '#/utils/auth-client'

function formatExpiry(expiresAt?: Date | string | null): string {
  if (!expiresAt) return '—'
  const date = new Date(expiresAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Compact "authenticated as …" indicator for the header. Renders nothing for
 * guests; shows the signed-in user's email with a live session dot and the
 * session expiry in the tooltip.
 */
export default function AuthStatus() {
  const { data: sessionData, isPending } = useSession()
  const user = sessionData?.user

  if (isPending || !user) return null

  const email = user.email
  const name = user.name
  const role = (user as { role?: string | null }).role
  const expiresAt = sessionData.session.expiresAt

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="status"
            aria-label={`Authenticated as ${name || email}`}
            className="flex cursor-default items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs shadow-sm"
          >
            <span className="relative flex size-2" aria-hidden="true">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <ShieldCheck className="size-3.5 text-emerald-500" aria-hidden="true" />
            <span className="hidden max-w-40 truncate font-medium text-foreground sm:inline">
              {name || email}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="w-64 space-y-2 p-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-500" />
            <span className="text-sm font-semibold">Authenticated</span>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium truncate">{email}</span>
            </div>
            {name && name !== email && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium truncate">{name}</span>
              </div>
            )}
            {role && (
              <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Role</span>
                <span className="font-medium">{role}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Session expires</span>
              <span className="font-medium tabular-nums">{formatExpiry(expiresAt)}</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
