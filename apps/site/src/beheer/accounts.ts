import type { Database } from '@fansite/db/client'

import {
  adminLoginLinks,
  type AdminRole,
  adminRoles,
  adminSessions,
  adminUsers,
  firstNameMaxLength,
} from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

// The accounts of the admin, and the two commands that manage them on the host (see
// admin-command.ts). This file and what it imports have to run under plain Node without a
// build, so the imports name their `.ts` files.

/** The longest an email address can be (RFC 5321). */
const maxAddressLength = 254

const address = /^[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+$/

/** What `createAccount` did. */
export type CreateResult = 'changed' | 'created' | 'enabled' | 'exists' | 'needs-name'

/**
 * Makes the account for an address, or gives an account that exists the role, and the first
 * name when one is given. An account that was turned off is turned on again; its sessions are
 * gone, so it logs in again. A new account needs a first name. It is the only way to make an
 * owner: the admin can't give or take that role (issue 1156).
 */
export async function createAccount(
  db: Database,
  email: string,
  role: AdminRole,
  firstName: string | undefined,
  now = new Date(),
): Promise<CreateResult> {
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email))

  if (existing === undefined) {
    if (firstName === undefined) {
      return 'needs-name'
    }

    await db.insert(adminUsers).values({ createdAt: now, email, firstName, role })

    return 'created'
  }

  const name = firstName ?? existing.firstName

  if (existing.disabledAt === null && existing.role === role && existing.firstName === name) {
    return 'exists'
  }

  await db.update(adminUsers).set({ disabledAt: null, firstName: name, role }).where(eq(adminUsers.id, existing.id))

  return existing.disabledAt === null ? 'changed' : 'enabled'
}

/** Whether a string is one of the roles of the admin. */
export function isAdminRole(value: string): value is AdminRole {
  return (adminRoles as readonly string[]).includes(value)
}

/**
 * The address as the accounts keep it: without spaces around it and in lowercase, or
 * `undefined` when it isn't exactly one email address. A comma, a semicolon or a new line never
 * passes, so one value can't name two recipients.
 */
export function normaliseEmail(value: string) {
  const email = value.trim().toLowerCase()

  return email.length <= maxAddressLength && address.test(email) ? email : undefined
}

/**
 * The first name as the accounts keep it: without spaces around it and with one space between
 * words, or `undefined` when it is empty, too long or has a character that is no text, such as
 * a new line.
 */
export function normaliseFirstName(value: string) {
  const name = value.trim().replaceAll(/\s+/gu, ' ')

  return name === '' || name.length > firstNameMaxLength || /\p{C}/u.test(name) ? undefined : name
}

/**
 * Turns an account off and removes its sessions and unused login links, so a session that is
 * open stops working at once. The row stays, so the address can't log in and nobody confuses it
 * with an address that never had an account.
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
