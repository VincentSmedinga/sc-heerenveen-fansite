'use server'

import { redirect } from 'next/navigation'

import { parseItemId, parseReason } from '../../../beheer/items'
import { findMatch, saveEntry, undoEntry } from '../../../beheer/match-entries'
import { addGoalId, goalFieldId, type MatchFormState } from '../../../beheer/match-fields'
import { newGoal, readButton, readValues, validate } from '../../../beheer/match-form'
import { requireRole } from '../../../beheer/require-role'
import { getDatabase } from '../../../database'
import { matchesPath, matchPath } from './paths'

// The actions of the matches. Only a beheerder fills in a match, as with the articles. The
// number of the match is bound to the action (`submitMatch.bind(null, id)`) and is input from
// outside all the same, so each action checks it again. A form that is wrong returns to the
// form with the values kept, and one that works ends on the page of the match with a notice:
// both work without JavaScript. Adding and removing a goal are buttons of the same form, which
// the server answers with the form again.

/** Where the form for removing the entry of a match comes back to, with its error. */
export type RemoveFormState = { error?: string }

/**
 * What a button of the form of a match does: a goal is added or removed and the form comes back
 * with the values kept, or the form is checked and saved. A match that is gone ends on the list
 * with a notice.
 */
export async function submitMatch(
  matchId: number,
  _previous: MatchFormState,
  formData: FormData,
): Promise<MatchFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)
  const found = id === undefined ? undefined : await findMatch(getDatabase().db, id)

  if (id === undefined || found === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const values = readValues(formData)
  const button = readButton(formData)

  if (button.kind === 'add') {
    return {
      errors: {},
      focus: goalFieldId(values.doelpunten.length + 1, 'kant'),
      values: { ...values, doelpunten: [...values.doelpunten, newGoal()] },
    }
  }
  if (button.kind === 'remove') {
    const doelpunten = values.doelpunten.filter((_goal, index) => index + 1 !== button.number)

    return {
      errors: {},
      // The focus goes to the goal that took the place of the removed one, or else to the
      // button
      // that adds one: the button that was pressed is gone.
      focus: doelpunten.length >= button.number ? goalFieldId(button.number, 'kant') : addGoalId,
      values: { ...values, doelpunten },
    }
  }

  const checked = validate(values, {
    competition: found.match.competition,
    opponent: found.match.opponent,
    squad: found.squad,
  })

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  const outcome = await saveEntry(getDatabase().db, userId, id, checked.entry, checked.reason)

  redirect(
    outcome.status === 'missing'
      ? `${matchesPath}?fout=weg`
      : matchPath(id, outcome.status === 'saved' ? 'opgeslagen' : 'ongewijzigd'),
  )
}

/**
 * Takes the entry of a match away: the match goes back to what it was before the first entry,
 * and the import reads what Wikipedia says again. It asks for a reason, as every change does.
 */
export async function submitRemoveEntry(
  matchId: number,
  _previous: RemoveFormState,
  formData: FormData,
): Promise<RemoveFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)

  if (id === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: reason.error === 'leeg' ? 'Schrijf waarom je de invoer weghaalt.' : 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await undoEntry(getDatabase().db, userId, id, reason.reason)

  redirect(
    outcome === 'missing'
      ? `${matchesPath}?fout=weg`
      : matchPath(id, outcome === 'done' ? 'weggehaald' : 'geen-invoer'),
  )
}
