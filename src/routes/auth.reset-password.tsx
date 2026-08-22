import { createFileRoute, useRouter, useSearch } from '@tanstack/react-router'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { z } from 'zod'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import { Input } from '#/components/ui/input'
import ThemeToggle from '#/components/ThemeToggle'
import { authClient } from '#/utils/auth-client'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: z.object({
    token: z.string().optional(),
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const router = useRouter()
  const { token } = useSearch({ from: Route.id })
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return (
      <div className="flex justify-center items-center h-full">
        <Card className="w-md max-sm:w-[90%]">
          <CardHeader className="flex flex-col items-center">
            <img src="/ap128.png" alt="BP logo" className="size-10" />
            <CardTitle>Invalid Reset Link</CardTitle>
            <CardDescription className="text-center">
              This password reset link is invalid or has expired. Please request a new one.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button className="w-full" onClick={() => router.navigate({ to: '/auth/signin' })}>
              Back to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  const handleSubmit = async () => {
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSubmitting(true)
    try {
      await (authClient as any).resetPassword({
        token,
        newPassword: password,
      })
      toast.success('Password reset successfully. Please sign in.')
      router.navigate({ to: '/auth/signin' })
    } catch {
      toast.error('Failed to reset password. The link may have expired.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex justify-center items-center h-full">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader className="flex flex-col items-center">
          <img src="/ap128.png" alt="BP logo" className="size-10" />
          <CardTitle>Reset Password</CardTitle>
          <CardDescription className="text-center">Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmit()
                }}
              />
            </div>
            <Button
              className="w-full"
              disabled={submitting || !password || !confirmPassword}
              onClick={handleSubmit}
            >
              {submitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                'Reset Password'
              )}
            </Button>
          </div>
        </CardContent>
        <CardFooter>
          <div className="w-full text-center text-xs text-neutral-500">
            <button
              type="button"
              className="underline underline-offset-2 hover:text-foreground transition-colors"
              onClick={() => router.navigate({ to: '/auth/signin' })}
            >
              Back to Sign In
            </button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
