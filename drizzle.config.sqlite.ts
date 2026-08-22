import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config()

export default defineConfig({
  out: './drizzle',
  schema: './src/db/schema-sqlite.ts',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL || process.env.SQLITE_DB_PATH || 'file:./src/db/sqlite/admin-panel.db',
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
})
