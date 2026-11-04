'use server'

import { redirect } from 'next/navigation'

import { addNameRowId, emptyNameRow, nameFieldId, type NameFormState } from '#src/beheer/club-name-fields'
import { isUntouchedRow, readNameButton, readNameRows, validateNameRows } from '#src/beheer/club-name-form'
import { findAdminClub, removeClubNamePeriods, replaceClubNamePeriods } from '#src/beheer/club-names'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { clubNamesPath, clubPath } from './paths'

// The actions of the names of the clubs. Only a beheerder keeps them, as with the matches. The
// address part of the club is bound to the action (`submitNames.bind(null, slug)`) and is input
// from outside all the same, so each action looks the club up again. A form that is wrong
// returns to the form with the values kept, and one that works ends on the page of the club
// with a notice: both work without JavaScript. Adding and removing a line are buttons of the
// same form, which the server answers with the form again and saves nothing.

/**
 * What a button of the form of a club does: a line is added or removed, or the form is checked
 * and saved. A name that belongs to another club comes back as an error at its field. A club
 * that is gone ends on the list with a notice.
 */
export async function submitNames(slug: string, _previous: NameFormState, formData: FormData): Promise<NameFormState> {
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubNamesPath}?fout=weg`)
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
    redirect(`${clubNamesPath}?fout=weg`)
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
  const { userId } = await requireRole('beheerder')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubNamesPath}?fout=weg`)
  }

  const outcome = await removeClubNamePeriods(db, userId, found.club.id)

  redirect(
    outcome === 'missing'
      ? `${clubNamesPath}?fout=weg`
      : clubPath(slug, outcome === 'done' ? 'weggehaald' : 'geen-lijst'),
  )
}
