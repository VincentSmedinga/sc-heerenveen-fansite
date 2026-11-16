'use server'

import { findAdminStadium, resetStadiumToWikidata, saveStadium } from '@fansite/db/stadium-admin'
import { redirect } from 'next/navigation'

import type { GroundFormState } from '#src/beheer/ground-fields'

import { readCoordinates, readGroundValues, validateGround } from '#src/beheer/ground-form'
import { inNetherlands, lookupAddress } from '#src/beheer/pdok'
import { requireRole } from '#src/beheer/require-role'
import { addRowId, emptyRow, stadiumFieldId } from '#src/beheer/stadium-fields'
import { isUntouchedRow, readStadiumButton } from '#src/beheer/stadium-form'
import { getDatabase } from '#src/database'

import { groundPath, stadiumsPath } from '../paths'

// The actions of a stadium. Only an editor keeps them. The number of the stadium is bound to
// the action (`submitGround.bind(null, id)`) and is input from outside all the same, so each
// action looks the stadium up again. A form that is wrong returns to the form with the values
// kept, and one that works ends on the page of the stadium with a notice: both work without
// JavaScript. Adding and removing a line and looking up the address are buttons of the same
// form, which the server answers with the form again and saves nothing.

const gone = `${stadiumsPath}?fout=weg`

/**
 * What a button of the form of a stadium does: a line is added or removed, the address is
 * looked up from the coordinates, or the form is checked and saved. A stadium that is gone ends
 * on the list with a notice.
 */
export async function submitGround(
  id: string,
  _previous: GroundFormState,
  formData: FormData,
): Promise<GroundFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const target = targetOf(id)

  if (target === undefined || (target !== null && (await findAdminStadium(db, target)) === undefined)) {
    redirect(gone)
  }

  const values = readGroundValues(formData)
  const { rows } = values
  const button = readStadiumButton(formData)

  if (button.kind === 'add') {
    return {
      errors: {},
      focus: stadiumFieldId(rows.length + 1, 'naam'),
      values: { ...values, rows: [...rows, { ...emptyRow }] },
    }
  }
  if (button.kind === 'remove') {
    const left = rows.filter((_row, index) => index + 1 !== button.number)

    return {
      errors: {},
      // The focus goes to the line that took the place of the removed one, or else to the
      // button that adds one: the button that was pressed is gone.
      focus: left.length >= button.number ? stadiumFieldId(button.number, 'naam') : addRowId,
      values: { ...values, rows: left },
    }
  }
  if (button.kind === 'address') {
    const point = readCoordinates(values)

    if (point === undefined || !inNetherlands(point.latitude, point.longitude)) {
      return {
        errors: {},
        notice: 'Het adres opzoeken kan alleen bij coördinaten in Nederland. Vul ze eerst in.',
        values,
      }
    }

    const found = await lookupAddress(point.latitude, point.longitude)

    if (found.kind === 'found') {
      return {
        errors: {},
        focus: 'straat',
        notice: 'Het voorstel van PDOK staat in de velden. Het is nog niet bewaard: kies Opslaan als het klopt.',
        values: {
          ...values,
          plaats: found.address.place,
          postcode: found.address.postcode,
          straat: found.address.street,
        },
      }
    }

    return {
      errors: {},
      notice:
        found.kind === 'none'
          ? 'PDOK kent geen adres bij deze coördinaten. Vul het adres met de hand in.'
          : 'PDOK gaf geen bruikbaar antwoord. Probeer het later opnieuw, of vul het adres met de hand in.',
      values,
    }
  }

  // A line nobody filled in is one the form made, and is not a name.
  const given = { ...values, rows: rows.filter((row) => !isUntouchedRow(row)) }
  const checked = validateGround(given)

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values: given }
  }

  const outcome = await saveStadium(db, userId, target, checked.input)

  if (outcome.status === 'missing') {
    redirect(gone)
  }

  redirect(groundPath(outcome.id, outcome.created ? 'gemaakt' : 'opgeslagen'))
}

/**
 * Puts the place and the coordinates of a stadium back to what Wikidata says. The form has only
 * a button, so nothing can be wrong with it.
 */
export async function submitGroundReset(id: string): Promise<void> {
  const { userId } = await requireRole('owner', 'editor')
  const target = targetOf(id)

  if (target === undefined || target === null) {
    redirect(gone)
  }

  const outcome = await resetStadiumToWikidata(getDatabase().db, userId, target)

  if (outcome.status === 'missing') {
    redirect(gone)
  }

  redirect(
    groundPath(
      target,
      outcome.status === 'done'
        ? 'teruggezet'
        : outcome.status === 'manual-source-only'
          ? 'teruggezet-zonder-import'
          : 'niet-teruggezet',
    ),
  )
}

/** The stadium an address part names: `null` for a new one, undefined for something else. */
function targetOf(id: string): null | number | undefined {
  if (id === 'nieuw') {
    return null
  }

  return /^\d{1,10}$/u.test(id) ? Number(id) : undefined
}
