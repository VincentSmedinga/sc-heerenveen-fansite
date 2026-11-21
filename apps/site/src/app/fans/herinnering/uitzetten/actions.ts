'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import { reminderOffPaths, turnOffWithCode } from '#src/fans/reminder'

/**
 * The button "Herinnering uitzetten" of the link in a reminder: it turns the reminder off for
 * the supporter in the code, without logging in. It answers "not found" while the game is off.
 * A wrong or expired code changes nothing and goes back to the page, which says so.
 */
export async function turnOffReminder(formData: FormData) {
  requireFansPart('prognose', notFound)

  const code = formData.get('code')
  const done = await turnOffWithCode(getDatabase().db, code)

  redirect(
    done
      ? reminderOffPaths.done
      : `${reminderOffPaths.page}?code=${encodeURIComponent(typeof code === 'string' ? code : '')}`,
  )
}
