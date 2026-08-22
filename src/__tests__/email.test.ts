import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSendMail = vi.fn().mockResolvedValue({ accepted: ['test@example.com'] })

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({ sendMail: mockSendMail })),
  },
}))

const mockDbQuery = vi.fn()

vi.mock('#/utils/config', () => ({
  db: { select: () => ({ from: () => ({ limit: mockDbQuery }) }) },
  schema: { emailConfig: {} },
}))

vi.mock('#/db/schema', () => ({ emailConfig: {} }))
vi.mock('#/db/schema-sqlite', () => ({ emailConfig: {} }))

describe('sendEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends email with correct config', async () => {
    mockDbQuery.mockResolvedValue([{
      id: 'cfg-1',
      smtpHost: 'smtp.example.com',
      smtpPort: 587,
      smtpUser: 'user',
      smtpPass: 'pass',
      fromEmail: 'noreply@example.com',
      fromName: 'Admin',
      provider: 'smtp',
    }])

    const { sendEmail } = await import('#/utils/email')
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    })
    expect(result.success).toBe(true)
    expect(mockSendMail).toHaveBeenCalledOnce()
  })

  it('returns error when no SMTP config', async () => {
    mockDbQuery.mockResolvedValue([])

    const { sendEmail } = await import('#/utils/email')
    const result = await sendEmail({
      to: 'test@example.com',
      subject: 'Test',
      text: 'Hello',
    })
    expect(result.success).toBe(false)
    expect(result.error).toBe('Email configuration missing in database.')
  })
})
