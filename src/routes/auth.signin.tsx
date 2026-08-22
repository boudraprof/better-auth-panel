import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
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
import { signIn } from '#/utils/auth-client'
import logger from '#/utils/logger'
import InputError from '#/components/InputError'

export const Route = createFileRoute('/auth/signin')({
  component: SignIn,
})

function SignIn() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string>('')

  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
    },
    onSubmit: async ({ value }) => {
      const res = await signIn.email({
        email: value.email,
        password: value.password,
      })
      if (res.error?.message) {
        setErrorMessage(res.error.message)
        logger.warn(`Sign-in failed: ${res.error.message}`, 'Auth')
        return
      }
      // Route middleware only runs on full page loads — a client-side
      // navigate() to '/' would render the dashboard before the admin check.
      // Redirect by role so non-admins land on /forbidden (the middleware
      // stays as defense-in-depth for direct loads).
      if (res.data?.user.role === 'admin') {
        router.navigate({ to: '/' })
      } else {
        router.navigate({ to: '/forbidden' })
      }
    },
  })

  return (
    <div className="flex justify-center items-center h-full relative">
      <div className="absolute top-4 right-4"></div>
      <Card className="w-md max-sm:w-[90%]">
        <CardHeader className="flex flex-col items-center">
          <img src="/logo128.png" alt="Logo" className="size-10" />
          <CardTitle className="text-lg md:text-xl">Admin Sign In</CardTitle>
          <CardDescription className="flex flex-col text-center text-xs md:text-sm">
            <p>Enter your email below to login to the admin panel</p>
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
                    placeholder="email@email.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  <InputError field={field} />
                </div>
              )}
            />

            <form.Field
              name="password"
              validators={{
                onChange: ({ value }) =>
                  !value ? 'Password is required' : undefined,
              }}
              children={(field) => (
                <div className="grid gap-2">
                  <Label htmlFor={field.name}>Password</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    type="password"
                    placeholder="password"
                    autoComplete="password"
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
                    'Login'
                  )}
                </Button>
              )}
            />
            <Link to="/auth/forgotpassword" className="text-center text-sm text-gray-300 hover:underline">
              Forgot password?
            </Link>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="w-full border-t" />

          <div className="text-center text-xs text-neutral-500">
            <p>Admin access only</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
