import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzleLibSql } from 'drizzle-orm/libsql'
import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'

import * as pgSchema from '#/db/schema'
import * as sqliteSchema from '#/db/schema-sqlite'
import { env } from '#/utils/env'

export const dbDriver = env.DB_DRIVER

function createPgDb() {
  return drizzlePg({
    connection: {
      connectionString: env.DATABASE_URL,
      ssl: false,
    },
    schema: pgSchema,
  })
}

function createSqliteDb() {
  const tursoUrl = env.TURSO_DATABASE_URL
  const sqlitePath = env.SQLITE_DB_PATH || './src/db/sqlite/admin-panel.db'

  // If TURSO_DATABASE_URL is set (and starts with libsql:// or https://), use LibSQL client
  if (tursoUrl && (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://'))) {
    const client = createClient({
      url: tursoUrl,
      authToken: env.TURSO_AUTH_TOKEN,
    })
    return drizzleLibSql(client, { schema: sqliteSchema })
  }

  // Local development fallback: use native better-sqlite3
  // Ensure the URL/path is stripped of any 'file:' prefix if passed for better-sqlite3
  const cleanPath = sqlitePath.replace(/^file:/, '')
  const sqlite = new Database(cleanPath)
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('foreign_keys = ON')
  return drizzleBetterSqlite(sqlite, { schema: sqliteSchema })
}

/**
 * Canonical database interface.
 *
 * The concrete driver (pg / better-sqlite3 / libsql) is chosen at runtime, but
 * every dialect infers the same TypeScript row shapes (`integer({mode:
 * 'timestamp'})` → Date, `integer({mode: 'boolean'})` → boolean, …), so the
 * pg instance's type serves as the single interface all three adapters
 * satisfy. The drift-check test guards that the schema files stay equivalent.
 */
export type AppDatabase = ReturnType<typeof createPgDb>

// The concrete driver (pg vs sqlite) is chosen at runtime; callers access
// columns through the re-exported `schema`.
export const db: AppDatabase =
  dbDriver === 'sqlite'
    ? (createSqliteDb() as unknown as AppDatabase)
    : createPgDb()

// Re-export the correct schema based on driver; typed as the pg shape for the
// same reason as `db` above.
export const schema = (
  dbDriver === 'sqlite' ? sqliteSchema : pgSchema
) as typeof pgSchema
