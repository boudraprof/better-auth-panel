import { useEffect, useRef, useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'react-toastify'
import z from 'zod'


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
import { Select, SelectItem } from '#/components/ui/select'
import { checkEmail } from '#/utils/admin-api'
import { authClient } from '#/utils/auth-client'
import InputError from '#/components/InputError'
import { useDemoAction } from "#/hooks/use-demo-action"



const { admin: adminApi } = authClient

export function CreateUserDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  const [emailTaken, setEmailTaken] = useState<boolean | null>(null)
  const [checkingEmail, setCheckingEmail] = useState(false)
  const checkSeq = useRef(0)
  const { blocked } = useDemoAction()

  const form = useForm({
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'user',
    },
    onSubmit: async ({ value }) => {
      if (blocked()) return
      const email = value.email.trim()
      const data = await checkEmail(email)
      if (data.exists) {
        form.setFieldValue('email', value.email)
        setEmailTaken(true)
        return
      }

      await adminApi.createUser({
        name: value.name.trim(),
        email,
        password: value.password,
        role: value.role as string as 'user' | 'admin',
      })

      toast.success('User created')
      setOpen(false)
      form.reset()
      setEmailTaken(null)
      onCreated()
    },
  })

  useEffect(() => {
    const value = form.state.values.email.trim().toLowerCase()
    if (!value || !value.includes('@')) {
      setEmailTaken(null)
      setCheckingEmail(false)
      return
    }

    setCheckingEmail(true)
    const seq = ++checkSeq.current
    const timer = setTimeout(async () => {
      try {
        const data = await checkEmail(value)
        if (seq === checkSeq.current) setEmailTaken(data.exists)
      } catch {
        if (seq === checkSeq.current) setEmailTaken(null)
      } finally {
        if (seq === checkSeq.current) setCheckingEmail(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [form.state.values.email])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="size-4 mr-1" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            void form.handleSubmit()
          }}
        >
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>

          <form.Field
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
          </form.Field>

          <form.Field
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
                  aria-invalid={emailTaken === true}
                />
                <InputError field={field} />
                {checkingEmail ? (
                  <p className="text-xs text-muted-foreground">Checking availability…</p>
                ) : emailTaken === true ? (
                  <p className="text-xs text-destructive">This email is already in use.</p>
                ) : emailTaken === false ? (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Email is available.</p>
                ) : null}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{
              onChange: ({ value }) =>
                value.length < 8 ? 'Password must be at least 8 characters' : undefined,
            }}
          >
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Password</Label>
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
          </form.Field>

          <form.Field name="role">
            {(field) => (
              <div className="grid gap-2">
                <Label htmlFor={field.name}>Role</Label>
                <Select
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onValueChange={(v) => field.handleChange(v)}
                >
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </Select>
              </div>
            )}
          </form.Field>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={form.state.isSubmitting || emailTaken === true}>
              {form.state.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Create
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
