'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import {
  findRatingWindow,
  gradeField,
  parseRatings,
  ratingMatchField,
  ratingPath,
  type RatingState,
  saveRatings,
} from '#src/fans/rating'
import { requireSupporter } from '#src/fans/require-supporter'

/**
 * Stores the grades of the supporter who is logged in for the players of the last match, whose
 * number is the value of the button that sent the form (`ratingMatchField`). It answers "not
 * found" while the game is off, sends a visitor without a session to log in and a blocked
 * account to its page (`requireSupporter`), and writes only while the window is open, for an
 * account that is older than the match, and only when every player of the list has a grade
 * (`saveRatings` checks the window and the account again in the write). With a gap it returns
 * the errors and the grades that were chosen, and stores nothing. After a save it goes to the
 * page, which shows what was stored.
 */
export async function saveRatingsAction(_previous: RatingState, formData: FormData): Promise<RatingState> {
  requireFansPart('uitblinker', notFound)

  const { supporterId } = await requireSupporter({ from: ratingPath })
  const { db } = getDatabase()
  const matchId = Number(formData.get(ratingMatchField))
  const window = await findRatingWindow(db)

  if (window.state !== 'open' || window.match.id !== matchId) {
    // The grades that were chosen stay in the form, so the supporter sees what was not saved.
    return { errors: {}, failure: 'closed', values: chosenIn(formData) }
  }

  const entries = new Map(
    window.players.map((player) => [player.appearanceId, formData.get(gradeField(player.appearanceId))]),
  )
  const parsed = parseRatings(entries, window.players)

  if (parsed.errors !== undefined) {
    return { errors: parsed.errors, values: parsed.values }
  }

  const result = await saveRatings(db, { grades: parsed.grades, matchId, supporterId })

  if (result.answer === 'saved') {
    redirect(`${ratingPath}?opgeslagen=1`)
  }

  return { errors: {}, failure: result.answer, values: parsed.values }
}

/** The grades in a form, by the number of the appearance, without the list of players. */
function chosenIn(formData: FormData) {
  const chosen: Record<number, string> = {}

  for (const [name, value] of formData.entries()) {
    const found = /^cijfer-(\d+)$/.exec(name)

    if (found?.[1] !== undefined && typeof value === 'string') {
      chosen[Number(found[1])] = value.trim()
    }
  }

  return chosen
}
