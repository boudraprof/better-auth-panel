import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import {
  Loader2,
  Mail,
  ShieldCheck,
  Trash2,
  UserCircle,
} from 'lucide-react'
import z from 'zod'
import { toast } from 'react-toastify'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Badge } from '#/components/ui/badge'
import { Separator } from '#/components/ui/separator'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { authedMiddleware } from '#/middleware/authed'
import { useSession, authClient } from '#/utils/auth-client'
import { normalizeRole } from '#/utils/permissions'
import InputError from '#/components/InputError'
import { useDemoAction } from "#/hooks/use-demo-action"

const { updateUser, changePassword, changeEmail, deleteUser } = authClient

export const Route = createFileRoute('/profile')({
  server: {
    middleware: [authedMiddleware],
  },
  component: ProfilePage,
})

function formatDate(value?: Date | string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function ProfilePage() {
  const router = useRouter()
  const { data: sessionData, isPending } = useSession()
  const user = sessionData?.user

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const { blocked } = useDemoAction()

  // Profile (name + image) form.
  const profileForm = useForm({
    defaultValues: { name: user?.name ?? '', image: user?.image ?? '' },
    onSubmit: async ({ value }) => {
      if (blocked()) return

      const data: Record<string, string> = {}
      if (value.name.trim() && value.name.trim() !== user?.name)
        data.name = value.name.trim()
      if (value.image.trim() !== (user?.image ?? ''))
        data.image = value.image.trim()
      if (Object.keys(data).length === 0) return

      const res = await updateUser(data)
      if (res.error?.message) {
        toast.error(res.error.message)
        return
      }
      toast.success('Profile updated')
      profileForm.reset()
    },
  })

  // Change password form.
  const passwordForm = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
    onSubmit: async ({ value }) => {
      if (blocked()) return

      const res = await changePassword({
        currentPassword: value.currentPassword,
        newPassword: value.newPassword,
        revokeOtherSessions: true,
      })
      if (res.error?.message) {
        toast.error(res.error.message)
        return
      }
      toast.success('Password changed')
      passwordForm.reset()
    },
  })

  // Change email form.
  const emailForm = useForm({
    defaultValues: { newEmail: '' },
    onSubmit: async ({ value }) => {
      if (blocked()) return

      const res = await changeEmail({
        newEmail: value.newEmail.trim(),
        callbackURL: '/profile',
      })
      if (res.error?.message) {
        toast.error(res.error.message)
        return
      }
      toast.success('Verification email sent to your new address')
      emailForm.reset()
    },
  })

  const handleDelete = async (password: string) => {
    if (blocked()) {
      setDeleteOpen(false)
      return
    }

    setDeleting(true)
    try {
      const res = await deleteUser({
        password: password || undefined,
        callbackURL: '/auth/signin',
      })
      if (res.error?.message) {
        toast.error(res.error.message)
        return
      }
      toast.success('Account deleted')
      router.navigate({ to: '/auth/signin' })
    } catch {
      toast.error('Failed to delete account')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  if (isPending || !user) {
    return (
      <div className="flex justify-center items-center py-20 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    )
  }

  const role = normalizeRole(user.role)

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-6">
      <div className="flex items-center gap-3">
        <UserCircle className="size-8 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-semibold">My Account</h1>
          <p className="text-sm text-muted-foreground">
            Manage your personal profile and security settings.
          </p>
        </div>
      </div>

      {/* Profile overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>
            Your basic account information.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Name
            </span>
            <span className="font-medium">{user.name || '—'}</span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Email
            </span>
            <span className="flex items-center gap-2 font-medium">
              <Mail className="size-3.5 text-muted-foreground" />
              {user.email}
              {user.emailVerified ? (
                <Badge
                  variant="outline"
                  className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                >
                  Verified
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-amber-500/30 bg-amber-500/10 text-amber-500"
                >
                  Unverified
                </Badge>
              )}
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Role
            </span>
            <span className="flex items-center gap-2 font-medium capitalize">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              {role}
            </span>
          </div>
          <div className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              Member since
            </span>
            <span className="font-medium">{formatDate(user.createdAt)}</span>
          </div>
        </CardContent>
      </Card>

      {/* Edit name / image */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit profile</CardTitle>
          <CardDescription>
            Update your display name or avatar URL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void profileForm.handleSubmit()
            }}
            className="grid gap-4"
          >
            <profileForm.Field
              name="name"
              validators={{
                onChange: ({ value }) =>
                  !value.trim() ? 'Name is required' : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <profileForm.Field
              name="image"
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Avatar URL</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="https://…"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <profileForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Save changes
                </Button>
              )}
            />
          </form>
        </CardContent>
      </Card>

      {/* Change email */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change email</CardTitle>
          <CardDescription>
            A verification link will be sent to your new address.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void emailForm.handleSubmit()
            }}
            className="grid gap-4"
          >
            <emailForm.Field
              name="newEmail"
              validators={{
                onChange: ({ value }) => {
                  try {
                    z.email().parse(value)
                    return undefined
                  } catch {
                    return 'Invalid email'
                  }
                },
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>New email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    placeholder="new@email.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <emailForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Send verification
                </Button>
              )}
            />
          </form>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>
            Enter your current password to set a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void passwordForm.handleSubmit()
            }}
            className="grid gap-4"
          >
            <passwordForm.Field
              name="currentPassword"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Current password is required' : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Current password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="current-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <passwordForm.Field
              name="newPassword"
              validators={{
                onChange: ({ value }) =>
                  value.length < 8
                    ? 'Password must be at least 8 characters'
                    : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>New password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <passwordForm.Field
              name="confirm"
              validators={{
                onChangeListenTo: ['newPassword'],
                onChange: ({ value, fieldApi }) => {
                  const next = fieldApi.form.state.values.newPassword
                  return value !== next ? 'Passwords do not match' : undefined
                },
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Confirm new password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    autoComplete="new-password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <passwordForm.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit || isSubmitting}>
                  {isSubmitting && <Loader2 className="size-4 animate-spin" />}
                  Update password
                </Button>
              )}
            />
          </form>
        </CardContent>
      </Card>

      <Separator />

      {/* Danger zone */}
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently remove your account and all associated data. This cannot
            be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => {
              if (blocked()) return
              setDeleteOpen(true)
            }}
          >
            <Trash2 className="size-4" />
            Delete my account
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  )
}

function DeleteAccountDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (password: string) => void
  loading: boolean
}) {
  const [password, setPassword] = useState('')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This permanently deletes your account. Enter your password to
            confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2">
          <Label htmlFor="delete-password">Password</Label>
          <Input
            id="delete-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={loading}>
              Cancel
            </Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={loading}
            onClick={() => onConfirm(password)}
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Delete account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
