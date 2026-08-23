import { useCallback, useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import z from 'zod'
import {
  Ban,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Lock,
  MailCheck,
  MailX,
  Shield,
  Trash2,
} from 'lucide-react'
import { toast } from 'react-toastify'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import type { Account, Session, User } from './types'
import api from '#/utils/axios'
import { useSession, authClient } from '#/utils/auth-client'
import { DEMO_MODE_MESSAGE, isDemoMode } from '#/utils/demo-mode'
import InputError from '#/components/InputError'

const { admin: adminApi } = authClient

type ActivityLog = {
  id: string
  action: string
  createdAt: string
  metadata?: string
}

type Props = {
  user: User | null
  onClose: () => void
  onUserDeleted: () => void
  onUserUpdated: (userId: string, patch: Partial<User>) => void
  /** When false (non-admin viewer), all mutating controls are hidden. */
  canManage?: boolean
}

export function UserDetailDialog({ user, onClose, onUserDeleted, onUserUpdated, canManage = true }: Props) {
  const { data: sessionData } = useSession()
  const currentUserId = sessionData?.user.id ?? null
  const demoMode = isDemoMode()

  const showDemoModeMessage = () => {
    toast.info(DEMO_MODE_MESSAGE)
  }

  const [sessions, setSessions] = useState<Array<Session>>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [accounts, setAccounts] = useState<Array<Account>>([])
  const [accountsLoading, setAccountsLoading] = useState(false)

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)

  // Tracks which destructive action is currently in flight, so the relevant
  // button is disabled and shows a spinner.
  const [busy, setBusy] = useState<string | null>(null)

  const userId = user?.id ?? null

  // Password dialog
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [settingPassword, setSettingPassword] = useState(false)
  const passwordForm = useForm({
    defaultValues: { newPassword: '' },
    onSubmit: async ({ value }) => {
      if (!user) return
      if (demoMode) {
        showDemoModeMessage()
        return
      }

      const newPassword = value.newPassword
      if (!newPassword.trim()) return
      if (newPassword.length < 8) return

      await adminApi.setUserPassword({
        userId: user.id,
        newPassword,
      })

      toast.success('Password updated')
      setPasswordOpen(false)
      passwordForm.reset()
    },
  })

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const editUserForm = useForm({
    defaultValues: {
      name: '',
      email: '',
    },
    onSubmit: async ({ value }) => {
      if (!user) return
      if (demoMode) {
        showDemoModeMessage()
        return
      }

      const data: Record<string, string> = {}
      if (value.name.trim() && value.name.trim() !== user.name) data.name = value.name.trim()
      if (value.email.trim() && value.email.trim() !== user.email) data.email = value.email.trim()
      if (Object.keys(data).length === 0) {
        setEditOpen(false)
        return
      }

      await adminApi.updateUser({ userId: user.id, data })
      toast.success('User updated')
      setEditOpen(false)
      editUserForm.reset()
      onUserUpdated(user.id, data)
    },
  })
  const [savingEdit, setSavingEdit] = useState(false)

  // The user the dialog is currently showing. Used to ignore stale in-flight
  // responses when the selection changes (or the dialog closes) mid-request.
  const shownUserIdRef = useRef(userId)
  useEffect(() => {
    shownUserIdRef.current = userId
  }, [userId])

  const loadDetails = useCallback(async (id: string) => {
    setSessionsLoading(true)
    setAccountsLoading(true)
    try {
      const [sessionsRes, accountsRes] = await Promise.all([
        adminApi.listUserSessions({ userId: id }).then((r) => r.data?.sessions ?? []),
        api.get<{ data: Array<Account> }>('/admin/accounts', { params: { userId: id } }),
      ])
      if (shownUserIdRef.current !== id) return
      setSessions(
        (sessionsRes ?? []).map(
          (s): Session => ({
            id: s.id,
            userId: s.userId,
            expiresAt: s.expiresAt,
            token: s.token,
            createdAt: s.createdAt,
            updatedAt: s.createdAt,
            ipAddress: s.ipAddress ?? null,
            userAgent: s.userAgent ?? null,
            impersonatedBy: s.impersonatedBy,
          }),
        ),
      )
      setAccounts(accountsRes.data.data)
    } catch {
      if (shownUserIdRef.current === id) toast.error('Failed to fetch user details')
    } finally {
      if (shownUserIdRef.current === id) {
        setSessionsLoading(false)
        setAccountsLoading(false)
      }
    }
  }, [canManage])

  // Load sessions + linked accounts whenever the dialog opens for a user.
  useEffect(() => {
    if (userId) void loadDetails(userId)
  }, [userId, loadDetails])

  // All hooks above must run unconditionally (before any early return) so the
  // hook count stays consistent between renders. The dialog is only shown when
  // a user is selected.
  if (!user) return null

  const handleImpersonate = async () => {
    setBusy(`impersonate:${user.id}`)
    try {
      await adminApi.impersonateUser({ userId: user.id })
      toast.success('Impersonating user. Reloading...')
      window.location.reload()
    } catch {
      toast.error('Failed to impersonate user')
    } finally {
      setBusy(null)
    }
  }

  const handleToggleVerify = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }

    const verified = !user.emailVerified
    try {
      await api.post('/admin/email-verify', { userId: user.id, verified })
      toast.success(verified ? 'Email verified' : 'Email unverified')
      onUserUpdated(user.id, { emailVerified: verified })
    } catch {
      toast.error('Failed to update email verification')
    }
  }

  const handleSetPassword = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }

    setSettingPassword(true)
    try {
      await passwordForm.handleSubmit()
    } finally {
      setSettingPassword(false)
    }
  }

  const handleOpenEdit = () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }

    editUserForm.setFieldValue('name', user.name)
    editUserForm.setFieldValue('email', user.email)
    setEditOpen(true)
  }

  const handleUpdateUser = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }

    setSavingEdit(true)
    try {
      await editUserForm.handleSubmit()
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteUser = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }

    // Never delete yourself.
    if (user.id === currentUserId) {
      toast.error('You cannot delete yourself')
      return
    }
    setBusy(`delete:${user.id}`)
    try {
      await adminApi.removeUser({ userId: user.id })
      toast.success('User deleted')
      onUserDeleted()
    } catch {
      toast.error('Failed to delete user')
    } finally {
      setBusy(null)
    }
  }

  const handleRevokeSession = async (token: string) => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setBusy(`revoke-session:${token}`)
    try {
      await adminApi.revokeUserSession({ sessionToken: token })
      toast.success('Session revoked')
      void loadDetails(user.id)
    } catch {
      toast.error('Failed to revoke session')
    } finally {
      setBusy(null)
    }
  }

  const handleRevokeAllSessions = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setBusy(`revoke-all:${user.id}`)
    try {
      await adminApi.revokeUserSessions({ userId: user.id })
      toast.success('All sessions revoked')
      void loadDetails(user.id)
    } catch {
      toast.error('Failed to revoke sessions')
    } finally {
      setBusy(null)
    }
  }

  const handleViewActivity = async () => {
    setActivityLoading(true)
    setActivityOpen(true)
    try {
      const { data } = await api.get<{ data: ActivityLog[] }>('/admin/user-activity', {
        params: { userId: user.id },
      })
      setActivityLogs(data.data)
    } catch {
      toast.error('Failed to fetch activity')
      setActivityLogs([])
    } finally {
      setActivityLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user.name}
            {user.role === 'admin' && <Shield className="size-4 text-amber-500" />}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Email:</span>
              <p className="font-medium truncate">{user.email}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Role:</span>
              <p className="font-medium">{user.role}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Verified:</span>
              <p className="font-medium">{user.emailVerified ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Banned:</span>
              <p className="font-medium">
                {user.banned ? `Yes${user.banReason ? ` - ${user.banReason}` : ''}` : 'No'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last seen:</span>
              <p className="font-medium">
                {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>

          {canManage && (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleImpersonate}>
              <ExternalLink className="size-3.5 mr-1" />
              Impersonate
            </Button>
            <Button size="sm" variant="outline" onClick={handleToggleVerify}>
              {user.emailVerified ? (
                <MailX className="size-3.5 mr-1" />
              ) : (
                <MailCheck className="size-3.5 mr-1" />
              )}
              {user.emailVerified ? 'Unverify' : 'Verify'} Email
            </Button>
            <Button size="sm" variant="outline" onClick={handleOpenEdit}>
              <CheckCircle2 className="size-3.5 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="outline" onClick={handleViewActivity}>
              <FileText className="size-3.5 mr-1" />
              Activity
            </Button>
            <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => setPasswordOpen(true)}>
                  <Lock className="size-3.5 mr-1" />
                  Set Password
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleSetPassword()
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Set Password for {user.name}</DialogTitle>
                  </DialogHeader>
                  <passwordForm.Field
                    name="newPassword"
                    validators={{
                      onChange: ({ value }) => {
                        if (!value.trim()) return 'Password is required'
                        return value.length < 8 ? 'Password must be at least 8 characters' : undefined
                      },
                    }}
                  >
                    {(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>New Password</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="password"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Min 8 characters"
                        />
                        <InputError field={field} />
                      </div>
                    )}
                  </passwordForm.Field>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={settingPassword || passwordForm.state.isSubmitting}>
                      {settingPassword ? <Loader2 className="size-4 animate-spin" /> : null}
                      Update Password
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
              <DialogContent>
                <form
                  className="space-y-3"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void handleUpdateUser()
                  }}
                >
                  <DialogHeader>
                    <DialogTitle>Edit {user.name}</DialogTitle>
                  </DialogHeader>

                  <editUserForm.Field
                    name="name"
                    validators={{
                      onChange: ({ value }) => (!value.trim() ? 'Name is required' : undefined),
                    }}
                  >
                    {(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Name</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="Full name"
                        />
                        <InputError field={field} />
                      </div>
                    )}
                  </editUserForm.Field>

                  <editUserForm.Field
                    name="email"
                    validators={{
                      onChange: ({ value }) => {
                        try {
                          z.email().parse(value.trim())
                          return undefined
                        } catch {
                          return 'Invalid email'
                        }
                      },
                    }}
                  >
                    {(field) => (
                      <div className="grid gap-2">
                        <Label htmlFor={field.name}>Email</Label>
                        <Input
                          id={field.name}
                          name={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          placeholder="email@example.com"
                        />
                        <InputError field={field} />
                      </div>
                    )}
                  </editUserForm.Field>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit" disabled={savingEdit || editUserForm.state.isSubmitting}>
                      {savingEdit ? <Loader2 className="size-4 animate-spin" /> : null}
                      Save Changes
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="destructive">
                  <Trash2 className="size-3.5 mr-1" />
                  Delete User
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Delete {user.name}?</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This permanently deletes the user, their accounts, and all sessions. This cannot be undone.
                </p>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <DialogClose asChild>
                    <Button
                      variant="destructive"
                      disabled={busy === `delete:${user.id}`}
                      onClick={handleDeleteUser}
                    >
                      {busy === `delete:${user.id}` ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Confirm Delete
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Sessions ({sessions.length})</h4>
              {sessions.length > 0 && canManage && (
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="text-xs">
                      Revoke All
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                      <DialogTitle>Revoke all sessions for {user.name}?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                      The user will be signed out of every device and have to log in again.
                    </p>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <DialogClose asChild>
                        <Button
                          variant="destructive"
                          disabled={busy === `revoke-all:${user.id}`}
                          onClick={handleRevokeAllSessions}
                        >
                          {busy === `revoke-all:${user.id}` ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : null}
                          Confirm Revoke All
                        </Button>
                      </DialogClose>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
            {sessionsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active sessions</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/30 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {session.userAgent || 'Unknown device'}
                        {session.impersonatedBy && (
                          <Badge variant="outline" className="ml-1 text-[10px]">Impersonated</Badge>
                        )}
                      </p>
                      <p className="text-muted-foreground">
                        IP: {session.ipAddress || 'N/A'} &middot; Expires:{' '}
                        {new Date(session.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        {canManage && (
                          <Button size="sm" variant="ghost" className="shrink-0">
                            <Ban className="size-3" />
                          </Button>
                        )}
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                          <DialogTitle>Revoke this session?</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                          {session.userAgent || 'Unknown device'} will be signed out.
                        </p>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button
                              variant="destructive"
                              disabled={busy === `revoke-session:${session.token}`}
                              onClick={() => handleRevokeSession(session.token)}
                            >
                              {busy === `revoke-session:${session.token}` ? (
                                <Loader2 className="size-4 animate-spin" />
                              ) : null}
                              Confirm Revoke
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-2">Accounts ({accounts.length})</h4>
            {accountsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No linked accounts</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {accounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between p-2 rounded border bg-muted/30 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium capitalize">{acc.provider}</p>
                      <p className="text-muted-foreground truncate">{acc.accountId}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Activity timeline */}
          <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Activity — {user.name}</DialogTitle>
              </DialogHeader>
              {activityLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-muted-foreground" />
                </div>
              ) : activityLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No activity logged</p>
              ) : (
                <div className="max-h-80 space-y-2 overflow-y-auto">
                  {activityLogs.map((log) => (
                    <div key={log.id} className="rounded-lg border p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <code className="font-medium">{log.action}</code>
                        <span className="text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {log.metadata && (
                        <p className="mt-1 text-muted-foreground truncate">{log.metadata}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  )
}
