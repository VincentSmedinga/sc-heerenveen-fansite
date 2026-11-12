// What the forms of the accounts are made of, with nothing the browser should not load: the
// forms are client components, and they import this file. The checks and the changes, which
// need the database package, are in `account-management.ts`.

import type { AdminRole } from '@fansite/db/schema'

/** How the admin names each role (issue 1156). */
export const roleLabels: Readonly<Record<AdminRole, string>> = {
  author: 'auteur',
  editor: 'redacteur',
  owner: 'eigenaar',
}

/** The roles the admin can give: the owner is only made by the command on the host. */
export const assignableRoles = ['editor', 'author'] as const satisfies readonly AdminRole[]

export type AssignableRole = (typeof assignableRoles)[number]

/** The names of the fields, which are also their `id`: an error links to the field with it. */
export const accountFieldNames = ['voornaam', 'adres', 'rol', 'status'] as const

/**
 * The error that belongs to no field, such as a role sent for the owner's account. It has a
 * line of its own above the fields, which the list of errors links to.
 */
export const generalError = 'algemeen' as const

export type AccountErrors = Partial<Record<AccountFieldName | typeof generalError, string>>

export type AccountFieldName = (typeof accountFieldNames)[number]

/** What the form shows after a save: the errors, and the values to put back in the fields. */
export type AccountFormState = { errors: AccountErrors; values: AccountValues }

/** What the owner filled in, as text. A field that was left out is an empty string. */
export type AccountValues = Record<AccountFieldName, string>

export const emptyAccountValues: AccountValues = { adres: '', rol: '', status: '', voornaam: '' }

/** The first name, or what the admin shows for an account that has none yet. */
export function nameOf(firstName: string) {
  return firstName === '' ? 'zonder voornaam' : firstName
}
