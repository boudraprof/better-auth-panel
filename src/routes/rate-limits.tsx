import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'react-toastify'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { adminMiddleware } from '#/middleware/admin'
import api from '#/utils/axios'
import { DEMO_MODE_MESSAGE, isDemoMode } from '#/utils/demo-mode'

type RateLimitEntry = {
  id: string
  key: string
  count: number
  lastRequest: number
}

export const Route = createFileRoute('/rate-limits')({
  server: {
    middleware: [adminMiddleware],
  },
  component: RateLimitsPage,
})

function RateLimitsPage() {
  const [entries, setEntries] = useState<RateLimitEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [clearing, setClearing] = useState(false)
  const demoMode = isDemoMode()

  const showDemoModeMessage = () => {
    toast.info(DEMO_MODE_MESSAGE)
  }

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ data?: RateLimitEntry[] }>('/admin/rate-limits')
      setEntries(data.data || [])
    } catch {
      toast.error('Failed to fetch rate limits')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  const handleClear = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setClearing(true)
    try {
      await api.post('/admin/rate-limits', { action: 'clear' })
      toast.success('Rate limits cleared')
      setEntries([])
    } catch {
      toast.error('Failed to clear rate limits')
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Rate Limits</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchEntries} disabled={loading}>
            <RefreshCw className={"size-4 mr-1 " + (loading ? 'animate-spin' : '')} />
            Refresh
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={entries.length === 0}>
                <Trash2 className="size-4 mr-1" />
                Clear All
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Clear all rate limits?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will remove all rate limit entries from the database. Rate limiting will reset for all endpoints.
              </p>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={handleClear} disabled={clearing}>
                    {clearing ? <Loader2 className="size-4 animate-spin" /> : null}
                    Clear All
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Active Rate Limit Entries
            {entries.length > 0 && (
              <Badge variant="secondary" className="text-xs">{entries.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">No rate limit entries</p>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <code className="text-xs font-medium break-all">{entry.key}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {entry.count} request{entry.count !== 1 ? 's' : ''} · Last:{' '}
                      {new Date(entry.lastRequest).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant={entry.count > 50 ? 'destructive' : entry.count > 20 ? 'secondary' : 'outline'}
                    className="ml-3 shrink-0"
                  >
                    {entry.count}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
