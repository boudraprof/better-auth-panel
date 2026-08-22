import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'

// Load the panel env so DATABASE_URL / SQLITE_DB_PATH are available for the
// DB promote below.
config({ path: fileURLToPath(new URL('../.env', import.meta.url)) })

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'admin.e2e@example.com'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'password123'
const BASE_URL = process.env.E2E_ADMIN_BASE_URL || 'http://localhost:8000'

/**
 * Promote a user to admin in the configured database (sqlite or pg).
 * Mirrors scripts/make-admin.ts so e2e provisioning works on either driver.
 */
async function promoteToAdmin(email: string) {
  const dbDriver = process.env.DB_DRIVER || 'pg'

  if (dbDriver === 'sqlite') {
    const Database = (await import('better-sqlite3')).default
    const { drizzle } = await import('drizzle-orm/better-sqlite3')
    const { eq } = await import('drizzle-orm')
    const schema = await import('../src/db/schema-sqlite.ts')

    // Keep this fallback in sync with src/utils/config.ts and
    // drizzle.config.sqlite.ts so e2e resolves the same file.
    const sqlite = new Database(process.env.SQLITE_DB_PATH || './src/db/sqlite/admin-panel.db')
    const db = drizzle(sqlite, { schema })
    const result = db
      .update(schema.user)
      .set({ role: 'admin', banned: false })
      .where(eq(schema.user.email, email))
      .run()
    if (result.changes === 0) {
      throw new Error(`E2E admin user ${email} not found after sign-up`)
    }
    return
  }

  const { Client } = await import('pg')
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()
  try {
    const result = await client.query(
      `UPDATE "user" SET role = 'admin', banned = false WHERE email = $1 RETURNING id`,
      [email],
    )
    if (result.rowCount === 0) {
      throw new Error(`E2E admin user ${email} not found after sign-up`)
    }
  } finally {
    await client.end()
  }
}

/**
 * Playwright globalSetup: guarantees the admin test account exists and is an
 * admin.
 *
 * The admin panel has no public sign-up UI ("Admin access only"), so the user
 * is provisioned through the panel's own sign-up API and then promoted via a
 * direct DB update (we can't create the user by password hash from raw SQL).
 * Idempotent: duplicate sign-ups return 422 USER_ALREADY_EXISTS, which is
 * treated as success; the DB update is a plain upsert.
 */
export default async function globalSetup() {
  const res = await fetch(`${BASE_URL}/api/v1/auth/sign-up/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // undici always sends `sec-fetch-mode: cors`, which makes better-auth
      // force the origin check — send a trusted Origin explicitly.
      Origin: new URL(BASE_URL).origin,
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: 'E2E Admin',
    }),
  })

  if (!res.ok && res.status !== 422) {
    throw new Error(
      `Failed to provision e2e admin (${res.status}): ${await res.text()}`,
    )
  }

  await promoteToAdmin(ADMIN_EMAIL)
}
