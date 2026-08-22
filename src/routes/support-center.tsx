import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Eye, Loader2, Search, Shield, ShieldAlert, ShieldOff } from 'lucide-react'
import { toast } from 'react-toastify'

import { Card, CardContent, CardHeader } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import { Input } from '#/components/ui/input'
import { supportMiddleware } from '#/middleware/support'
import api from '#/utils/axios'
import { UserDetailDialog } from '#/components/dashboard/UserDetailDialog'
import type { User } from '#/components/dashboard/types'

type ApiUser = {
  id: string
  name: string
  email: string
  role?: string | null
  banned?: boolean | null
  emailVerified: boolean
  image?: string | null
  lastSeenAt?: Date | string | null
  createdAt: Date | string
}

export const Route = createFileRoute('/support-center')({
  server: {
    middleware: [supportMiddleware],
  },
  component: SupportCenter,
})

function SupportCenter() {
  const [users, setUsers] = useState<Array<User>>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchValue, setSearchValue] = useState('')
  const [currentPage, setCurrentPage] = useState(0)
  const [pageSize, setPageSize] = useState(20)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  const fetchUsers = useCallback(async (page: number, search?: string) => {
    setLoading(true)
    try {
      const { data } = await api.get<{ users: ApiUser[]; total: number }>('/admin/support-users', {
        params: {
          limit: pageSize,
          page,
          ...(search?.trim() ? { search: search.trim() } : {}),
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
            banReason: null,
            banExpires: null,
            emailVerified: u.emailVerified,
            image: u.image ?? null,
            lastSeenAt: u.lastSeenAt ?? null,
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
  }, [pageSize])

  useEffect(() => {
    fetchUsers(currentPage, searchValue)
  }, [currentPage, fetchUsers])

  const handleSearch = () => {
    setCurrentPage(0)
    fetchUsers(0, searchValue)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="h-full p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link to="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Support Desk</h1>
          <Badge variant="secondary" className="text-sm">{total} Users</Badge>
        </div>
        <p className="text-xs text-muted-foreground">
          Read-only view — support staff cannot modify users.
        </p>
      </div>

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
              <Button variant="ghost" onClick={() => { setSearchValue(''); setCurrentPage(0); fetchUsers(0, '') }}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users found</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{user.name}</span>
                          {user.role === 'admin' ? (
                            <Shield className="size-4 text-amber-500 shrink-0" />
                          ) : user.role === 'support' ? (
                            <ShieldAlert className="size-4 text-blue-500 shrink-0" />
                          ) : (
                            <ShieldOff className="size-4 text-muted-foreground shrink-0" />
                          )}
                          {user.banned && <Badge variant="destructive" className="text-xs">Banned</Badge>}
                          {!user.emailVerified && <Badge variant="outline" className="text-xs">Unverified</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedUser(user)}
                        title="View details & sessions"
                      >
                        <Eye className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {users.length > 0 && (
            <div className="flex items-center justify-center gap-2 mt-6">
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
            </div>
          )}
        </CardContent>
      </Card>

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onUserDeleted={() => {}}
        onUserUpdated={() => {}}
        canManage={false}
      />
    </div>
  )
}
