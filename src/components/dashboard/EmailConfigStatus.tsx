import { useCallback, useEffect, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Mail, Settings2 } from 'lucide-react'

import { Card, CardContent } from '#/components/ui/card'
import { Badge } from '#/components/ui/badge'
import api from '#/utils/axios'

type EmailConfig = {
  id: string
  provider: string
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  fromEmail: string | null
  fromName: string | null
}

const PROVIDER_LABELS: Record<string, string> = {
  smtp: 'SMTP',
  sendgrid: 'SendGrid',
  resend: 'Resend',
  mailgun: 'Mailgun',
}

/**
 * Compact read-only summary of the configured outbound email provider, shown on
 * the dashboard. Renders nothing (no card) until an email configuration has
 * actually been added, so the dashboard stays clean for fresh installs.
 */
export function EmailConfigStatus() {
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchConfig = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: EmailConfig | null }>(
        '/admin/email-config',
      )
      setConfig(data.data)
    } catch {
      // Non-critical: the card simply stays hidden if the fetch fails.
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  if (loading || !config) return null

  const providerLabel = PROVIDER_LABELS[config.provider] ?? config.provider

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3 min-w-0">
          <Mail className="size-5 text-sky-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium flex items-center gap-2">
              Email Configuration
              <Badge variant="secondary" className="text-xs">
                {providerLabel}
              </Badge>
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {config.smtpHost
                ? `${config.smtpHost}${config.smtpPort ? `:${config.smtpPort}` : ''}`
                : config.fromEmail ?? 'Configured'}
              {config.fromEmail ? ` · ${config.fromEmail}` : ''}
            </p>
          </div>
        </div>
        <Link
          to="/email-config"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground shrink-0"
        >
          <Settings2 className="size-3.5" />
          Manage
        </Link>
      </CardContent>
    </Card>
  )
}
