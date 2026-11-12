'use server'

import { editorRoles } from '@fansite/db/schema'
import { redirect } from 'next/navigation'

import { setConflictMail } from '#src/beheer/account-management'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { myAccountPath } from './paths'

/**
 * Turns the mail about a difference with Wikipedia on or off for the account that is logged in
 * (issue 1156). Only an owner or an editor gets that mail, so an author is refused. A value
 * that is neither `aan` nor `uit` changes nothing.
 */
export async function submitConflictMail(formData: FormData) {
  const { userId } = await requireRole(...editorRoles)
  const choice = formData.get('mail')

  if (choice !== 'aan' && choice !== 'uit') {
    redirect(`${myAccountPath}?gedaan=ongewijzigd`)
  }

  const changed = await setConflictMail(getDatabase().db, userId, choice === 'aan')

  redirect(`${myAccountPath}?gedaan=${changed ? 'opgeslagen' : 'ongewijzigd'}`)
}
