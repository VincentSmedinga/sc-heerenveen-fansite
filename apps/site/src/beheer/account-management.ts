import type { Database } from '@fansite/db/client'

import { recordAction } from '@fansite/db/audit-log'
import { adminLoginLinks, type AdminRole, adminSessions, adminUsers, firstNameMaxLength } from '@fansite/db/schema'
import { asc, eq } from 'drizzle-orm'

import {
  type AccountErrors,
  type AccountValues,
  type AssignableRole,
  assignableRoles,
  generalError,
  roleLabels,
} from './account-fields'
import { normaliseEmail, normaliseFirstName } from './accounts'

// The accounts as the owner manages them in the admin (issue 1156): the list, adding one and
// changing one. Each change writes a line in the log in the same transaction, with the number
// of the account and what changed, never an address. A new address or turning an account off
// ends its sessions and login links at once. The owner's own account stays owner and stays on:
// only the command on the host gives or takes that role.

/** What the owner asked for, checked. */
export type AccountInput = {
  email: string
  firstName: string
  /** Empty for the owner's own account, which keeps its role. */
  role: AssignableRole | undefined
  /** Empty for a new account, which is on, and for the owner's account, which stays on. */
  status: 'aan' | 'uit' | undefined
}

/** What a save did. */
export type AccountOutcome =
  | { errors: AccountErrors; status: 'invalid' }
  | { id: number; status: 'created' }
  | { saved: boolean; status: 'done' }
  | { status: 'missing' }

/** An account as the list and the form show it. */
export type AccountRow = {
  /** Whether an owner or an editor gets the mail about a difference with Wikipedia. */
  conflictMail: boolean
  disabled: boolean
  email: string
  firstName: string
  id: number
  role: AdminRole
}

const messages = {
  addressTaken: 'Dit adres hoort al bij een ander account. Kies een ander adres.',
  noAddress: 'Vul één e-mailadres in, zoals naam@voorbeeld.nl.',
  noName: `Vul een voornaam in, hoogstens ${firstNameMaxLength} tekens.`,
  noRole: 'Kies redacteur of auteur.',
  noStatus: 'Kies aan of uit.',
  owner: 'Het account van de eigenaar houdt zijn rol en blijft aan. Er is niets veranderd.',
} as const

/**
 * Adds an account, which is on, and writes `account.create`. There is no mail: the person logs
 * in with a login link. An address that another account has is an error at the field.
 */
export async function addAccount(
  db: Database,
  userId: number,
  input: AccountInput,
  now = new Date(),
): Promise<AccountOutcome> {
  const role = input.role

  if (role === undefined) {
    return { errors: { rol: messages.noRole }, status: 'invalid' }
  }

  try {
    return await db.transaction(async (transaction) => {
      const [taken] = await transaction
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, input.email))

      if (taken !== undefined) {
        return { errors: { adres: messages.addressTaken }, status: 'invalid' } as const
      }

      const [result] = await transaction
        .insert(adminUsers)
        .values({ createdAt: now, email: input.email, firstName: input.firstName, role })

      await recordAction(
        transaction,
        { action: 'account.create', detail: `rol: ${roleLabels[role]}`, itemId: result.insertId, userId },
        now,
      )

      return { id: result.insertId, status: 'created' } as const
    })
  } catch (error) {
    if (isDuplicate(error)) {
      return { errors: { adres: messages.addressTaken }, status: 'invalid' }
    }

    throw error
  }
}

/**
 * Checks the values for a new account (`target` empty) or for the account `target`. The
 * owner's account has no role and no status in its form: a request that sends one anyway is
 * refused with an error that belongs to no field, so a crafted request can't make the owner an
 * editor or turn him off.
 */
export function checkAccountValues(
  values: AccountValues,
  target: Pick<AccountRow, 'role'> | undefined,
): { errors: AccountErrors; input?: never } | { errors?: never; input: AccountInput } {
  const errors: AccountErrors = {}
  const firstName = normaliseFirstName(values.voornaam)
  const email = normaliseEmail(values.adres)
  const forOwner = target?.role === 'owner'

  if (forOwner && (values.rol !== '' || values.status !== '')) {
    return { errors: { [generalError]: messages.owner } }
  }

  if (firstName === undefined) {
    errors.voornaam = messages.noName
  }

  if (email === undefined) {
    errors.adres = messages.noAddress
  }

  const role = (assignableRoles as readonly string[]).includes(values.rol) ? (values.rol as AssignableRole) : undefined

  if (!forOwner && role === undefined) {
    errors.rol = messages.noRole
  }

  const status = values.status === 'aan' || values.status === 'uit' ? values.status : undefined

  if (target !== undefined && !forOwner && status === undefined) {
    errors.status = messages.noStatus
  }

  if (firstName === undefined || email === undefined || Object.keys(errors).length > 0) {
    return { errors }
  }

  return { input: { email, firstName, role: forOwner ? undefined : role, status: forOwner ? undefined : status } }
}

/**
 * Changes the first name, the address and the role of account `id`, and turns it on or off.
 * It writes `account.edit` for what changed in the first name, the address and the role, and
 * `account.disable` or `account.enable` for turning it off or on. A new address and turning it
 * off remove its sessions and login links in the same transaction. The owner's account keeps
 * its role and stays on, whatever the input says.
 */
export async function editAccount(
  db: Database,
  userId: number,
  id: number,
  input: AccountInput,
  now = new Date(),
): Promise<AccountOutcome> {
  try {
    return await db.transaction(async (transaction) => {
      const [row] = await transaction.select().from(adminUsers).where(eq(adminUsers.id, id)).for('update')

      if (row === undefined) {
        return { status: 'missing' } as const
      }

      const isOwner = row.role === 'owner'

      if (isOwner && (input.role !== undefined || input.status !== undefined)) {
        return { errors: { [generalError]: messages.owner }, status: 'invalid' } as const
      }

      const [taken] = await transaction
        .select({ id: adminUsers.id })
        .from(adminUsers)
        .where(eq(adminUsers.email, input.email))

      if (taken !== undefined && taken.id !== id) {
        return { errors: { adres: messages.addressTaken }, status: 'invalid' } as const
      }

      const role = isOwner ? row.role : (input.role ?? row.role)
      const wasOff = row.disabledAt !== null
      const turnOff = !isOwner && input.status === 'uit' && !wasOff
      const turnOn = !isOwner && input.status === 'aan' && wasOff
      const newAddress = input.email !== row.email
      const changes = [
        ...(input.firstName === row.firstName ? [] : ['voornaam gewijzigd']),
        ...(newAddress ? ['adres gewijzigd'] : []),
        ...(role === row.role ? [] : [`rol: ${roleLabels[row.role]} → ${roleLabels[role]}`]),
      ]

      if (changes.length === 0 && !turnOff && !turnOn) {
        return { saved: false, status: 'done' } as const
      }

      await transaction
        .update(adminUsers)
        .set({
          disabledAt: turnOff ? now : turnOn ? null : row.disabledAt,
          email: input.email,
          firstName: input.firstName,
          role,
        })
        .where(eq(adminUsers.id, id))

      if (newAddress || turnOff) {
        await transaction.delete(adminSessions).where(eq(adminSessions.userId, id))
        await transaction.delete(adminLoginLinks).where(eq(adminLoginLinks.userId, id))
      }

      if (changes.length > 0) {
        await recordAction(transaction, { action: 'account.edit', detail: changes.join('; '), itemId: id, userId }, now)
      }

      if (turnOff || turnOn) {
        await recordAction(
          transaction,
          { action: turnOff ? 'account.disable' : 'account.enable', itemId: id, userId },
          now,
        )
      }

      return { saved: true, status: 'done' } as const
    })
  } catch (error) {
    if (isDuplicate(error)) {
      return { errors: { adres: messages.addressTaken }, status: 'invalid' }
    }

    throw error
  }
}

/** The account with this number, or `undefined` for none. */
export async function findAccount(db: Pick<Database, 'select'>, id: number): Promise<AccountRow | undefined> {
  const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id))

  return row === undefined
    ? undefined
    : {
        conflictMail: row.conflictMail,
        disabled: row.disabledAt !== null,
        email: row.email,
        firstName: row.firstName,
        id,
        role: row.role,
      }
}

/** Every account, the owner first and then in the order they were made. */
export async function listAccounts(db: Pick<Database, 'select'>): Promise<AccountRow[]> {
  const rows = await db.select().from(adminUsers).orderBy(asc(adminUsers.id))

  return rows
    .map((row) => ({
      conflictMail: row.conflictMail,
      disabled: row.disabledAt !== null,
      email: row.email,
      firstName: row.firstName,
      id: row.id,
      role: row.role,
    }))
    .toSorted((a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'))
}

/** The values of the form, as text. A field that was left out is an empty string. */
export function readAccountValues(formData: FormData): AccountValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }

  return { adres: text('adres'), rol: text('rol'), status: text('status'), voornaam: text('voornaam') }
}

/**
 * Turns the mail about a difference with Wikipedia on or off for one's own account, and writes
 * `account.edit`. An author never gets the mail, so his choice is not kept. Returns whether
 * something changed.
 */
export async function setConflictMail(db: Database, userId: number, on: boolean, now = new Date()) {
  return db.transaction(async (transaction) => {
    const [row] = await transaction.select().from(adminUsers).where(eq(adminUsers.id, userId)).for('update')

    if (row === undefined || row.role === 'author' || row.conflictMail === on) {
      return false
    }

    await transaction.update(adminUsers).set({ conflictMail: on }).where(eq(adminUsers.id, userId))
    await recordAction(
      transaction,
      {
        action: 'account.edit',
        detail: `mail over afwijkingen van Wikipedia ${on ? 'aan' : 'uit'}`,
        itemId: userId,
        userId,
      },
      now,
    )

    return true
  })
}

/** Whether the error is the database refusing a second account with the same address. */
function isDuplicate(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const { cause, code, errno } = error as { cause?: unknown; code?: unknown; errno?: unknown }

  return code === 'ER_DUP_ENTRY' || errno === 1062 || isDuplicate(cause)
}
