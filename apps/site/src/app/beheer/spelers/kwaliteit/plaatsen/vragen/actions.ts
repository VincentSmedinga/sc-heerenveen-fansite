'use server'

import { redirect } from 'next/navigation'

import { adminFailure } from '#src/beheer/failure'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { answerSide, isSide, parseSkipped, sideQuizAddress } from '#src/beheer/side-quiz'
import { getDatabase } from '#src/database'

/**
 * The answer to a question of the quiz (issue 1194): Links, Midden or Rechts gives the person
 * that side and goes on to the next player; Overslaan only goes on, and keeps the player out of
 * the quiz until the page is opened again. The player and the skipped players are bound to the
 * action and are input from outside all the same, so they are checked again. Only an editor
 * answers. A save that fails ends on the quiz with the player skipped, so the quiz goes on.
 */
export async function submitSide(person: number, over: string, formData: FormData) {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const personId = parseItemId(person)
  const answer = formData.get('knop')
  const skipped = parseSkipped(over)

  if (personId === undefined) {
    redirect(sideQuizAddress(skipped))
  }

  let saved = false

  if (isSide(answer)) {
    try {
      saved = await answerSide(db, userId, personId, answer)
    } catch (error) {
      console.error(adminFailure(`set the side of person ${personId}`, error))
    }
  }

  redirect(saved ? sideQuizAddress(skipped, personId) : sideQuizAddress([...new Set([...skipped, personId])]))
}
