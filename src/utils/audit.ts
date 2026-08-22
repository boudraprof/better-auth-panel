import { eq } from 'drizzle-orm'
import { db, schema } from '#/utils/config'
import logger from '#/utils/logger'

type AuditEntry = {
  actorId: string
  action: string
  targetId?: string | null
  metadata?: Record<string, unknown>
  request?: Request
}

/**
 * Append an entry to the audit_log table. Best-effort: a logging failure must
 * never break the admin action it describes, so errors are swallowed (but
 * logged to the server console for visibility).
 */
export async function audit(entry: AuditEntry): Promise<void> {
  try {
    let actorEmail: string | null = null
    let targetEmail: string | null = null

    if (entry.actorId) {
      const rows = await db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, entry.actorId))
        .limit(1)
      actorEmail = rows[0]?.email ?? null
    }
    if (entry.targetId) {
      const rows = await db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, entry.targetId))
        .limit(1)
      targetEmail = rows[0]?.email ?? null
    }

    const req = entry.request
    const ipAddress = req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
    const userAgent = req?.headers.get('user-agent') ?? null

    await db.insert(schema.auditLog).values({
      actorId: entry.actorId,
      actorEmail,
      action: entry.action,
      targetId: entry.targetId ?? null,
      targetEmail,
      metadata: entry.metadata ? JSON.stringify(entry.metadata) : null,
      ipAddress,
      userAgent,
    })
  } catch (err) {
    logger.error('Failed to write audit entry', err, 'Audit')
  }
}
