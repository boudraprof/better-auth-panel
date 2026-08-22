import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Ban, CheckCircle2, Eye, Loader2, Shield, ShieldAlert, ShieldOff } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectItem } from '#/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import type { User } from './types'
import InputError from '#/components/InputError'

type Props = {
  user: User
  selected: boolean
  onToggleSelect: () => void
  onViewDetails: (user: User) => void
  onSetRole: (user: User, role: 'user' | 'support' | 'admin') => void
  onBan: (userId: string, reason?: string, expiresIn?: number) => void
  onUnban: (userId: string) => void
  /** When false, read-only rows hide selection + all mutating controls. */
  canManage?: boolean
}

/**
 * A single row in the users table. The ban dialog owns its own reason/expiry
 * state (per-row, keyed by user id in the list) so a reason typed for one user
 * can never leak into another user's dialog.
 */
export function UserRow({
  user,
  selected,
  onToggleSelect,
  onViewDetails,
  onSetRole,
  onBan,
  onUnban,
  canManage = true,
}: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  const banForm = useForm({
    defaultValues: {
      reason: '',
      expiresIn: '',
    },
    onSubmit: async ({ value }) => {
      const reason = value.reason.trim() || undefined
      const expiresIn = value.expiresIn ? Number(value.expiresIn) : undefined
      await onBan(user.id, reason, expiresIn)
      banForm.reset()
    },
  })

  const handleBan = async () => {
    setBusy(`ban:${user.id}`)
    try {
      await banForm.handleSubmit()
    } finally {
      setBusy(null)
    }
  }

  const handleUnban = async () => {
    setBusy(`unban:${user.id}`)
    try {
      await onUnban(user.id)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {canManage && (
          <input
            type="checkbox"
            className="size-4 rounded border-gray-300 shrink-0"
            checked={selected}
            onChange={onToggleSelect}
          />
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{user.name}</span>
            {user.role === 'admin' ? (
              <Shield className="size-4 text-amber-500 shrink-0" />
            ) : user.role === 'support' ? (
              <ShieldAlert className="size-4 text-blue-500 shrink-0" />
            ) : (
              <ShieldOff className="size-4 text-muted-foreground shrink-0" />
            )}
            {user.banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
            {!user.emailVerified && <Badge variant="outline" className="text-xs">Unverified</Badge>}
          </div>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0 ml-4 flex-wrap">
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onViewDetails(user)}
          title="View details & sessions"
        >
          <Eye className="size-3.5" />
        </Button>
        {canManage && (
          <Select
            className="w-28 h-8 text-xs"
            value={user.role}
            onValueChange={(val) => onSetRole(user, val as 'user' | 'support' | 'admin')}
          >
            <SelectItem value="user">User</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </Select>
        )}
        {canManage ? (
          user.banned ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <CheckCircle2 className="size-3 mr-1" />
                Unban
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Unban {user.name}?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                This will restore the user's access immediately.
              </p>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    disabled={busy === `unban:${user.id}`}
                    onClick={handleUnban}
                  >
                    {busy === `unban:${user.id}` ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Confirm Unban
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : (
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Ban className="size-3 mr-1" />
                Ban
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Ban {user.name}?</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                The user will lose access and all their sessions will be revoked. This can be undone later.
              </p>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault()
                  void handleBan()
                }}
              >
                <banForm.Field
                  name="reason"
                  validators={{
                    onChange: ({ value }) => (value.length > 200 ? 'Reason must be 200 characters or fewer' : undefined),
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor={`banReason-${user.id}`}>Reason (optional)</Label>
                      <Input
                        id={`banReason-${user.id}`}
                        name={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="e.g. spam, abuse"
                      />
                      <InputError field={field} />
                    </div>
                  )}
                </banForm.Field>

                <banForm.Field
                  name="expiresIn"
                  validators={{
                    onChange: ({ value }) => {
                      if (!value) return undefined
                      const num = Number(value)
                      return Number.isFinite(num) && num >= 0 ? undefined : 'Expires in must be 0 or greater'
                    },
                  }}
                >
                  {(field) => (
                    <div className="grid gap-2">
                      <Label htmlFor={`banExpires-${user.id}`}>Expires in (seconds, optional)</Label>
                      <Input
                        id={`banExpires-${user.id}`}
                        name={field.name}
                        type="number"
                        min={0}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        placeholder="Leave empty for permanent"
                      />
                      <InputError field={field} />
                    </div>
                  )}
                </banForm.Field>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={busy === `ban:${user.id}` || banForm.state.isSubmitting}
                    >
                      {busy === `ban:${user.id}` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Confirm Ban
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          )
        ) : null}
      </div>
    </div>
  )
}
