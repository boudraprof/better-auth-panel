import { MailCheck, Shield, UserPlus, UserX, Users } from 'lucide-react'
import { Card, CardContent } from '#/components/ui/card'
import type { AdminStats } from './types'

export function StatsCards({ stats }: { stats: AdminStats | null }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:gap-4 sm:grid-cols-5">
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Users className="size-5 text-muted-foreground" />
          <div>
            <p className="text-2xl font-bold">{stats?.total ?? '—'}</p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="stat-total-users"
            >
              Total Users
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <Shield className="size-5 text-amber-500" />
          <div>
            <p className="text-2xl font-bold">{stats?.admins ?? '—'}</p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="stat-admins"
            >
              Admins
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <MailCheck className="size-5 text-emerald-500" />
          <div>
            <p className="text-2xl font-bold">{stats?.verified ?? '—'}</p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="stat-verified"
            >
              Verified
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <UserX className="size-5 text-red-500" />
          <div>
            <p className="text-2xl font-bold">{stats?.banned ?? '—'}</p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="stat-banned"
            >
              Banned
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <UserPlus className="size-5 text-sky-500" />
          <div>
            <p className="text-2xl font-bold">{stats?.recentUsers ?? '—'}</p>
            <p
              className="text-xs text-muted-foreground"
              data-testid="stat-new-users"
            >
              New (24h)
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
