'use server'

import { redirect } from 'next/navigation'

import { parseItemId, parseReason } from '../../../beheer/items'
import { decideDifference, findDifference, findMatch, saveEntry, undoEntry } from '../../../beheer/match-entries'
import { addGoalId, goalFieldId, isUntouchedGoal, type MatchFormState, padGoals } from '../../../beheer/match-fields'
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

/** Where the form that decides a difference comes back to, with its error. */
export type ConflictFormState = { error?: string }

/** Where the form for removing the entry of a match comes back to, with its error. */
export type RemoveFormState = { error?: string }

/**
 * Decides a difference between Wikipedia and the entry of the editors: "overnemen" takes
 * Wikipedia over for that part, "houden" keeps the entry. It asks for a reason, as every change
 * does. The number of the difference is bound to the action and checked again, and one that is
 * decided already (by someone else, or by the import after seven days) ends on the list with a
 * notice.
 */
export async function submitConflict(
  changeId: number,
  _previous: ConflictFormState,
  formData: FormData,
): Promise<ConflictFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(changeId)
  const difference = id === undefined ? undefined : await findDifference(getDatabase().db, id)

  if (id === undefined || difference === undefined || difference.matchId === null) {
    redirect(`${matchesPath}?fout=besloten`)
  }

  const decision = formData.get('besluit')

  if (decision !== 'overnemen' && decision !== 'houden') {
    return { error: 'Kies of je Wikipedia overneemt of je invoer houdt.' }
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: reason.error === 'leeg' ? 'Schrijf waarom je dit beslist.' : 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await decideDifference(
    getDatabase().db,
    userId,
    id,
    decision === 'overnemen' ? 'take-over' : 'keep',
    reason.reason,
  )

  redirect(
    outcome === 'done'
      ? matchPath(difference.matchId, decision === 'overnemen' ? 'overgenomen' : 'gehouden')
      : outcome === 'no-proposal'
        ? matchPath(difference.matchId, 'niet-gelukt')
        : `${matchesPath}?fout=besloten`,
  )
}

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
      focus: goalFieldId(values.doelpunten.length + 1, 'minuut'),
      values: { ...values, doelpunten: [...values.doelpunten, newGoal()] },
    }
  }
  if (button.kind === 'remove') {
    const doelpunten = values.doelpunten.filter((_goal, index) => index + 1 !== button.number)

    return {
      errors: {},
      // The focus goes to the goal that took the place of the removed one, or else to the
      // button that adds one: the button that was pressed is gone.
      focus: doelpunten.length >= button.number ? goalFieldId(button.number, 'minuut') : addGoalId,
      values: { ...values, doelpunten },
    }
  }

  // A goal nobody filled in is a row the form made for the result, and is not a goal.
  const given = { ...values, doelpunten: values.doelpunten.filter((goal) => !isUntouchedGoal(goal)) }
  const checked = validate(given, {
    competition: found.match.competition,
    opponent: found.match.opponent,
    squad: found.squad,
  })

  if (checked.errors !== undefined) {
    // The form comes back with as many goals as the result asks for, as the page opens.
    return { errors: checked.errors, values: padGoals(given) }
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
