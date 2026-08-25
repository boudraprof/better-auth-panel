import { Ban, Loader2, Shield, Trash2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import type { BulkActionsBarProps } from '#/types'





export function BulkActionsBar({ count, loading, onClear, onAction, canManage = true }:  BulkActionsBarProps) {
  if (!canManage) return null
  return (
    <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-2">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={onClear}>
          Clear
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('ban')} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Ban className="size-3.5" />}
          Ban
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('unban')} disabled={loading}>
          Unban
        </Button>
        <Button size="sm" variant="outline" onClick={() => onAction('makeAdmin')} disabled={loading}>
          <Shield className="size-3.5 mr-1" />
          Make Admin
        </Button>
        <Button size="sm" variant="destructive" onClick={() => onAction('delete')} disabled={loading}>
          <Trash2 className="size-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  )
}
