/**
 * Promote a user to admin.
 *
 * The admin panel has no public sign-up UI ("Admin access only"), so the very
 * first admin must be promoted directly. Run against whichever driver is
 * configured in .env (DB_DRIVER=sqlite uses SQLITE_DB_PATH, otherwise pg uses
 * DATABASE_URL).
 *
 * Usage:
 *   npm run make-admin <email>
 *
 * Example:
 *   npm run make-admin admin@example.com
 */
import { config } from 'dotenv'
import { eq } from 'drizzle-orm'

config()

const email = process.argv[2]?.trim().toLowerCase()
if (!email) {
  console.error('Usage: npm run make-admin <email>')
  process.exit(1)
}

async function main() {
  const { db, schema, dbDriver } = await import('../src/utils/config')

  const [user] = await db
    .select({
      id: schema.user.id,
      name: schema.user.name,
      email: schema.user.email,
      role: schema.user.role,
    })
    .from(schema.user)
    .where(eq(schema.user.email, email))
    .limit(1)

  if (!user) {
    console.error(`User with email "${email}" not found.`)
    console.error(
      `Driver: ${dbDriver}. Check DATABASE_URL / SQLITE_DB_PATH in .env.`,
    )
    process.exit(1)
  }

  if (user.role === 'admin') {
    console.log(`"${email}" is already an admin.`)
    process.exit(0)
  }

  await db
    .update(schema.user)
    .set({ role: 'admin' })
    .where(eq(schema.user.id, user.id))

  console.log(`Promoted "${email}" (${user.id}) to admin.`)
}

main().catch((err) => {
  console.error('Failed to promote user:', err)
  process.exit(1)
})
