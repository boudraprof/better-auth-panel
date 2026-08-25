import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Search } from 'lucide-react'
import { toast } from 'react-toastify'

import {
  Card,
  CardContent,
  CardHeader,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { adminMiddleware } from '#/middleware/admin'
import { listAuditLogs } from '#/utils/admin-api'
import type { AuditEntry } from '#/types'
import { ACTION_COLORS, ACTION_LABELS } from '#/utils/audit-actions'




export const Route = createFileRoute('/audit-log')({
  server: {
    middleware: [adminMiddleware],
  },
  component: AuditLogPage,
})

function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [searchAction, setSearchAction] = useState('')
  const limit = 50

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params: { page: number; limit: number; action?: string } = {
        page,
        limit,
      }
      if (searchAction) params.action = searchAction
      const data = await listAuditLogs<AuditEntry>(params)
      setLogs(data.data)
      setTotal(data.total)
    } catch {
      toast.error('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, searchAction])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Audit Log</h1>
        </div>
        <Badge variant="secondary">{total} entries</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Select value={searchAction} onValueChange={(v) => { setSearchAction(v); setPage(0) }}>
                <SelectTrigger className="pl-9 w-56">
                  <SelectValue placeholder="Filter by action..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All actions</SelectItem>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {searchAction && (
              <Button variant="ghost" size="sm" onClick={() => { setSearchAction(''); setPage(0) }}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {logs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No audit log entries yet</p>
              ) : (
                logs.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={ACTION_COLORS[entry.action] || 'outline'}
                          className="text-xs shrink-0"
                        >
                          {ACTION_LABELS[entry.action] || entry.action}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">
                        <span className="font-medium">{entry.actorEmail || entry.actorId}</span>
                        {entry.targetEmail && (
                          <>
                            {' → '}
                            <span className="font-medium">{entry.targetEmail}</span>
                          </>
                        )}
                      </p>
                      {(entry.ipAddress || entry.userAgent) && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {entry.ipAddress && `IP: ${entry.ipAddress}`}
                          {entry.ipAddress && entry.userAgent && ' · '}
                          {entry.userAgent && `UA: ${entry.userAgent.substring(0, 60)}${entry.userAgent.length > 60 ? '…' : ''}`}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
