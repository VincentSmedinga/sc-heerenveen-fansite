import { type AnyColumn, sql } from 'drizzle-orm'

/**
 * How the admin names the account that did something, such as who hid an item or saved a
 * version: its first name, or its address while it has none (issue 1156). It is only shown in
 * the admin, never on the public site. `table` is `adminUsers` or an alias of it.
 */
export function accountName(table: { email: AnyColumn; firstName: AnyColumn }) {
  return sql<string>`COALESCE(NULLIF(${table.firstName}, ''), ${table.email})`
}
