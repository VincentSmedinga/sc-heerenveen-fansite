'use server'

import { redirect } from 'next/navigation'

import { matchesPath } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId } from '#src/beheer/items'
import { contextOf, findReportScreen } from '#src/beheer/match-reports'
import { checkReportForm } from '#src/beheer/report-form'
import { pasteMaxLength, readPastedReport } from '#src/beheer/report-paste'
import { type PasteState } from '#src/beheer/report-paste-state'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

// The action of the screen "Tekst plakken". It reads the text into the values of the form of
// the report and gives them back; it writes nothing, and it does not log the text. What the
// editor keeps, he saves with the form, which checks it as it checks a form typed by hand.

/**
 * The most characters of the text that are given back with an error, so a huge request is not
 * echoed.
 */
const echoMaxLength = 100_000

/**
 * Reads the pasted text. A report that exists is only replaced in the form when the editor
 * agreed to it; a text that is too long or empty comes back with a sentence. The number of the
 * match is input from outside all the same, so it is checked again.
 */
export async function submitPaste(matchId: number, previous: PasteState, formData: FormData): Promise<PasteState> {
  await requireRole('beheerder')

  const id = parseItemId(matchId)
  const screen = id === undefined ? undefined : await findReportScreen(getDatabase().db, id)

  if (id === undefined || screen === undefined) {
    redirect(`${matchesPath}?fout=weg`)
  }

  const raw = formData.get('tekst')
  const text = typeof raw === 'string' ? raw : ''
  const replace = formData.get('vervangen') === 'ja'
  const version = previous.version + 1
  const ask = (error: string): PasteState => ({
    error,
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
    return ask('Vink aan dat je wat nu in het verslag staat wilt vervangen, of kies Annuleren.')
  }

  const result = readPastedReport(text, screen.squad, { bron: screen.report?.report.source ?? '' })
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
