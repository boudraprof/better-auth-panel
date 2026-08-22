import { useCallback, useEffect, useRef, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Download,
  FileText,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Search,
} from 'lucide-react'
import { toast } from 'react-toastify'
import {
  Card,
  CardContent,
  CardHeader,
} from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { adminMiddleware } from '#/middleware/admin'
import { TableSkeleton } from '#/components/LoadingSkeleton'
import { BulkActionsBar } from '#/components/dashboard/BulkActionsBar'
import type { BulkAction } from '#/components/dashboard/BulkActionsBar'
import { CreateUserDialog } from '#/components/dashboard/CreateUserDialog'
import { GlobalSessionsDialog } from '#/components/dashboard/GlobalSessionsDialog'
import { SeedUsersDialog } from '#/components/dashboard/SeedUsersDialog'
import { StatsCards } from '#/components/dashboard/StatsCards'
import { UserDetailDialog } from '#/components/dashboard/UserDetailDialog'
import { UserRow } from '#/components/dashboard/UserRow'
import type { AdminStats, User } from '#/components/dashboard/types'
import api from '#/utils/axios'
import { useSession, authClient } from '#/utils/auth-client'

const { admin: adminApi } = authClient

// The admin plugin's listUsers endpoint returns full user rows from the DB, but
// its generated type omits `lastSeenAt`. The runtime response does include it
// (internalAdapter.listUsers → findMany with no column projection), so we read
// it through this widened shape.
type ApiUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  banReason?: string | null
  banExpires?: string | null
  emailVerified: boolean
  image?: string | null
  lastSeenAt?: Date | string | null
  createdAt: Date | string
}

export const Route = createFileRoute('/')({
  server: {
    middleware: [adminMiddleware],
  },
  component: AdminDashboard,
})

function AdminDashboard() {
  const [users, setUsers] = useState<Array<User>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)

  // Filtering / sorting (mirrors Better Auth Studio's Users page)
  const [filterBanned, setFilterBanned] = useState<'all' | 'banned' | 'active'>('all')
  const [filterRole, setFilterRole] = useState<string>('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastSeenAt'>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')

  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Dashboard stats (total / admins / verified / banned / recent)
  const [stats, setStats] = useState<AdminStats | null>(null)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)

  // Global sessions panel
  const [sessionsOpen, setSessionsOpen] = useState(false)

  // Tracks in-flight destructive actions so buttons show a spinner.
  const [pendingAction, setPendingAction] = useState<string | null>(null)

  // Search debounce helpers: remember the last search actually sent to the
  // server (so the mount effect doesn't double-fetch) and keep a handle on the
  // pending debounce timer so pressing Enter / Search cancels it.
  const lastFetchedSearch = useRef('')
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: sessionData } = useSession()
  // `impersonatedBy` is added to the session model by Better Auth's admin
  // plugin at runtime but isn't reflected in the client `useSession` types
  // (those are generated from the server `auth` instance). Read it safely.
  const currentSession = sessionData?.session as
    | { impersonatedBy?: string | null }
    | undefined
  const isImpersonating = Boolean(currentSession?.impersonatedBy)
  // The id of the admin currently using the dashboard — used to block
  // self-destructive actions (ban / delete / remove own admin / revoke own
  // session).
  const currentUserId = sessionData?.user.id ?? null

  const fetchUsers = useCallback(async (page: number, search?: string) => {
    setLoading(true)
    try {
      const { data } = await adminApi.listUsers({
        query: {
          limit: pageSize,
          offset: page * pageSize,
          sortBy,
          sortDirection,
          ...(search?.trim()
            ? { searchValue: search.trim(), searchField: 'email', searchOperator: 'contains' }
            : {}),
          ...(filterBanned !== 'all'
            ? { filterField: 'banned', filterValue: filterBanned === 'banned' }
            : filterRole
              ? { filterField: 'role', filterValue: filterRole }
              : {}),
        },
      })
      setUsers(
        (data?.users ?? []).map(
          (u): User => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role ?? 'user',
            banned: u.banned ?? null,
            banReason: u.banReason ?? null,
            banExpires: u.banExpires ?? null,
            emailVerified: u.emailVerified,
            image: u.image ?? null,
            lastSeenAt: (u as ApiUser).lastSeenAt ?? null,
            createdAt: u.createdAt,
          }),
        ),
      )
      setTotal(data?.total ?? 0)
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [pageSize, sortBy, sortDirection, filterBanned, filterRole])

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get<AdminStats>('/admin/stats')
      setStats(data)
    } catch {
      // Non-critical: stats card just stays empty.
    }
  }, [])

  useEffect(() => {
    fetchUsers(currentPage, searchValue)
  }, [currentPage, fetchUsers])

  // Stats are independent of paging/filtering, so fetch them once on mount.
  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // Debounce search input: fire a request ~400ms after the user stops typing.
  useEffect(() => {
    if (searchValue === lastFetchedSearch.current) return
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      lastFetchedSearch.current = searchValue
      setCurrentPage(0)
      fetchUsers(0, searchValue)
    }, 400)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [searchValue, fetchUsers])

  const handleSearch = () => {
    // Cancel any pending debounce and fetch immediately.
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    lastFetchedSearch.current = searchValue
    setCurrentPage(0)
    fetchUsers(0, searchValue)
  }

  const handleRefresh = () => {
    fetchUsers(currentPage, searchValue)
    fetchStats()
  }

  const handleFilterChange = () => {
    setCurrentPage(0)
    fetchUsers(0, searchValue)
  }

  const handleToggleAdmin = async (user: User) => {
    const role = user.role === 'admin' ? ('user' as const) : ('admin' as const)
    // Never let an admin strip their own admin role (self-lockout).
    if (user.id === currentUserId && role !== 'admin') {
      toast.error('You cannot remove your own admin role')
      return
    }
    // Never remove the last remaining admin.
    if (
      role !== 'admin' &&
      user.role === 'admin' &&
      stats?.admins !== undefined &&
      stats.admins <= 1
    ) {
      toast.error('Cannot remove the last admin')
      return
    }
    try {
      await adminApi.setRole({ userId: user.id, role })
      toast.success(`Role updated to ${role}`)
      fetchUsers(currentPage, searchValue)
    } catch {
      toast.error('Failed to update role')
    }
  }

  const handleBanUser = async (userId: string, reason?: string, expiresIn?: number) => {
    // Never ban yourself.
    if (userId === currentUserId) {
      toast.error('You cannot ban yourself')
      return
    }
    try {
      await adminApi.banUser({
        userId,
        banReason: reason ?? undefined,
        banExpiresIn: expiresIn ?? undefined,
      })
      toast.success('User banned')
      fetchUsers(currentPage, searchValue)
    } catch {
      toast.error('Failed to ban user')
    }
  }

  const handleUnbanUser = async (userId: string) => {
    try {
      await adminApi.unbanUser({ userId })
      toast.success('User unbanned')
      fetchUsers(currentPage, searchValue)
    } catch {
      toast.error('Failed to unban user')
    }
  }

  const handleStopImpersonating = async () => {
    setPendingAction('stop-impersonating')
    try {
      await adminApi.stopImpersonating()
      toast.success('Stopped impersonating. Reloading...')
      window.location.reload()
    } catch {
      toast.error('Failed to stop impersonating')
    } finally {
      setPendingAction(null)
    }
  }

  const handleExportUsers = async () => {
    try {
      const response = await api.get('/admin/export-users', { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'users-export.csv'
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success('Users exported')
    } catch {
      toast.error('Failed to export users')
    }
  }

  const handleBulkAction = async (action: BulkAction) => {
    if (selectedIds.size === 0) {
      toast.error('No users selected')
      return
    }
    setBulkActionLoading(true)
    try {
      await api.post('/admin/bulk-actions', { userIds: Array.from(selectedIds), action })
      toast.success(`${action} applied to ${selectedIds.size} users`)
      setSelectedIds(new Set())
      fetchUsers(currentPage, searchValue)
      fetchStats()
    } catch {
      toast.error(`Failed to ${action} users`)
    } finally {
      setBulkActionLoading(false)
    }
  }

  const toggleSelectUser = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(users.map((u) => u.id)))
    }
  }

  // Handlers for UserDetailDialog callbacks.
  const handleUserDeleted = () => {
    setSelectedUser(null)
    fetchUsers(currentPage, searchValue)
  }

  const handleUserUpdated = (userId: string, patch: Partial<User>) => {
    setSelectedUser((prev) => (prev?.id === userId ? { ...prev, ...patch } : prev))
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...patch } : u)))
    fetchStats()
  }

  const handleSeedDone = () => {
    fetchUsers(0, '')
    setCurrentPage(0)
    fetchStats()
  }

  const handleCreateDone = () => {
    fetchUsers(0, '')
    setCurrentPage(0)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6">
      {isImpersonating && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            You are impersonating another user. Admin access is restricted until you stop.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleStopImpersonating}
            disabled={pendingAction === 'stop-impersonating'}
          >
            {pendingAction === 'stop-impersonating' ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Stop Impersonating
          </Button>
        </div>
      )}

      <StatsCards stats={stats} />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm">{total} Users</Badge>
          <Link to="/audit-log">
            <Button variant="outline">
              <FileText className="size-4 mr-1" />
              Audit Log
            </Button>
          </Link>
          <Link to="/analytics">
            <Button variant="outline">
              <BarChart3 className="size-4 mr-1" />
              Analytics
            </Button>
          </Link>
          <Button variant="outline" onClick={handleExportUsers}>
            <Download className="size-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="size-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" onClick={() => setSessionsOpen(true)}>
            <MonitorSmartphone className="size-4 mr-1" />
            Sessions
          </Button>
          <SeedUsersDialog onSeeded={handleSeedDone} />
          <CreateUserDialog onCreated={handleCreateDone} />
        </div>
      </div>

      <GlobalSessionsDialog open={sessionsOpen} onOpenChange={setSessionsOpen} />

      {selectedIds.size > 0 && (
        <BulkActionsBar
          count={selectedIds.size}
          loading={bulkActionLoading}
          onClear={() => setSelectedIds(new Set())}
          onAction={handleBulkAction}
        />
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search by email..."
                className="pl-9"
              />
            </div>
            <Button onClick={handleSearch} variant="secondary">Search</Button>
            {searchValue && (
              <Button variant="ghost" onClick={() => setSearchValue('')}>
                Clear
              </Button>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Select   value={filterBanned}  onValueChange={(v) => { setFilterBanned(v as typeof filterBanned); handleFilterChange() }}>
              <SelectTrigger className="w-32.2"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterRole} onValueChange={(v) => { setFilterRole(v); handleFilterChange() }}>
              <SelectTrigger className="w-32.2"><SelectValue placeholder="Role" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => { setSortBy(v as typeof sortBy); handleFilterChange() }}>
              <SelectTrigger className="w-37.5"><SelectValue placeholder="Sort by" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Sort: Created</SelectItem>
                <SelectItem value="lastSeenAt">Sort: Last seen</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc'); handleFilterChange() }}
            >
              {sortDirection === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
              {sortDirection === 'asc' ? 'Asc' : 'Desc'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <TableSkeleton rows={Math.min(pageSize, 8)} />
          ) : (
            <div className="space-y-2">
              {users.length > 0 && (
                <div className="flex items-center gap-2 px-1 pb-2">
                  <input
                    type="checkbox"
                    className="size-4 rounded border-gray-300"
                    checked={selectedIds.size === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                  />
                  <span className="text-xs text-muted-foreground">Select all</span>
                </div>
              )}
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  selected={selectedIds.has(user.id)}
                  onToggleSelect={() => toggleSelectUser(user.id)}
                  onViewDetails={setSelectedUser}
                  onToggleAdmin={handleToggleAdmin}
                  onBan={handleBanUser}
                  onUnban={handleUnbanUser}
                />
              ))}
              {users.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              )}
            </div>
          )}

          {users.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Select
                value={String(pageSize)}
                onValueChange={(v) => {
                  setPageSize(Number(v))
                  setCurrentPage(0)
                }}
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 / page</SelectItem>
                  <SelectItem value="20">20 / page</SelectItem>
                  <SelectItem value="50">50 / page</SelectItem>
                  <SelectItem value="100">100 / page</SelectItem>
                </SelectContent>
              </Select>
              {totalPages > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= totalPages - 1}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserDeleted={handleUserDeleted}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  )
}