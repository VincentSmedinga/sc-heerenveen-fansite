'use server'

import { redirect } from 'next/navigation'

import { matchesPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId, parseReason } from '#src/beheer/items'
import {
  contextOf,
  findPreviousLineUp,
  findReportScreen,
  finishMatch,
  removeReport,
  saveReport,
} from '#src/beheer/match-reports'
import {
  applyReportButton,
  isEmptyLineUp,
  listId,
  readReportButton,
  readReportValues,
  type ReportFormState,
} from '#src/beheer/report-fields'
import { checkReportForm } from '#src/beheer/report-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// The actions of the screen of a match report. Only a beheerder fills in a report, as with the
// matches. The number of the match is bound to the action and is input from outside all the
// same, so each action checks it again. A form that is wrong returns to the form with the
// values kept, and one that works ends on the screen with a notice: both work without
// JavaScript. Adding and removing a row are buttons of the same form, which the server answers
// with the form again.

/** Where the form that ends the match comes back to, with an error for each score. */
export type FinishFormState = {
  errors?: Partial<Record<'uitslag-wij' | 'uitslag-zij', string>>
  /** What the editor typed, which the form shows again with the errors. */
  values?: Record<'uitslag-wij' | 'uitslag-zij', string>
}

/** Where the form for taking the report away comes back to, with its error. */
export type RemoveReportFormState = { error?: string }

/**
 * Takes the report of a match away: its rows go and the goals go back to what Wikipedia said.
 * It asks for a reason, as every change does.
 */
export async function submitRemoveReport(
  matchId: number,
  _previous: RemoveReportFormState,
  formData: FormData,
): Promise<RemoveReportFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)

  if (id === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const reason = parseReason(formData.get('reden'))

  if ('error' in reason) {
    return {
      error: reason.error === 'leeg' ? 'Schrijf waarom je het verslag weghaalt.' : 'Schrijf hoogstens 300 tekens.',
    }
  }

  const outcome = await removeReport(getDatabase().db, userId, id, reason.reason)

  redirect(
    outcome === 'missing'
      ? `${matchesPath}?fout=weg`
      : reportPath(id, outcome === 'done' ? 'weggehaald' : 'geen-verslag'),
  )
}

/**
 * What a button of the form does: a row is added or removed and the form comes back with the
 * values kept, or the report is checked and saved. A report that can not be stored comes back
 * with its errors and is not saved. One that can be stored is saved as `klaar` only when the
 * rules have nothing to say; otherwise it is saved as `bezig` and the screen says why. A match
 * that is gone, or was not played, ends on the list with a notice. `basis` is what stands for
 * the report the form was opened on (`reportBasis`): a report that changed since is not
 * overwritten, and the form comes back with what was typed. The page binds it to the action.
 */
export async function submitReport(
  matchId: number,
  basis: string | undefined,
  previous: ReportFormState,
  formData: FormData,
): Promise<ReportFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)
  const { db } = getDatabase()
  const screen = id === undefined ? undefined : await findReportScreen(db, id)

  if (id === undefined || screen === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const values = readReportValues(formData)
  const button = readReportButton(formData)
  const version = previous.version + 1

  if (button.kind === 'previous') {
    // The line-up of the previous match goes in only while ours is empty, so nothing is written
    // over. The match is looked up again here: the form only says that the button was pressed.
    const previous = isEmptyLineUp(values) ? await findPreviousLineUp(db, screen.match, screen.squad) : undefined

    if (previous === undefined) {
      return { errors: {}, values, version, warnings: {} }
    }

    return {
      errors: {},
      focus: listId('speler', 'wij'),
      takenFrom: previous.label,
      values: {
        ...values,
        formatie: { ...values.formatie, wij: previous.formatie },
        wij: { ...values.wij, speler: previous.speler },
      },
      version,
      warnings: {},
    }
  }

  if (button.kind !== 'save') {
    const moved = applyReportButton(values, button)

    return { errors: {}, focus: moved.focus, values: moved.values, version, warnings: {} }
  }

  const checked = checkReportForm(values, contextOf(screen))

  if (checked.plan === undefined) {
    return { errors: checked.errors, values, version, warnings: checked.warnings }
  }

  // `klaar` only without errors; the report is kept as `bezig` otherwise.
  const downgraded = checked.plan.status === 'klaar' && Object.keys(checked.errors).length > 0
  const outcome = await saveReport(
    db,
    userId,
    id,
    downgraded ? { ...checked.plan, status: 'bezig' } : checked.plan,
    new Date(),
    basis,
  )

  if (outcome.status === 'missing' || outcome.status === 'not-played') {
    redirect(`${matchesPath}?fout=weg`)
  }
  if (outcome.status === 'stale') {
    // Someone else saved the report since this form was opened: nothing is written, and the
    // form keeps what was typed so it is not lost.
    return {
      errors: {
        verslag:
          'Iemand anders heeft het verslag bewaard sinds jij het opende. Er is niets opgeslagen en je gegevens staan nog in het formulier. Open het verslag in een nieuw tabblad om te zien wat er veranderde, en pas het hier aan.',
      },
      values,
      version,
      warnings: checked.warnings,
    }
  }

  redirect(
    reportPath(
      id,
      // A save that asked for klaar and could not have it says so, even if nothing changed.
      downgraded
        ? 'nog-niet-klaar'
        : outcome.status === 'unchanged'
          ? 'ongewijzigd'
          : checked.plan.status === 'klaar'
            ? 'klaar'
            : 'opgeslagen',
    ),
  )
}

/** The most goals a team scores in a match we accept, as the form of the match has it. */
const mostGoals = 99

/**
 * Ends a match that is still being played with the score the editor confirmed: the match gets
 * its result as an entry of the editors and is `played` from then on. The report stays as is.
 * A score that is not a whole number comes back with an error at its field. If the match is not
 * being played any more, such as when the import was first, nothing is written and the screen
 * of the report says so.
 */
export async function submitFinish(
  matchId: number,
  _previous: FinishFormState,
  formData: FormData,
): Promise<FinishFormState> {
  const { userId } = await requireRole('beheerder')
  const id = parseItemId(matchId)

  if (id === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const read = (name: 'uitslag-wij' | 'uitslag-zij') => {
    const value = formData.get(name)
    const text = typeof value === 'string' ? value.trim() : ''

    return /^\d{1,2}$/u.test(text) && Number(text) <= mostGoals ? Number(text) : undefined
  }
  const goalsFor = read('uitslag-wij')
  const goalsAgainst = read('uitslag-zij')

  if (goalsFor === undefined || goalsAgainst === undefined) {
    const error = `Vul een aantal doelpunten in, een heel getal van 0 tot ${mostGoals}.`

    const typed = (name: 'uitslag-wij' | 'uitslag-zij') => {
      const value = formData.get(name)

      return typeof value === 'string' ? value : ''
    }

    return {
      errors: {
        ...(goalsFor === undefined ? { 'uitslag-wij': error } : {}),
        ...(goalsAgainst === undefined ? { 'uitslag-zij': error } : {}),
      },
      values: { 'uitslag-wij': typed('uitslag-wij'), 'uitslag-zij': typed('uitslag-zij') },
    }
  }

  const outcome = await finishMatch(getDatabase().db, userId, id, { goalsAgainst, goalsFor })

  redirect(
    outcome === 'missing'
      ? `${matchesPath}?fout=weg`
      : reportPath(id, outcome === 'done' ? 'afgelopen' : 'al-afgelopen'),
  )
}
