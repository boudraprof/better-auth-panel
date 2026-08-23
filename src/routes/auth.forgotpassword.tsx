import { createFileRoute, Link } from '@tanstack/react-router'
import { useForm } from '@tanstack/react-form'
import { Loader2 } from 'lucide-react'
import z from 'zod'

import { useState } from 'react'
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
import { toast } from 'react-toastify'
import { authClient } from '#/utils/auth-client'
import InputError from '#/components/InputError'

export const Route = createFileRoute('/auth/forgotpassword')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [errorMessage, setErrorMessage] = useState<string>('')

  const form = useForm({
    defaultValues: {
      email: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await authClient.requestPasswordReset({
          email: value.email.trim(),
          redirectTo: `${window.location.origin}/auth/signin`,
        })
        toast.success('Password reset email sent. Please check your inbox.')
      } catch {
        setErrorMessage('Failed to send reset email')
      }
    },
  })

  return (
    <div className="flex justify-center items-center h-full relative">
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader className="flex flex-col items-center">
          <img src="/bp128.png" alt="BP logo" className="size-10" />
          <CardTitle className="text-lg md:text-xl">Forgot password</CardTitle>
          <CardDescription className="flex flex-col text-center text-xs md:text-sm">
            <p>Enter your email and we'll send you a reset link if an account exists.</p>
            {errorMessage && (
              <p className="pt-2 text-red-500">{errorMessage}</p>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form.Field
              name="email"
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
                  <Label htmlFor={field.name}>Email</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="email"
                    placeholder="admin@email.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!canSubmit || isSubmitting}
                  onClick={(e) => {
                    e.preventDefault()
                    form.handleSubmit()
                  }}
                >
                  {isSubmitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              )}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Link
            to="/auth/signin"
            className="text-center text-sm text-neutral-300"
          >
            <p>Back to login</p>
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
