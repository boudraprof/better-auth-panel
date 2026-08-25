import type { AdminContext } from '../types'

/**
 * CSV escaping: wrap in quotes and double any embedded quotes. Exported for
 * tests — a malformed escape silently corrupts the exported spreadsheet.
 */
export function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export async function exportUsersCsv(ctx: AdminContext): Promise<Response> {
  const users = await ctx.db
    .select({
      id: ctx.schema.user.id,
      name: ctx.schema.user.name,
      email: ctx.schema.user.email,
      role: ctx.schema.user.role,
      emailVerified: ctx.schema.user.emailVerified,
      banned: ctx.schema.user.banned,
      banReason: ctx.schema.user.banReason,
      lastSeenAt: ctx.schema.user.lastSeenAt,
      createdAt: ctx.schema.user.createdAt,
    })
    .from(ctx.schema.user)
    .orderBy(ctx.schema.user.createdAt)

  const header =
    'ID,Name,Email,Role,Email Verified,Banned,Ban Reason,Last Seen,Created At'

  const rows = users.map((u) =>
    [
      u.id,
      csvEscape(u.name || ''),
      u.email,
      u.role,
      u.emailVerified ? 'Yes' : 'No',
      u.banned ? 'Yes' : 'No',
      csvEscape(u.banReason || ''),
      u.lastSeenAt ? new Date(u.lastSeenAt).toISOString() : '',
      new Date(u.createdAt).toISOString(),
    ].join(','),
  )

  return new Response([header, ...rows].join('\n'), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="users-export.csv"',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
