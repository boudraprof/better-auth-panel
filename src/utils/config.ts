import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres'
import { drizzle as drizzleBetterSqlite } from 'drizzle-orm/better-sqlite3'
import { drizzle as drizzleLibSql } from 'drizzle-orm/libsql'
import Database from 'better-sqlite3'
import { createClient } from '@libsql/client'

import * as pgSchema from '#/db/schema'
import * as sqliteSchema from '#/db/schema-sqlite'

export const dbDriver = process.env.DB_DRIVER || 'pg'

function createPgDb() {
  return drizzlePg({
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: false,
    },
    schema: pgSchema,
  })
}

function createSqliteDb() {
  const tursoUrl = process.env.TURSO_DATABASE_URL
  const sqlitePath = process.env.SQLITE_DB_PATH || './src/db/sqlite/admin-panel.db'

  // If TURSO_DATABASE_URL is set (and starts with libsql:// or https://), use LibSQL client
  if (tursoUrl && (tursoUrl.startsWith('libsql://') || tursoUrl.startsWith('https://'))) {
    const client = createClient({
      url: tursoUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
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

// `db` is intentionally loosely typed: the concrete driver (pg vs sqlite) is
// chosen at runtime, so callers access columns through the schema instead.
export const db: any = dbDriver === 'sqlite' ? createSqliteDb() : createPgDb()

// Re-export the correct schema based on driver
export const schema = dbDriver === 'sqlite' ? sqliteSchema : pgSchema
