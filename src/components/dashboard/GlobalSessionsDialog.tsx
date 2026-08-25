import { useCallback, useEffect, useState } from 'react'
import { Ban, Loader2 } from 'lucide-react'
import { toast } from 'react-toastify'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import api from '#/utils/axios'
import type { GlobalSession, UserAgentInfo } from '#/types'
import { isDemoMode } from '#/utils/utils'
import { DEMO_MODE_MESSAGE } from '#/utils/constants'





function parseUserAgent(ua: string | null | undefined): UserAgentInfo {
  const agent = ua ?? ''
  const mobile = /Mobile|Android|iPhone|iPad|iPod/i.test(agent)

  let os = 'Unknown OS'
  if (/Windows NT/i.test(agent)) os = 'Windows'
  else if (/Mac OS X/i.test(agent)) os = 'macOS'
  else if (/Android/i.test(agent)) os = 'Android'
  else if (/iPhone|iPad|iPod/i.test(agent)) os = 'iOS'
  else if (/Linux/i.test(agent)) os = 'Linux'

  let browser = 'Unknown Browser'
  if (/Edg\//i.test(agent)) browser = 'Edge'
  else if (/OPR\/|Opera/i.test(agent)) browser = 'Opera'
  else if (/Firefox\//i.test(agent)) browser = 'Firefox'
  else if (/Chrome\//i.test(agent)) browser = 'Chrome'
  else if (/Safari\//i.test(agent)) browser = 'Safari'

  return { browser, os, mobile }
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When false (non-admin viewer), session revoke is hidden. */
  canRevoke?: boolean
}

export function GlobalSessionsDialog({ open, onOpenChange, canRevoke = true }: Props) {
  const [sessions, setSessions] = useState<Array<GlobalSession>>([])
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const demoMode = isDemoMode()

  const showDemoModeMessage = () => {
    toast.info(DEMO_MODE_MESSAGE)
  }

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ data: Array<GlobalSession> }>('/admin/sessions')
      setSessions(data.data)
    } catch {
      toast.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }, [])

  // Refresh the session list every time the dialog opens.
  useEffect(() => {
    if (open) void fetchSessions()
  }, [open, fetchSessions])

  const handleRevoke = async (sessionId: string) => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setRevokingId(sessionId)
    try {
      await api.post('/admin/sessions/revoke', { sessionId })
      toast.success('Session revoked')
      void fetchSessions()
    } catch {
      toast.error('Failed to revoke session')
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Active Sessions</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-2 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No active sessions</p>
            ) : (
              sessions.map((s) => {
                const device = parseUserAgent(s.userAgent)
                return (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium">
                      {device.browser}
                      {device.os !== 'Unknown OS' ? ` on ${device.os}` : ''}
                      {device.mobile ? ' (mobile)' : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      IP: {s.ipAddress || '—'} · {s.userId}
                      {s.impersonatedBy ? ` · impersonated by ${s.impersonatedBy}` : ''}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(s.createdAt).toLocaleString()} · Expires {new Date(s.expiresAt).toLocaleString()}
                    </p>
                    <p className="truncate font-mono text-[11px] text-muted-foreground/70">{s.userAgent || 'Unknown device'}</p>
                  </div>
                  {canRevoke && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={revokingId === s.id}
                    onClick={() => handleRevoke(s.id)}
                  >
                    {revokingId === s.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Ban className="size-4" />
                    )}
                    Revoke
                  </Button>
                  )}
                </div>
                )
              })
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
