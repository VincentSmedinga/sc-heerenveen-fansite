import {
  emptyRow,
  emptySide,
  type ReportSquadPlayer,
  type ReportValues,
  type Row,
  rowFieldId,
  rowFields,
  type RowKind,
  rowKinds,
  type Side,
} from './report-fields'

// Made-up data for the tests of the match report: a squad of fourteen players, shirt numbers 1
// to 14, and a report that is right for a 2-1 win. Only the tests import this file.

/** Fourteen players of ours with the numbers 1 to 14, whose ids start at `first`. */
export function squadOf(first: number): ReportSquadPlayer[] {
  return Array.from({ length: 14 }, (_nothing, index) => ({
    id: first + index,
    name: `Speler ${index + 1}`,
    shirtNumber: index + 1,
  }))
}

/** A goal row with these fields. */
export const goal = (fields: Row): Row => ({ ...emptyRow('doelpunt'), ...fields })

/** A substitution row with these fields. */
export const substitution = (fields: Row): Row => ({ ...emptyRow('wissel'), ...fields })

/** A card row with these fields. */
export const card = (fields: Row): Row => ({ ...emptyRow('kaart'), ...fields })

/** The request of the form for these values, as the browser sends it. */
export function formDataOf(values: ReportValues, knop = 'opslaan'): FormData {
  const formData = new FormData()

  formData.set('bron', values.bron)
  formData.set('status', values.status)
  formData.set('tegenstander', values.tegenstander)
  formData.set('knop', knop)

  for (const side of ['wij', 'zij'] as const) {
    for (const kind of rowKinds) {
      values[side][kind].forEach((row, index) => {
        for (const field of rowFields[kind]) {
          formData.set(rowFieldId(kind, side, index + 1, field), row[field] ?? '')
        }
      })
    }
  }

  return formData
}

/**
 * A report of a 2-1 win that is right: the squad in the line-up (the first player is the
 * captain) and on the bench (the last three), a goal of number 9 and one of number 10 with an
 * assist of number 9, and one of Sibbing for the opponent. The rows in `overrides` replace the
 * rows of that list.
 */
export function report(
  squad: readonly ReportSquadPlayer[],
  overrides: Partial<Record<Side, Partial<Record<RowKind, Row[]>>>> = {},
): ReportValues {
  return {
    bron: 'wedstrijdformulier',
    status: 'klaar',
    tegenstander: 'nee',
    wij: {
      ...emptySide(),
      doelpunt: [goal({ minuut: '12', speler: 'wij-9' }), goal({ assist: 'wij-9', minuut: '77', speler: 'wij-10' })],
      speler: squad.map((player, index) => ({
        ...emptyRow('speler'),
        keuze: String(player.id),
        rol: index > 10 ? 'bank' : index === 0 ? 'aanvoerder' : 'basis',
      })),
      ...overrides.wij,
    },
    zij: { ...emptySide(), doelpunt: [goal({ minuut: '40', naam: 'Sibbing' })], ...overrides.zij },
  }
}
