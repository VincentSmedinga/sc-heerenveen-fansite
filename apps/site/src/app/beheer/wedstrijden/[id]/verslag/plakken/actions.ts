'use server'

import { redirect } from 'next/navigation'

import { matchesPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId } from '#src/beheer/items'
import { contextOf, findReportScreen, keepShootout } from '#src/beheer/match-reports'
import { checkReportForm } from '#src/beheer/report-form'
import { readPastedReport } from '#src/beheer/report-paste'
import { firstPasteState, pasteMaxLength, type PasteState } from '#src/beheer/report-paste-state'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { submitReport } from '../actions'

// The action of the screen "Tekst plakken". It reads the text into the values of the form of
// the report and gives them back; it writes nothing, and it does not log the text. What the
// editor keeps, he saves with the form, which checks it as it checks a form typed by hand.

/**
 * The most characters of the text that are given back with an error, so a huge request is not
 * echoed.
 */
const echoMaxLength = 100_000

/**
 * The one action of the screen, which answers both posts of it: the text, and after that the
 * form of the report. It is one action so there is one `useActionState`, and what the server
 * answers after a post without JavaScript reaches the form it belongs to.
 *
 * The text is read into the values of the form. A report that exists is only replaced in the
 * form when the editor agreed to it; a text that is too long or empty comes back with a
 * sentence. The post of the form is the action of the screen of the report (`submitReport`),
 * which checks and saves, and its answer replaces the form. The number of the match is input
 * from outside all the same, so it is checked again.
 */
export async function submitPaste(
  matchId: number,
  basis: string | undefined,
  previous: PasteState,
  formData: FormData,
): Promise<PasteState> {
  await requireRole('beheerder')

  if (!formData.has('tekst')) {
    // The form of the report: a row added or taken away, or a save, as on the screen of the
    // report. Without a text that was read there is no form to post.
    return previous.kind === 'read'
      ? { ...previous, form: await submitReport(matchId, basis, previous.form, formData) }
      : { ...firstPasteState, version: previous.version + 1 }
  }

  const id = parseItemId(matchId)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const raw = formData.get('tekst')
  const text = typeof raw === 'string' ? raw : ''
  const replace = formData.get('vervangen') === 'ja'
  const version = previous.version + 1
  const ask = (error: string, field: 'tekst' | 'vervangen' = 'tekst'): PasteState => ({
    error,
    field,
    kind: 'ask',
    replace,
    text: text.slice(0, echoMaxLength),
    version,
  })

  if (text.trim() === '') {
    return ask('Plak eerst de tekst van het verslag.')
  }

  if (text.length > pasteMaxLength) {
    return ask(
      `De tekst is te lang: hij heeft ${text.length.toLocaleString('nl-NL')} tekens en hoogstens ${pasteMaxLength.toLocaleString('nl-NL')} mogen. Haal er iets af en plak opnieuw.`,
    )
  }

  if (screen.report !== undefined && !replace) {
    return ask('Vink aan dat je wat nu in het verslag staat wilt vervangen, of kies Annuleren.', 'vervangen')
  }

  const read = readPastedReport(text, screen.squad, { bron: screen.report?.report.source ?? '' })
  // The text has no series, so the kicks that are stored stay, as the form holds them.
  const result = { ...read, values: keepShootout(read.values, screen.report, screen.squad) }
  const checked = checkReportForm(result.values, contextOf(screen))

  return {
    choices: result.choices,
    form: { errors: checked.errors, values: result.values, version: 0, warnings: checked.warnings },
    kind: 'read',
    read: result.read,
    unread: result.unread,
    version,
  }
}
