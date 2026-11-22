'use server'

import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound, redirect } from 'next/navigation'

import { getDatabase } from '#src/database'
import {
  coachField,
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
 * (`saveRatings` checks the window and the account again in the write). The head coach of the
 * match, when it has one, needs a grade too (issue 1478). With a gap it returns
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
    const chosen = chosenIn(formData)

    return {
      ...(chosen.coach === undefined ? {} : { coachValue: chosen.coach }),
      errors: {},
      failure: 'closed',
      values: chosen.players,
    }
  }

  const entries = new Map(
    window.players.map((player) => [player.appearanceId, formData.get(gradeField(player.appearanceId))]),
  )
  const parsed = parseRatings(
    entries,
    window.players,
    window.coach === null ? undefined : { entry: formData.get(coachField), name: window.coach.name },
  )

  if (parsed.errors !== undefined) {
    return {
      ...(parsed.coachError === undefined ? {} : { coachError: parsed.coachError }),
      ...(parsed.coachValue === undefined ? {} : { coachValue: parsed.coachValue }),
      errors: parsed.errors,
      values: parsed.values,
    }
  }

  const result = await saveRatings(db, {
    ...(parsed.coachGrade === undefined ? {} : { coachGrade: parsed.coachGrade }),
    grades: parsed.grades,
    matchId,
    supporterId,
  })

  if (result.answer === 'saved') {
    redirect(`${ratingPath}?opgeslagen=1`)
  }

  return {
    ...(parsed.coachValue === undefined ? {} : { coachValue: parsed.coachValue }),
    errors: {},
    failure: result.answer,
    values: parsed.values,
  }
}

/** The grades in a form, by the number of the appearance, and the one of the coach. */
function chosenIn(formData: FormData) {
  const chosen: Record<number, string> = {}
  const coach = formData.get(coachField)

  for (const [name, value] of formData.entries()) {
    const found = /^cijfer-(\d+)$/.exec(name)

    if (found?.[1] !== undefined && typeof value === 'string') {
      chosen[Number(found[1])] = value.trim()
    }
  }

  return { coach: typeof coach === 'string' && coach.trim() !== '' ? coach.trim() : undefined, players: chosen }
}
