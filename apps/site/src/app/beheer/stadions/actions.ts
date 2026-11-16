'use server'

import { listAdminStadiums, saveClubHomeGrounds, setClubWikidataId } from '@fansite/db/stadium-admin'
import { redirect } from 'next/navigation'

import type { ClubWikidataState } from '#src/beheer/club-wikidata'
import type { HomeGroundFormState } from '#src/beheer/home-ground-fields'

import { readWikidataNumber } from '#src/beheer/club-wikidata'
import { emptyHomeGroundRow, homeGroundFieldId } from '#src/beheer/home-ground-fields'
import {
  isUntouchedHomeGroundRow,
  readHomeGroundButton,
  readHomeGroundRows,
  validateHomeGroundRows,
} from '#src/beheer/home-ground-form'
import { requireRole } from '#src/beheer/require-role'
import { addRowId, emptyRow, stadiumFieldId, type StadiumFormState } from '#src/beheer/stadium-fields'
import { isUntouchedRow, readStadiumButton, readStadiumRows, validateStadiumRows } from '#src/beheer/stadium-form'
import { findAdminClub, removeClubStadiums, replaceClubStadiums } from '#src/beheer/stadiums'
import { getDatabase } from '#src/database'

import { clubPath, clubsPath } from './paths'

// The actions of the stadiums. Only an editor keeps them, as with the matches. The address
// part of the club is bound to the action (`submitStadiums.bind(null, slug)`) and is input from
// outside all the same, so each action looks the club up again. A form that is wrong returns to
// the form with the values kept, and one that works ends on the page of the club with a notice:
// both work without JavaScript. Adding and removing a line, and taking Wikipedia over, are
// buttons of the same form, which the server answers with the form again and saves nothing.

/**
 * Saves the Wikidata number of a club, or takes it away when the field is empty. The import
 * then reads the item and the home grounds of the club again. A number that another club has
 * is an error at the field.
 */
export async function submitClubWikidata(
  slug: string,
  _previous: ClubWikidataState,
  formData: FormData,
): Promise<ClubWikidataState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const text = formData.get('wikidata')
  const value = typeof text === 'string' ? text.trim() : ''
  const read = readWikidataNumber(value)

  if ('error' in read) {
    return { error: read.error, value }
  }

  const outcome = await setClubWikidataId(db, userId, found.club.id, read.id)

  if (outcome.status === 'missing') {
    redirect(`${clubsPath}?fout=weg`)
  }
  if (outcome.status === 'taken') {
    return { error: `Dit nummer hoort al bij ${outcome.club}.`, value }
  }

  return { saved: read.id ?? '', value: read.id ?? '' }
}

/**
 * What a button of the form of the home grounds does: a line is added or removed, or the lines
 * are checked and saved. Saving sets the source of the grounds to `manual`, so the import
 * leaves them alone. A club that is gone ends on the list with a notice.
 */
export async function submitHomeGrounds(
  slug: string,
  _previous: HomeGroundFormState,
  formData: FormData,
): Promise<HomeGroundFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const rows = readHomeGroundRows(formData)
  const button = readHomeGroundButton(formData)

  if (button.kind === 'add') {
    return {
      errors: {},
      focus: homeGroundFieldId(rows.length + 1, 'stadion'),
      values: [...rows, { ...emptyHomeGroundRow }],
    }
  }
  if (button.kind === 'remove') {
    const values = rows.filter((_row, index) => index + 1 !== button.number)

    return {
      errors: {},
      focus: values.length >= button.number ? homeGroundFieldId(button.number, 'stadion') : 'thuis-toevoegen',
      values,
    }
  }

  const given = rows.filter((row) => !isUntouchedHomeGroundRow(row))
  const known = new Set((await listAdminStadiums(db)).map((stadium) => stadium.id))
  const checked = validateHomeGroundRows(given, known)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values: given }
  }

  const outcome = await saveClubHomeGrounds(db, userId, found.club.id, checked.lines)

  if (outcome === 'saved') {
    redirect(clubPath(slug, 'thuisvelden-opgeslagen'))
  }

  return outcome === 'missing'
    ? redirect(`${clubsPath}?fout=weg`)
    : { errors: { thuisvelden: 'Een gekozen stadion bestaat niet meer. Kies opnieuw.' }, values: given }
}

/**
 * Takes the list of a club away: its page shows what the matches say again. The form has only
 * a button, so nothing can be wrong with it.
 */
export async function submitReset(slug: string): Promise<void> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const found = await findAdminClub(db, slug)

  if (found === undefined) {
    redirect(`${clubsPath}?fout=weg`)
  }

  const outcome = await removeClubStadiums(db, userId, found.club.id)

  redirect(
    outcome === 'missing' ? `${clubsPath}?fout=weg` : clubPath(slug, outcome === 'done' ? 'teruggezet' : 'geen-lijst'),
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
    redirect(`${clubsPath}?fout=weg`)
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

  redirect(outcome === 'saved' ? clubPath(slug, 'opgeslagen') : `${clubsPath}?fout=weg`)
}
