'use server'

import { redirect } from 'next/navigation'

import { mergeClubs, parseSince } from '#src/beheer/club-merge'
import { addNameRowId, emptyNameRow, nameFieldId, type NameFormState } from '#src/beheer/club-name-fields'
import { isUntouchedRow, readNameButton, readNameRows, validateNameRows } from '#src/beheer/club-name-form'
import { findAdminClub, removeClubNamePeriods, replaceClubNamePeriods } from '#src/beheer/club-names'
import { adminFailure } from '#src/beheer/failure'
import { parseItemId } from '#src/beheer/items'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { clubPath, clubsPath, mergePath } from './paths'

// The actions of the names of the clubs. Only an editor keeps them, as with the matches. The
// address part of the club is bound to the action (`submitNames.bind(null, slug)`) and is input
// from outside all the same, so each action looks the club up again. A form that is wrong
// returns to the form with the values kept, and one that works ends on the page of the club
// with a notice: both work without JavaScript. Adding and removing a line are buttons of the
// same form, which the server answers with the form again and saves nothing.

/** What the form that merges two clubs shows after a merge that did not work. */
export type MergeClubsState = { error?: string; failure?: string; sinds?: string }

/**
 * Merges two clubs (#1345): `otherId` goes into `keptId`. The page says what the merge does and
 * the form has the field for the season the name that stays begins in, and a button. A merge
 * that worked ends on the form of the club that stayed, with a notice. One club twice, a club
 * that is gone or two Wikidata numbers end on the page of the merge again, which says so; a
 * season that is wrong or a merge that failed comes back as an error, which gets the focus.
 */
export async function submitMergeClubs(
  otherId: number,
  keptId: number,
  _previous: MergeClubsState,
  formData: FormData,
): Promise<MergeClubsState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const other = parseItemId(otherId)
  const kept = parseItemId(keptId)

  if (other === undefined || kept === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const value = formData.get('sinds')
  const text = typeof value === 'string' ? { sinds: value } : {}
  const parsed = parseSince(value)

  if ('error' in parsed) {
    return { ...text, error: parsed.error }
  }

  let outcome: Awaited<ReturnType<typeof mergeClubs>>

  try {
    outcome = await mergeClubs(db, userId, { keptId: kept, otherId: other, since: parsed.since })
  } catch (error) {
    console.error(adminFailure(`merge club ${other} into club ${kept}`, error))

    return { ...text, failure: 'De clubs zijn niet samengevoegd. Er is niets veranderd. Probeer het nog eens.' }
  }

  if (typeof outcome === 'string') {
    redirect(mergePath({ clubId: other, withId: kept }))
  }

  redirect(clubPath(outcome.kept.slug, 'samengevoegd'))
}

/**
 * What a button of the form of a club does: a line is added or removed, or the form is checked
 * and saved. A name that belongs to another club comes back as an error at its field. A club
 * that is gone ends on the list with a notice.
 */
export async function submitNames(slug: string, _previous: NameFormState, formData: FormData): Promise<NameFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const rows = readNameRows(formData)
  const button = readNameButton(formData)

  if (button.kind === 'add') {
    return { errors: {}, focus: nameFieldId(rows.length + 1, 'naam'), values: [...rows, { ...emptyNameRow }] }
  }
  if (button.kind === 'remove') {
    const values = rows.filter((_row, index) => index + 1 !== button.number)

    return {
      errors: {},
      // The focus goes to the line that took the place of the removed one, or else to the
      // button that adds one: the button that was pressed is gone.
      focus: values.length >= button.number ? nameFieldId(button.number, 'naam') : addNameRowId,
      values,
    }
  }

  // A line nobody filled in is one the form made, and is not a name.
  const given = rows.filter((row) => !isUntouchedRow(row))
  const checked = validateNameRows(given)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values: given }
  }

  const outcome = await replaceClubNamePeriods(db, userId, found.club.id, checked.lines)

  if (outcome === 'missing') {
    redirect(`${clubsPath}?fout=weg`)
  }
  if (outcome !== 'saved') {
    return {
      errors: Object.fromEntries(
        outcome.conflicts.map(({ club, index, name }) => [
          nameFieldId(index + 1, 'naam'),
          `${name} hoort al bij ${club}. Kies een andere naam, of laat de naam daar met de hand weghalen.`,
        ]),
      ),
      values: given,
    }
  }

  redirect(clubPath(slug, 'opgeslagen'))
}

/**
 * Takes the list of a club away: its page says nothing about earlier names again. The form has
 * only a button, so nothing can be wrong with it.
 */
export async function submitReset(slug: string): Promise<void> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const outcome = await removeClubNamePeriods(db, userId, found.club.id)

  redirect(
    outcome === 'missing' ? `${clubsPath}?fout=weg` : clubPath(slug, outcome === 'done' ? 'weggehaald' : 'geen-lijst'),
  )
}
