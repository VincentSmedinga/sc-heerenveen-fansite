'use server'

import { redirect } from 'next/navigation'

import { requireRole } from '#src/beheer/require-role'
import { addRowId, emptyRow, stadiumFieldId, type StadiumFormState } from '#src/beheer/stadium-fields'
import { isUntouchedRow, readStadiumButton, readStadiumRows, validateStadiumRows } from '#src/beheer/stadium-form'
import { findAdminClub, removeClubStadiums, replaceClubStadiums } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'

import { clubPath, stadiumsPath } from './paths'

// The actions of the stadiums. Only an editor keeps them, as with the matches. The address
// part of the club is bound to the action (`submitStadiums.bind(null, slug)`) and is input from
// outside all the same, so each action looks the club up again. A form that is wrong returns to
// the form with the values kept, and one that works ends on the page of the club with a notice:
// both work without JavaScript. Adding and removing a line, and taking Wikipedia over, are
// buttons of the same form, which the server answers with the form again and saves nothing.

/**
 * Takes the list of a club away: its page shows what the matches say again. The form has only
 * a button, so nothing can be wrong with it.
 */
export async function submitReset(slug: string): Promise<void> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${stadiumsPath}?fout=weg`)
  }

  const outcome = await removeClubStadiums(db, userId, found.club.id)

  redirect(
    outcome === 'missing'
      ? `${stadiumsPath}?fout=weg`
      : clubPath(slug, outcome === 'done' ? 'teruggezet' : 'geen-lijst'),
  )
}

/**
 * What a button of the form of a club does: a line is added or removed, the names of Wikipedia
 * fill the form, or the form is checked and saved. A club that is gone ends on the list with a
 * notice.
 */
export async function submitStadiums(
  slug: string,
  _previous: StadiumFormState,
  formData: FormData,
): Promise<StadiumFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${stadiumsPath}?fout=weg`)
  }

  const rows = readStadiumRows(formData)
  const button = readStadiumButton(formData)

  if (button.kind === 'add') {
    return { errors: {}, focus: stadiumFieldId(rows.length + 1, 'naam'), values: [...rows, { ...emptyRow }] }
  }
  if (button.kind === 'remove') {
    const values = rows.filter((_row, index) => index + 1 !== button.number)

    return {
      errors: {},
      // The focus goes to the line that took the place of the removed one, or else to the
      // button that adds one: the button that was pressed is gone.
      focus: values.length >= button.number ? stadiumFieldId(button.number, 'naam') : addRowId,
      values,
    }
  }
  if (button.kind === 'take-over') {
    // Nothing is saved: the editor looks at the lines, changes them and saves.
    return { errors: {}, focus: stadiumFieldId(1, 'naam'), values: found.wikipediaRows }
  }

  // A line nobody filled in is one the form made, and is not a name.
  const given = rows.filter((row) => !isUntouchedRow(row))
  const checked = validateStadiumRows(given)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values: given }
  }

  const outcome = await replaceClubStadiums(db, userId, found.club.id, checked.lines)

  redirect(outcome === 'saved' ? clubPath(slug, 'opgeslagen') : `${stadiumsPath}?fout=weg`)
}
