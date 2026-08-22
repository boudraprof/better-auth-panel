import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { CreateUserDialog } from '#/components/dashboard/CreateUserDialog'
import { authClient } from '#/utils/auth-client'
import { toast } from 'react-toastify'

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('#/utils/auth-client', () => ({
  authClient: {
    admin: {
      createUser: vi.fn(),
    },
  },
}))

describe('CreateUserDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not call the API or show a toast for invalid form values', async () => {
    render(<CreateUserDialog onCreated={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /create user/i }))

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Alice' },
    })
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'not-an-email' },
    })
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'short' },
    })

    fireEvent.click(screen.getByRole('button', { name: /^create$/i }))

    expect(authClient.admin.createUser).not.toHaveBeenCalled()
    expect(toast.error).not.toHaveBeenCalled()
    expect(await screen.findByText(/invalid email/i)).toBeTruthy()
  })
})
