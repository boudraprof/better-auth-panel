import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Loader2, Mail, RefreshCw, Save } from 'lucide-react'
import { toast } from 'react-toastify'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { adminMiddleware } from '#/middleware/admin'
import api from '#/utils/axios'
import { DEMO_MODE_MESSAGE, isDemoMode } from '#/utils/demo-mode'

type EmailConfig = {
  id: string
  provider: string
  smtpHost: string | null
  smtpPort: number | null
  smtpUser: string | null
  smtpPass: string | null
  fromEmail: string | null
  fromName: string | null
}

export const Route = createFileRoute('/email-config')({
  server: {
    middleware: [adminMiddleware],
  },
  component: EmailConfigPage,
})

function EmailConfigPage() {
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const demoMode = isDemoMode()

  const showDemoModeMessage = () => {
    toast.info(DEMO_MODE_MESSAGE)
  }

  // Form fields
  const [provider, setProvider] = useState('smtp')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [fromEmail, setFromEmail] = useState('')
  const [fromName, setFromName] = useState('')

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ data: EmailConfig | null }>('/admin/email-config')
      const cfg = data.data
      setConfig(cfg)
      if (cfg) {
        setProvider(cfg.provider || 'smtp')
        setSmtpHost(cfg.smtpHost || '')
        setSmtpPort(String(cfg.smtpPort || '587'))
        setSmtpUser(cfg.smtpUser || '')
        setSmtpPass(cfg.smtpPass || '')
        setFromEmail(cfg.fromEmail || '')
        setFromName(cfg.fromName || '')
      }
    } catch {
      toast.error('Failed to fetch email config')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/email-config', {
        provider,
        smtpHost: smtpHost.trim() || undefined,
        smtpPort: smtpPort ? parseInt(smtpPort, 10) : undefined,
        smtpUser: smtpUser.trim() || undefined,
        smtpPass: smtpPass.trim() || undefined,
        fromEmail: fromEmail.trim() || undefined,
        fromName: fromName.trim() || undefined,
      })
      toast.success('Email configuration saved')
      fetchConfig()
    } catch {
      toast.error('Failed to save email config')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    const testEmail = prompt('Send test email to:')
    if (!testEmail || !testEmail.includes('@')) return
    try {
      const res = await api.post('/admin/email-config/test', { to: testEmail })
      if (res.data?.success) {
        toast.success('Test email sent!')
      } else {
        toast.error(res.data?.error || 'Failed to send test email')
      }
    } catch {
      toast.error('Failed to send test email')
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Loading email configuration...
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Email Configuration</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}>
            <RefreshCw className="size-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="size-5 text-sky-500" />
            SMTP Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-5">
            <div className="grid gap-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="w-full max-w-xs">
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="smtp">SMTP</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="resend">Resend</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="smtpHost">SMTP Host</Label>
                <Input
                  id="smtpHost"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="smtpPort">SMTP Port</Label>
                <Input
                  id="smtpPort"
                  type="number"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  placeholder="587"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="smtpUser">SMTP Username</Label>
                <Input
                  id="smtpUser"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="user@example.com"
                  autoComplete="off"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="smtpPass">SMTP Password</Label>
                <Input
                  id="smtpPass"
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={fromEmail}
                  onChange={(e) => setFromEmail(e.target.value)}
                  placeholder="noreply@example.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  value={fromName}
                  onChange={(e) => setFromName(e.target.value)}
                  placeholder="BP Admin Panel"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Save className="size-4 mr-1" />}
                Save Configuration
              </Button>
              <Button variant="outline" onClick={handleTest}>
                <Mail className="size-4 mr-1" />
                Send Test Email
              </Button>
            </div>

            {config && (
              <p className="text-xs text-muted-foreground pt-2">
                Last saved: {config.id ? 'Configuration exists' : 'Not yet configured'}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
