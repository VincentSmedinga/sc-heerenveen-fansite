import type { Database } from '@fansite/db/client'

import { adminLoginLinks, type AdminRole, adminRoles, adminSessions, adminUsers } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

// The accounts of the admin, and the two commands that manage them on the host (see admin-command.ts). This file and what
// it imports have to run under plain Node without a build, so the imports name their `.ts` files.

/** The longest an email address can be (RFC 5321). */
const maxAddressLength = 254

const address = /^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/

/**
 * Makes the account for an address, or turns a disabled one on again with the role given. An account that is on already
 * is not changed: the result says so. The sessions of an account that was turned off are gone, so it logs in again.
 */
export async function createAccount(db: Database, email: string, role: AdminRole, now = new Date()) {
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email))

  if (existing === undefined) {
    await db.insert(adminUsers).values({ createdAt: now, email, role })

    return 'created' as const
  }

  if (existing.disabledAt === null) {
    return 'exists' as const
  }

  await db.update(adminUsers).set({ disabledAt: null, role }).where(eq(adminUsers.id, existing.id))

  return 'enabled' as const
}

/** Whether a string is one of the roles of the admin. */
export function isAdminRole(value: string): value is AdminRole {
  return (adminRoles as readonly string[]).includes(value)
}

/**
 * The address as the accounts keep it: without spaces around it and in lowercase, or `undefined` when it isn't exactly one
 * email address. A comma, a semicolon or a new line never passes, so one value can't name two recipients.
 */
export function normaliseEmail(value: string) {
  const email = value.trim().toLowerCase()

  return email.length <= maxAddressLength && address.test(email) ? email : undefined
}

/**
 * Turns an account off and removes its sessions and unused login links, so a session that is open stops working at once.
 * The row stays, so the address can't log in and nobody confuses it with an address that never had an account.
 */
export async function revokeAccount(db: Database, email: string, now = new Date()) {
  const [account] = await db.select().from(adminUsers).where(eq(adminUsers.email, email))

  if (account === undefined) {
    return { result: 'unknown' as const }
  }

  const sessions = await db.delete(adminSessions).where(eq(adminSessions.userId, account.id))

  await db
    .update(adminUsers)
    .set({ disabledAt: account.disabledAt ?? now })
    .where(eq(adminUsers.id, account.id))

  await db.delete(adminLoginLinks).where(eq(adminLoginLinks.userId, account.id))

  return {
    result: account.disabledAt === null ? ('revoked' as const) : ('already-off' as const),
    sessions: sessions[0].affectedRows,
  }
}
