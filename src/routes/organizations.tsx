import { useCallback, useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Building2, Loader2, RefreshCw, Trash2, Users } from 'lucide-react'
import { toast } from 'react-toastify'

import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card'
import { Button } from '#/components/ui/button'
import { Badge } from '#/components/ui/badge'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog'
import { adminMiddleware } from '#/middleware/admin'
import api from '#/utils/axios'
import {  isDemoMode } from '#/utils/utils'
import type { Organization, OrgMember } from '#/types'
import { DEMO_MODE_MESSAGE } from '#/utils/constants'



export const Route = createFileRoute('/organizations')({
  server: {
    middleware: [adminMiddleware],
  },
  component: OrganizationsPage,
})

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
  admin: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  member: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
}

function OrganizationsPage() {
  const [orgs, setOrgs] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [membersOrg, setMembersOrg] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const demoMode = isDemoMode()

  const showDemoModeMessage = () => {
    toast.info(DEMO_MODE_MESSAGE)
  }

  const fetchOrgs = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get<{ data?: Organization[] }>('/admin/organizations')
      setOrgs(data.data || [])
    } catch {
      toast.error('Failed to fetch organizations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  const openMembers = async (org: Organization) => {
    setMembersOrg(org)
    setMembers([])
    setMembersLoading(true)
    try {
      const { data } = await api.get<{ data?: OrgMember[] }>('/admin/organizations/members', {
        params: { orgId: org.id },
      })
      setMembers(data.data || [])
    } catch {
      toast.error('Failed to fetch members')
    } finally {
      setMembersLoading(false)
    }
  }

  const handleDelete = async (org: Organization) => {
    if (demoMode) {
      showDemoModeMessage()
      return
    }
    setDeletingId(org.id)
    try {
      await api.post('/admin/organizations/delete', { orgId: org.id })
      toast.success(`Deleted ${org.name}`)
      setOrgs((prev) => prev.filter((o) => o.id !== org.id))
    } catch {
      toast.error('Failed to delete organization')
    } finally {
      setDeletingId(null)
    }
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
          <h1 className="text-3xl font-bold">Organizations</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrgs} disabled={loading}>
          <RefreshCw className={'size-4 mr-1 ' + (loading ? 'animate-spin' : '')} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="size-4" />
            All Organizations
            {orgs.length > 0 && (
              <Badge variant="secondary" className="text-xs">{orgs.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : orgs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No organizations yet. Users can create them via the organization plugin.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Name</th>
                    <th className="pb-2 pr-4 font-medium">Slug</th>
                    <th className="pb-2 pr-4 font-medium">Members</th>
                    <th className="pb-2 pr-4 font-medium">Created</th>
                    <th className="pb-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orgs.map((org) => (
                    <tr key={org.id} className="border-b last:border-0 hover:bg-accent/40">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          {org.logo ? (
                            <img
                              src={org.logo}
                              alt=""
                              className="size-8 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                              <Building2 className="size-4" />
                            </div>
                          )}
                          <span className="font-medium">{org.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <code className="text-xs">{org.slug}</code>
                      </td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="text-xs">{org.memberCount}</Badge>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {new Date(org.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMembers(org)}
                          >
                            <Users className="size-3.5 mr-1" />
                            Members
                          </Button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                                <Trash2 className="size-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete {org.name}?</DialogTitle>
                                <DialogDescription>
                                  This permanently removes the organization, its {org.memberCount} member{org.memberCount !== 1 ? 's' : ''}, teams and invitations. This cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <DialogClose asChild>
                                  <Button variant="outline">Cancel</Button>
                                </DialogClose>
                                <DialogClose asChild>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleDelete(org)}
                                    disabled={deletingId === org.id}
                                  >
                                    {deletingId === org.id ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-4 mr-1" />
                                    )}
                                    Delete
                                  </Button>
                                </DialogClose>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Members dialog */}
      <Dialog open={membersOrg !== null} onOpenChange={(open) => !open && setMembersOrg(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Members — {membersOrg?.name}</DialogTitle>
            <DialogDescription>
              {members.length} member{members.length !== 1 ? 's' : ''} in this organization
            </DialogDescription>
          </DialogHeader>
          {membersLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No members</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {m.image ? (
                      <img src={m.image} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                        {(m.name || m.email).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name || m.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      'ml-3 shrink-0 border ' + (ROLE_STYLES[m.role] || 'bg-muted text-muted-foreground border-border')
                    }
                  >
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
