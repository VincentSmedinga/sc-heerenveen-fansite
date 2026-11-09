'use server'

import { secondSourceOf } from '@fansite/db/match-conflicts'
import { redirect } from 'next/navigation'

import type { AddFormState } from '#src/beheer/match-add-fields'

import { parseItemId, parseReason } from '#src/beheer/items'
import { addMatch, deleteAddedMatch, listClubChoices, readAddValues, validateAdd } from '#src/beheer/match-additions'
import {
  decideDifference,
  decideHeldChange,
  findDifference,
  findHeldChange,
  findMatch,
  saveEntry,
  storedEntryGoals,
  undoEntry,
} from '#src/beheer/match-entries'
import { addGoalId, goalFieldId, isUntouchedGoal, type MatchFormState, padGoals } from '#src/beheer/match-fields'
import { newGoal, readButton, readValues, validate } from '#src/beheer/match-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { matchesPath, matchPath } from './paths'

// The actions of the matches. Only a beheerder fills in a match, as with the articles. The
// number of the match is bound to the action (`submitMatch.bind(null, id)`) and is input from
// outside all the same, so each action checks it again. A form that is wrong returns to the
// form with the values kept, and one that works ends on the page of the match with a notice:
// both work without JavaScript. Adding and removing a goal are buttons of the same form, which
// the server answers with the form again.

/** Where the form that decides a difference comes back to, with its error. */
export type ConflictFormState = { error?: string }

/** Where the form that decides a held change of Wikipedia comes back to, with its error. */
export type HeldChangeFormState = { error?: string }

/** Where the form for removing the entry of a match comes back to, with its error. */
export type RemoveFormState = { error?: string }

/**
 * Adds a match that no import reads (issue 970). A form that is wrong comes back with the
 * values kept and an error at each field, and one that works ends on the form of the new match,
 * where the goals and the report are filled in as for any other match.
 */
export async function submitAddMatch(_previous: AddFormState, formData: FormData): Promise<AddFormState> {
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()
  const values = readAddValues(formData)
  const checked = validateAdd(values, await listClubChoices(db))

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  let outcome: Awaited<ReturnType<typeof addMatch>>

  try {
    outcome = await addMatch(db, userId, checked.entry)
  } catch (error) {
    console.error(`Could not add a match: ${error instanceof Error ? error.message : String(error)}`)

    return { errors: { algemeen: 'De wedstrijd is niet opgeslagen. Probeer het nog eens.' }, values }
  }

  if (outcome.status === 'refused') {
    return { errors: outcome.errors, values }
  }

  redirect(matchPath(outcome.id, 'toegevoegd'))
}

/**
 * Decides a difference between Wikipedia and the entry of the editors, or between two sources
 * of a match: "overnemen" takes the other value over for that part, "houden" keeps the match.
 * It asks for a reason, as every change does. The number of the difference is bound to the
 * action and checked again, and one that is decided already (by someone else, or by the import
 * after seven days) ends on the list with a notice.
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
      ? matchPath(
          difference.matchId,
          // A difference between two sources (#974) has its own notice: no entry is involved.
          `${secondSourceOf(difference.reason) === undefined ? '' : 'bron-'}${decision === 'overnemen' ? 'overgenomen' : 'gehouden'}`,
        )
      : outcome === 'no-proposal'
        ? matchPath(difference.matchId, 'niet-gelukt')
        : `${matchesPath}?fout=besloten`,
  )
}

/**
 * Deletes a match the editors added, after the reason is given. Only a match with the source
 * `redactie` goes: the answer for any other match is the page of the match with a notice.
 */
export async function submitDeleteMatch(
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
      error: reason.error === 'leeg' ? 'Schrijf waarom je de wedstrijd verwijdert.' : 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await deleteAddedMatch(getDatabase().db, userId, id, reason.reason)

  redirect(
    outcome === 'missing'
      ? `${matchesPath}?fout=weg`
      : outcome === 'not-ours'
        ? matchPath(id, 'niet-van-ons')
        : `${matchesPath}?gedaan=wedstrijd-weg`,
  )
}

/**
 * Decides a change that Wikipedia holds back: "overnemen" makes the match what Wikipedia says
 * now (or removes it, when the page does not name it any more), "afwijzen" leaves the match as
 * it is. It asks for a reason, as every change does. The number of the change is bound to the
 * action and checked again, and one that is decided already (by someone else, by the command or
 * by the import after seven days) or whose match is gone ends on the list with a notice.
 */
export async function submitHeldChange(
  changeId: number,
  _previous: HeldChangeFormState,
  formData: FormData,
): Promise<HeldChangeFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(changeId)
  const change = id === undefined ? undefined : await findHeldChange(getDatabase().db, id)

  if (id === undefined || change === undefined) {
    redirect(`${matchesPath}?fout=besloten`)
  }

  const decision = formData.get('besluit')

  if (decision !== 'overnemen' && decision !== 'afwijzen') {
    return { error: 'Kies of je Wikipedia overneemt of de wijziging afwijst.' }
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: reason.error === 'leeg' ? 'Schrijf waarom je dit beslist.' : 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await decideHeldChange(
    getDatabase().db,
    userId,
    id,
    decision === 'overnemen' ? 'take-over' : 'keep',
    reason.reason,
  )

  redirect(
    outcome === 'done'
      ? decision === 'overnemen' && change.newValue === null
        ? `${matchesPath}?gedaan=verwijderd`
        : matchPath(change.matchId, decision === 'overnemen' ? 'wikipedia-overgenomen' : 'wijziging-afgewezen')
      : outcome === 'no-proposal'
        ? matchPath(change.matchId, 'wijziging-niet-gelukt')
        : outcome === 'gone'
          ? `${matchesPath}?fout=weg`
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

  // The goals of a match with a report are the report's: the form shows them, and sends none.
  const values = found.hasReport ? { ...readValues(formData), doelpunten: [] } : readValues(formData)
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
    dataSource: found.match.dataSource,
    opponent: found.match.opponent,
    squad: found.squad,
  })

  if (checked.errors !== undefined) {
    // The form comes back with as many goals as the result asks for, as the page opens.
    return { errors: checked.errors, values: found.hasReport ? given : padGoals(given) }
  }
  // A match with a report is played, or still being played: it is `scheduled` until the button
  // "Wedstrijd afgelopen" or the import gives it a result.
  const keepsReport =
    checked.entry.result.status === 'played' ||
    (checked.entry.result.status === 'scheduled' && found.match.status === 'scheduled')

  if (found.hasReport && !keepsReport) {
    return {
      errors: {
        status: 'Een wedstrijd met een verslag blijft gespeeld, of wordt nog gespeeld. Haal eerst het verslag weg.',
      },
      values: given,
    }
  }

  // The goals stay what the report made them.
  const entry = found.hasReport ? { ...checked.entry, goals: storedEntryGoals(found.goals) } : checked.entry
  const outcome = await saveEntry(getDatabase().db, userId, id, entry, checked.reason)

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
