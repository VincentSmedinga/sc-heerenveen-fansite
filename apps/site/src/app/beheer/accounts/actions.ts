'use server'

import { redirect } from 'next/navigation'

import { type AccountFormState } from '#src/beheer/account-fields'
import {
  addAccount,
  checkAccountValues,
  editAccount,
  findAccount,
  readAccountValues,
} from '#src/beheer/account-management'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { accountPath, accountsPath } from './paths'

// The actions of the accounts (issue 1156). Only the owner manages them, so each action asks
// for that role first: an editor or an author who sends the form anyway gets "niet gevonden".
// The number of the account is bound to the action, which Next.js keeps encrypted in the form;
// it is input from outside all the same, so the action checks it again. A form with an error
// returns with the values kept; one without ends on the page of the account with a notice.

/** Saves the form of account `accountId`. */
export async function submitAccount(
  accountId: number,
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const { userId } = await requireRole('owner')
  const id = parseItemId(accountId)
  const { db } = getDatabase()
  const target = id === undefined ? undefined : await findAccount(db, id)

  if (id === undefined || target === undefined) {
    redirect(`${accountsPath}?fout=weg`)
  }

  const values = readAccountValues(formData)
  const checked = checkAccountValues(values, target)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  const outcome = await editAccount(db, userId, id, checked.input)

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  if (outcome.status !== 'done') {
    redirect(`${accountsPath}?fout=weg`)
  }

  redirect(accountPath(id, outcome.saved ? 'opgeslagen' : 'ongewijzigd'))
}

/** Adds an account from the form. */
export async function submitNewAccount(_previous: AccountFormState, formData: FormData): Promise<AccountFormState> {
  const { userId } = await requireRole('owner')
  const values = readAccountValues(formData)
  const checked = checkAccountValues({ ...values, status: '' }, undefined)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  const outcome = await addAccount(getDatabase().db, userId, checked.input)

  if (outcome.status === 'invalid') {
    return { errors: outcome.errors, values }
  }

  redirect(outcome.status === 'created' ? accountPath(outcome.id, 'gemaakt') : accountsPath)
}
