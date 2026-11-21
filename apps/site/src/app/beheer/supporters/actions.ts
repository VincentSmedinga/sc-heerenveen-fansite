'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { type BlockFormState, type RenameFormState } from '#src/beheer/supporter-fields'
import { blockSupporter, checkBlock, renameSupporter, unblockSupporter } from '#src/beheer/supporter-management'
import { getDatabase } from '#src/database'
import { screenNameMessage } from '#src/fans/sign-up-form'

import { supporterPath, supportersPath } from './paths'

// The actions of the editors on the accounts of supporters (issue 1458). The owner and the
// editors may do them; an author gets "niet gevonden". The number of the account is bound to
// the action, which Next.js keeps encrypted in the form; it is input from outside all the same,
// so the action checks it again. With accounts off, every action answers "niet gevonden".

/** Blocks account `accountId` with the reason of the form. */
export async function blockAccount(
  accountId: number,
  _previous: BlockFormState,
  formData: FormData,
): Promise<BlockFormState> {
  const { id, userId } = await allowed(accountId)
  const text = (name: string) => {
    const typed = formData.get(name)

    return typeof typed === 'string' ? typed : ''
  }
  const values = { reden: text('reden'), toelichting: text('toelichting') }

  if (id === undefined) {
    redirect(`${supportersPath}?fout=weg`)
  }

  const checked = checkBlock(values)

  if ('errors' in checked) {
    return { errors: checked.errors, values }
  }

  const result = await blockSupporter(getDatabase().db, userId, id, checked.reason)

  if (result === 'missing') {
    redirect(`${supportersPath}?fout=weg`)
  }

  redirect(supporterPath(id, result === 'blocked' ? 'geblokkeerd' : 'ongewijzigd'))
}

/** Changes the screen name of account `accountId`. */
export async function renameAccount(
  accountId: number,
  _previous: RenameFormState,
  formData: FormData,
): Promise<RenameFormState> {
  const { id, userId } = await allowed(accountId)
  const typed = formData.get('schermnaam')
  const value = typeof typed === 'string' ? typed : ''

  if (id === undefined) {
    redirect(`${supportersPath}?fout=weg`)
  }

  const result = await renameSupporter(getDatabase().db, userId, id, value)

  if (result.answer === 'missing') {
    redirect(`${supportersPath}?fout=weg`)
  }

  if (result.answer === 'invalid') {
    return { error: screenNameMessage(result.error), value }
  }

  redirect(supporterPath(id, result.answer === 'changed' ? 'naam' : 'ongewijzigd'))
}

/** Lifts the block of account `accountId`. */
export async function unblockAccount(accountId: number): Promise<void> {
  const { id, userId } = await allowed(accountId)

  if (id === undefined) {
    redirect(`${supportersPath}?fout=weg`)
  }

  const result = await unblockSupporter(getDatabase().db, userId, id)

  if (result === 'missing') {
    redirect(`${supportersPath}?fout=weg`)
  }

  redirect(supporterPath(id, result === 'unblocked' ? 'vrijgegeven' : 'ongewijzigd'))
}

async function allowed(accountId: number) {
  const { userId } = await requireRole('owner', 'editor')

  requireFansPart('accounts', notFound)

  const id = parseItemId(accountId)

  return { id, userId }
}
