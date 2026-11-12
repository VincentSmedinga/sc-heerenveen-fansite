'use server'

import { redirect } from 'next/navigation'

import type { PersonFormState } from '#src/beheer/person-fields'

import { mergePath, playersPath } from '#src/app/beheer/spelers/paths'
import { backPathOf } from '#src/app/beheer/wedstrijden/paths'
import { parseItemId } from '#src/beheer/items'
import { birthDateText } from '#src/beheer/person-checks'
import { isPersonPart } from '#src/beheer/person-fields'
import { editPerson, findAdminPerson, readPersonValues, validatePerson } from '#src/beheer/person-form'
import {
  isPersonGapColumn,
  letterTablePath,
  personColumnParts,
  personQualityPath,
  readPersonGaps,
} from '#src/beheer/person-table'
import { nextWithGap } from '#src/beheer/quality-table'
import { requireRole } from '#src/beheer/require-role'
import { getDatabase } from '#src/database'

import { personPartPath, personPath } from './paths'

/**
 * Changes a person (issue 1164): the whole form, or one part (`part`), which saves only its own
 * fields. From the table of Kwaliteit (`column`, issue 1165), "Opslaan en volgende" goes on to
 * the next person with a gap in that column. The number, the part, the way back and the column
 * are bound to the action and are input from outside all the same, so they are checked again.
 * A form that is wrong comes back with the values kept and an error at each field, and one that
 * works ends on the same page with a notice, also when nothing changed. A person who is gone
 * ends on the list of the players, which says so.
 */
export async function submitPerson(
  personId: number,
  part: string | undefined,
  back: string | undefined,
  column: string | undefined,
  _previous: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const { userId } = await requireRole('owner', 'editor')
  const { db } = getDatabase()
  const id = parseItemId(personId)
  const shown = part !== undefined && isPersonPart(part) ? part : undefined
  const found = id === undefined ? undefined : await findAdminPerson(db, id)

  if (id === undefined || found === undefined || (part !== undefined && shown === undefined)) {
    redirect(`${playersPath}?fout=persoon-weg`)
  }

  const values = readPersonValues(formData)
  const checked = validatePerson(values, shown, birthDateText(found.person.birthDate, found.person.birthDatePrecision))

  if (checked.errors !== undefined) {
    return { errors: checked.errors, values }
  }

  let outcome: Awaited<ReturnType<typeof editPerson>>

  try {
    outcome = await editPerson(db, userId, id, checked.entry)
  } catch (error) {
    console.error(`Could not change a person: ${error instanceof Error ? error.message : String(error)}`)

    return { errors: { algemeen: 'De persoon is niet opgeslagen. Probeer het nog eens.' }, values }
  }

  if (outcome.status === 'refused') {
    const { merge } = outcome

    return {
      errors: outcome.errors,
      ...(merge === undefined ? {} : { merge: { href: mergePath(merge), label: merge.label } }),
      values,
    }
  }
  if (outcome.status === 'missing') {
    redirect(`${playersPath}?fout=persoon-weg`)
  }

  const done = outcome.status === 'changed' ? 'opgeslagen' : 'ongewijzigd'
  const way = { back: backPathOf(back), done }

  // "Opslaan en volgende" (issue 1165) goes on to the next person of the letter with a gap in
  // the column of the table, or back to the letter when the column is complete. The column
  // must lead to the part of this page.
  if (
    shown !== undefined &&
    isPersonGapColumn(column) &&
    personColumnParts[column] === shown &&
    formData.get('knop') === 'volgende'
  ) {
    const rows = await readPersonGaps(db)
    const letter = rows.find((row) => row.id === id)?.letter
    const next =
      letter === undefined
        ? undefined
        : nextWithGap(
            rows.filter((row) => row.letter === letter),
            id,
            column,
          )

    redirect(
      next === undefined
        ? letter === undefined
          ? personQualityPath
          : letterTablePath(letter, undefined, 'kolom-compleet')
        : personPartPath(next.id, shown, { ...way, column, done: `volgende-${done}` }),
    )
  }

  redirect(shown === undefined ? personPath(id, way) : personPartPath(id, shown, way))
}
