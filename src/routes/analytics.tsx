import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowLeft, Ban, Loader2, MailCheck, MailX, RefreshCw,
  TrendingUp, Users, Activity, UserCheck, UserCog,
} from 'lucide-react'
import { toast } from 'react-toastify'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, AreaChart, Area,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { adminMiddleware } from '#/middleware/admin'
import api from '#/utils/axios'
import type { AnalyticsData } from '#/types'
import { ACTION_LABELS, PIE_COLORS } from '#/utils/constants'


export const Route = createFileRoute('/analytics')({
  server: { middleware: [adminMiddleware] },
  component: AnalyticsPage,
})

function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    try {
      const { data: analytics } = await api.get<AnalyticsData>('/admin/analytics')
      setData(analytics)
    } catch { toast.error('Failed to fetch analytics') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAnalytics() }, [fetchAnalytics])

  const auditData = useMemo(
    () => (data?.auditBreakdown || []).map((a) => ({
      name: ACTION_LABELS[a.action] || a.action,
      value: a.count,
    })),
    [data?.auditBreakdown],
  )

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-10 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const d = data!

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button>
          </Link>
          <h1 className="text-3xl font-bold">Analytics</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAnalytics} disabled={loading}>
          <RefreshCw className="size-4 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Top summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="size-5 text-sky-500" />
            <div>
              <p className="text-2xl font-bold">{d.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <TrendingUp className="size-5 text-emerald-500" />
            <div>
              <p className="text-2xl font-bold">{d.dailySignups.reduce((s, r) => s + r.count, 0)}</p>
              <p className="text-xs text-muted-foreground">New (30d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Activity className="size-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold">{d.activeUsers}</p>
              <p className="text-xs text-muted-foreground">Active (7d)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <UserCheck className="size-5 text-purple-500" />
            <div>
              <p className="text-2xl font-bold">{d.newToday}</p>
              <p className="text-xs text-muted-foreground">New today</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second row: smaller stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <MailCheck className="size-5 text-emerald-500" />
            <div>
              <p className="text-xl font-bold">{d.verifiedUsers}</p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <MailX className="size-5 text-amber-500" />
            <div>
              <p className="text-xl font-bold">{d.unverifiedUsers}</p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/5 border-red-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <Ban className="size-5 text-red-500" />
            <div>
              <p className="text-xl font-bold">{d.bannedUsers}</p>
              <p className="text-xs text-muted-foreground">Banned</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="flex items-center gap-3 p-4">
            <UserCog className="size-5 text-blue-500" />
            <div>
              <p className="text-xl font-bold">
                {d.roleDistribution.find((r) => r.role === 'admin')?.count ?? 0}
              </p>
              <p className="text-xs text-muted-foreground">Admins</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

        {/* Daily sign-ups bar chart */}
        <Card>
          <CardHeader><CardTitle>Daily Sign-ups (30 Days)</CardTitle></CardHeader>
          <CardContent>
            {d.dailySignups.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.dailySignups}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => { const dt = new Date(v); return `${dt.getMonth() + 1}/${dt.getDate()}` }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <Bar dataKey="count" fill="#4fb8b2" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Cumulative user growth line chart */}
        <Card>
          <CardHeader><CardTitle>User Growth (Cumulative)</CardTitle></CardHeader>
          <CardContent>
            {d.cumulativeGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.cumulativeGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => { const dt = new Date(v); return `${dt.getMonth() + 1}/${dt.getDate()}` }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <Area type="monotone" dataKey="count" stroke="#328f97" fill="#328f97" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Sessions per day */}
        <Card>
          <CardHeader><CardTitle>Sessions Created (30 Days)</CardTitle></CardHeader>
          <CardContent>
            {d.sessionsPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.sessionsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v) => { const dt = new Date(v); return `${dt.getMonth() + 1}/${dt.getDate()}` }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} labelFormatter={(v) => new Date(v).toLocaleDateString()} />
                  <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Role distribution horizontal bar */}
        <Card>
          <CardHeader><CardTitle>Users by Role</CardTitle></CardHeader>
          <CardContent>
            {d.roleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={d.roleDistribution} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="role" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip itemStyle={{color: "var(--card-foreground)"}}  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {d.roleDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Verification status horizontal bar */}
        <Card>
          <CardHeader><CardTitle>Email Verification</CardTitle></CardHeader>
          <CardContent>
            {d.totalUsers > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: 'Verified', value: d.verifiedUsers },
                  { name: 'Unverified', value: d.unverifiedUsers },
                ]} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip itemStyle={{color: "var(--card-foreground)"}}  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    <Cell fill="#10b981" />
                    <Cell fill="#f59e0b" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Audit breakdown horizontal bar */}
        {auditData.length > 0 && (
          <Card>
            <CardHeader><CardTitle>Admin Actions</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={auditData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11 }} />
                  <Tooltip itemStyle={{color: "var(--card-foreground)"}}  contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {auditData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Banned status horizontal bar */}
        {d.totalUsers > 0 && (
          <Card>
            <CardHeader><CardTitle>User Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  { name: 'Active', value: d.totalUsers - d.bannedUsers },
                  { name: 'Banned', value: d.bannedUsers },
                ]} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                  <Tooltip  itemStyle={{color: "var(--card-foreground)"}} contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    <Cell fill="#4fb8b2" />
                    <Cell fill="#ef4444" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
