import nodemailer from 'nodemailer'
import { db, schema } from '#/utils/config'
import logger from '#/utils/logger'

let transporter: nodemailer.Transporter | null = null
let cachedConfig: { id: string } | null = null

async function loadConfig() {
  const [config] = await db.select().from(schema.emailConfig).limit(1)
  return config || null
}

async function getTransporter() {
  const config = await loadConfig()
  if (!config || !config.smtpHost) return null

  // Reuse transporter if config hasn't changed
  if (transporter && cachedConfig?.id === config.id) return transporter

  const needsAuth = config.smtpUser && config.smtpPass
  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort || 587,
    secure: config.smtpPort === 465,
    auth: needsAuth
      ? { user: config.smtpUser!, pass: config.smtpPass! }
      : undefined,
  })
  cachedConfig = { id: config.id }
  return transporter
}

export async function sendEmail(options: {
  to: string
  subject: string
  text: string
  html?: string
}): Promise<{ success: boolean; error?: string }> {
  const config = await loadConfig()
  if (!config) {
    return { success: false, error: 'Email configuration missing in database.' }
  }

  if (config.provider === 'smtp' && !config.smtpHost) {
    return { success: false, error: 'SMTP Host is required for SMTP provider.' }
  }

  if (config.provider !== 'smtp' && !config.smtpPass) {
    return { success: false, error: `API Key / Password is missing for ${config.provider}.` }
  }

  const tr = await getTransporter()
  if (!tr) {
    return { success: false, error: 'Failed to create nodemailer transport.' }
  }

  try {
    await tr.sendMail({
      from: config.fromName
        ? `"${config.fromName}" <${config.fromEmail || 'noreply@example.com'}>`
        : config.fromEmail || 'noreply@example.com',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html || options.text,
    })
    return { success: true }
  } catch (err: any) {
    logger.error('Failed to send email', err, 'Email')
    return { success: false, error: err?.message || String(err) }
  }
}

/**
 * Verify SMTP connection by sending a test email to the given address.
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  return sendEmail({
    to,
    subject: 'Test email from Admin Panel',
    text: 'This is a test email to verify your SMTP configuration.\n\nIf you received this, your email settings are working correctly.',
    html: '<p>This is a test email to verify your SMTP configuration.</p><p>If you received this, your email settings are working correctly.</p>',
  })
}
