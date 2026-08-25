import { describe, expect, it } from 'vitest'
import { getTableColumns, getTableName } from 'drizzle-orm'
import type { Column, Table } from 'drizzle-orm'

import * as pgSchema from '#/db/schema'
import * as sqliteSchema from '#/db/schema-sqlite'

/**
 * Drift check between the two hand-maintained dialect schemas
 * (src/db/schema.ts for Postgres, src/db/schema-sqlite.ts for SQLite).
 *
 * The two files must describe the same logical database: identical tables,
 * identical column names, identical nullability. Type mappings intentionally
 * differ by dialect (`timestamp` vs `integer({mode:'timestamp'})`, etc.) and
 * are NOT compared.
 */

function isTable(value: unknown): value is Table {
  return (
    typeof value === 'object' &&
    value !== null &&
    Symbol.for('drizzle:Name') in (value as object)
  )
}

function tables(schema: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(schema).filter(([, v]) => isTable(v)),
  ) as Record<string, Table>
}

function columnsOf(table: Table) {
  const cols = Object.values(getTableColumns(table)) as unknown as Column[]
  return cols.map((c) => ({
    name: c.name,
    notNull: c.notNull,
    isPrimaryKey: c.primary,
  }))
}

describe('schema drift between dialects', () => {
  const pg = tables(pgSchema)
  const sqlite = tables(sqliteSchema)

  it('exposes the same set of tables', () => {
    const pgNames = Object.values(pg)
      .map(getTableName)
      .sort()
    const sqliteNames = Object.values(sqlite)
      .map(getTableName)
      .sort()
    expect(sqliteNames).toEqual(pgNames)
  })

  it('uses the same export keys in both dialects', () => {
    expect(Object.keys(sqlite).sort()).toEqual(Object.keys(pg).sort())
  })

  it.each(Object.keys(tables(pgSchema)))(
    'table "%s" has matching columns in both dialects',
    (key) => {
      expect(columnsOf(sqlite[key])).toEqual(columnsOf(pg[key]))
    },
  )
})
