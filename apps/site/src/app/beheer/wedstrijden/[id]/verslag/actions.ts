'use server'

import { redirect } from 'next/navigation'

import { matchesPath, reportPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId, parseReason } from '#src/beheer/items'
import { contextOf, findReportScreen, removeReport, saveReport } from '#src/beheer/match-reports'
import { applyReportButton, readReportButton, readReportValues, type ReportFormState } from '#src/beheer/report-fields'
import { checkReportForm } from '#src/beheer/report-form'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// The actions of the screen of a match report. Only a beheerder fills in a report, as with the
// matches. The number of the match is bound to the action and is input from outside all the
// same, so each action checks it again. A form that is wrong returns to the form with the
// values kept, and one that works ends on the screen with a notice: both work without
// JavaScript. Adding and removing a row are buttons of the same form, which the server answers
// with the form again.

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
 * that is gone, or was not played, ends on the list with a notice.
 */
export async function submitReport(
  matchId: number,
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
  const outcome = await saveReport(db, userId, id, downgraded ? { ...checked.plan, status: 'bezig' } : checked.plan)

  if (outcome.status === 'missing' || outcome.status === 'not-played') {
    redirect(`${matchesPath}?fout=weg`)
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
