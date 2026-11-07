// What the form of a match report is made of, with nothing the browser should not load: the
// form is a client component, and it imports this file. The checks are in `report-form.ts`.
//
// A report is two sides, `wij` (sc Heerenveen) and `zij` (the opponent), and each side has five
// lists of rows: the players, the substitutions, the goals, the cards and the missed penalties.
// A row is a record of text, as an editor typed it. Rows are numbered from 1 within their list
// and side, and the fields of a row are named `<kind>-<side>-<number>-<field>`, such as
// `wissel-wij-2-minuut`. An event points to a player of the report by the number of his row in
// the list of players of the same side (`3`); a goal points to its scorer and assist by the
// side and the number (`wij-3`), since a scorer of an own goal is of the other side.
import { formationChoices } from '@fansite/shared/match-report'

export const sides = ['wij', 'zij'] as const

export type Side = (typeof sides)[number]

/** The lists of rows of a side, in the order of the form. */
export const rowKinds = ['speler', 'wissel', 'doelpunt', 'kaart', 'strafschop'] as const

export type RowKind = (typeof rowKinds)[number]

/** The fields of a row, in the order of the form. */
export const rowFields = {
  doelpunt: ['minuut', 'extra', 'soort', 'speler', 'assist', 'naam'],
  kaart: ['minuut', 'extra', 'soort', 'speler'],
  speler: ['rugnummer', 'keuze', 'naam', 'rol'],
  strafschop: ['minuut', 'extra', 'soort', 'speler'],
  wissel: ['minuut', 'extra', 'eruit', 'erin'],
} as const satisfies Record<RowKind, readonly string[]>

/** The name of a field of any row. */
export type FieldName = (typeof rowFields)[RowKind][number]

/**
 * What an editor filled in for the formation of a team: the choice in the list (`''` for none,
 * one of `formationChoices`, or `otherFormation`), and the text of a formation of his own,
 * which only counts with that last choice.
 */
export type FormationValue = { eigen: string; keuze: string }

/** The errors by the `id` of the field or the list: `wissel-wij-2-minuut` or `doelpunt-zij`. */
export type ReportErrors = {
  [id: string]: string | undefined
  bron?: string
  status?: string
  tegenstander?: string
  verslag?: string
}

/** What the form shows after a button or a save that did not work. */
export type ReportFormState = {
  errors: ReportErrors
  /** The `id` of the element that gets the focus, such as the first field of a new row. */
  focus?: string
  values: ReportValues
  /** Changes with every answer of the server, so the form is made anew and shows the values. */
  version: number
  /**
   * What the rules find unusual, by the `id` of the list (`wissel-wij`). It does not keep a
   * report from being saved.
   */
  warnings: Record<string, string[]>
}

/** A player of ours in the squad of the season, as the form needs him. */
export type ReportSquadPlayer = {
  id: number
  name: string
  /** The surname the search page looks for (`players.search_term`), such as `van Aken`. */
  searchTerm?: string
  shirtNumber: null | number
}

/** What an editor filled in for a report, as text. */
export type ReportValues = {
  bron: string
  /** The formation of each team. */
  formatie: Record<Side, FormationValue>
  status: string
  /** `ja` when the side of the opponent is complete too. */
  tegenstander: string
  wij: SideRows
  zij: SideRows
}

/** What an editor typed in one row, by the name of the field. A field left out is empty. */
export type Row = Partial<Record<FieldName, string>>

export type SideRows = Record<RowKind, Row[]>

/** The choices of a field, as the form words them and the database has them. */
export const roleChoices = [
  { label: 'Basis', value: 'basis' },
  { label: 'Basis en aanvoerder', value: 'aanvoerder' },
  { label: 'Bank', value: 'bank' },
] as const

export const goalKindChoices = [
  { label: 'Gewoon', value: 'gewoon' },
  { label: 'Strafschop', value: 'strafschop' },
  { label: 'Eigen doelpunt', value: 'eigen' },
] as const

export const cardKindChoices = [
  { label: 'Geel', value: 'geel' },
  { label: 'Geel-rood', value: 'geel-rood' },
  { label: 'Rood', value: 'rood' },
] as const

export const incidentKindChoices = [
  { label: 'Gemist', value: 'strafschop-gemist' },
  { label: 'Gestopt door de keeper', value: 'strafschop-gestopt' },
] as const

export const statusChoices = [
  { label: 'Bezig', value: 'bezig' },
  { label: 'Klaar', value: 'klaar' },
] as const

/** The keuze of a player of ours that is not in the squad: the name and the number follow. */
export const otherPlayer = 'andere'

/** The choice for a formation that is not in the list: the text field holds it. */
export const otherFormation = 'anders'

/**
 * The `id` of the list of the formation of a side, and of the field for a formation of his own.
 */
export const formationId = (side: Side) => `formatie-${side}`
export const formationOwnId = (side: Side) => `formatie-${side}-eigen`

/** A formation that was not filled in. */
export const noFormation = (): FormationValue => ({ eigen: '', keuze: '' })

/** What a button of the form asks for. */
export type ReportButton =
  | { kind: 'add'; row: RowKind; side: Side }
  | { kind: 'remove'; number: number; row: RowKind; side: Side }
  | { kind: 'save' }

/** The `id` of the button that adds a row to a list. */
export function addButtonValue(kind: RowKind, side: Side) {
  return `${kind}-${side}-toevoegen`
}

/** A row as a new one has it. A new player is in the line-up, a new goal is a normal goal. */
export function emptyRow(kind: RowKind): Row {
  const row: Row = Object.fromEntries(rowFields[kind].map((field) => [field, ''] as const))

  if (kind === 'speler') {
    row.rol = 'basis'
  } else if (kind === 'doelpunt') {
    row.soort = 'gewoon'
  } else if (kind === 'kaart') {
    row.soort = 'geel'
  } else if (kind === 'strafschop') {
    row.soort = 'strafschop-gemist'
  }

  return row
}

/** The rows of a side with nothing in them. */
export function emptySide(): SideRows {
  return { doelpunt: [], kaart: [], speler: [], strafschop: [], wissel: [] }
}

/**
 * The form values of a formation that is stored: one of the list shows as that choice, and any
 * other shows as "Anders" with the text, so a formation of his own comes back where it was
 * typed. No formation is the empty choice.
 */
export function formationValueOf(stored: null | string): FormationValue {
  if (stored === null || stored === '') {
    return noFormation()
  }

  return (formationChoices as readonly string[]).includes(stored)
    ? { eigen: '', keuze: stored }
    : { eigen: stored, keuze: otherFormation }
}

/** Whether nothing was filled in for a row: every field is as a new row has it. */
export function isUntouchedRow(kind: RowKind, row: Row): boolean {
  const empty = emptyRow(kind)

  return (rowFields[kind] as readonly FieldName[]).every((field) => (row[field] ?? '') === empty[field])
}

/** The `id` of the heading of a list, which also names the error of the list as a whole. */
export function listId(kind: RowKind, side: Side) {
  return `${kind}-${side}`
}

/** The value of the button that removes a row. */
export function removeButtonValue(kind: RowKind, side: Side, number: number) {
  return `${kind}-${side}-weghalen-${number}`
}

/** The `id` and the `name` of a field of a row. Rows are numbered from 1. */
export function rowFieldId(kind: RowKind, side: Side, number: number, field: FieldName) {
  return `${kind}-${side}-${number}-${field}`
}

/** How a row is called, as the name of the list is: `Wissel 2`. */
export const rowNames: Record<RowKind, string> = {
  doelpunt: 'Doelpunt',
  kaart: 'Kaart',
  speler: 'Speler',
  strafschop: 'Strafschop',
  wissel: 'Wissel',
}

/**
 * The values after a button: a row is added, or removed. Removing a player also clears every
 * place that pointed to him and moves the numbers of the players after him, so no event
 * suddenly points to somebody else. Returns the `id` of the element that gets the focus.
 */
export function applyReportButton(
  values: ReportValues,
  button: Exclude<ReportButton, { kind: 'save' }>,
): { focus: string; values: ReportValues } {
  const next: ReportValues = { ...values, wij: { ...values.wij }, zij: { ...values.zij } }
  const { row, side } = button

  if (button.kind === 'add') {
    next[side][row] = [...values[side][row], emptyRow(row)]

    return { focus: rowFieldId(row, side, next[side][row].length, rowFields[row][0]), values: next }
  }

  next[side][row] = values[side][row].filter((_row, index) => index + 1 !== button.number)

  if (row === 'speler') {
    const moved = (value: string) => {
      const number = Number(value)

      return value === '' || !Number.isInteger(number)
        ? value
        : number === button.number
          ? ''
          : number > button.number
            ? String(number - 1)
            : value
    }
    const movedSide = (value: string) => {
      const [of = '', number = ''] = value.split('-')

      return of === side ? (moved(number) === '' ? '' : `${of}-${moved(number)}`) : value
    }

    for (const kind of ['wissel', 'kaart', 'strafschop'] as const) {
      next[side][kind] = next[side][kind].map((other) =>
        Object.fromEntries(
          Object.entries(other).map(([field, value]) => [
            field,
            field === 'eruit' || field === 'erin' || field === 'speler' ? moved(value) : value,
          ]),
        ),
      )
    }

    for (const of of sides) {
      next[of].doelpunt = next[of].doelpunt.map((goal) => ({
        ...goal,
        assist: movedSide(goal.assist ?? ''),
        speler: movedSide(goal.speler ?? ''),
      }))
    }
  }

  const left = next[side][row].length

  return {
    // The focus goes to the row that took the place of the removed one, or else to the heading
    // of the list: the button that was pressed is gone.
    focus: left >= button.number ? rowFieldId(row, side, button.number, rowFields[row][0]) : listId(row, side),
    values: next,
  }
}

/**
 * The places of ours that hold a player who is chosen in another place too, after `chosen` was
 * picked: the other place gives him up, so a player is in the report once and no place is left
 * with a player who is also somewhere else. The numbers are those of the rows, from 1.
 */
export function clearTakenPlayers(values: ReportValues, chosen: number): number[] {
  const keuze = values.wij.speler[chosen - 1]?.keuze ?? ''

  return keuze === '' || keuze === otherPlayer
    ? []
    : values.wij.speler.flatMap((row, index) => (index + 1 !== chosen && row.keuze === keuze ? [index + 1] : []))
}

/** The number of goals a side has in the report, for the headings. */
export function goalsOf(values: ReportValues, side: Side) {
  return values[side].doelpunt.filter((goal) => !isUntouchedRow('doelpunt', goal)).length
}

/**
 * The players of a side as the choices of a list: the value is the number of his row, the text
 * is his number and name. Rows without a name are left out. With `bench` only the players on
 * the bench are in the list, which is where a substitute comes from.
 */
export function playerChoices(
  values: ReportValues,
  side: Side,
  squad: readonly ReportSquadPlayer[],
  prefix = false,
  bench = false,
): { label: string; value: string }[] {
  return values[side].speler.flatMap((row, index) => {
    const player = playerOf(row, side, squad)

    return player === undefined || (bench && row.rol !== 'bank')
      ? []
      : [{ label: playerLabel(player), value: prefix ? `${side}-${index + 1}` : String(index + 1) }]
  })
}

/** The text of a player in a list: `9 Naam`, or the name alone when he has no number. */
export function playerLabel(player: { name: string; shirtNumber: null | number }) {
  return player.shirtNumber === null ? player.name : `${player.shirtNumber} ${player.name}`
}

/**
 * A player of the report as a choice in a list: the number and the name, as the table of the
 * squad has them. `undefined` for a row that has no name yet.
 */
export function playerOf(
  row: Row,
  side: Side,
  squad: readonly ReportSquadPlayer[],
): undefined | { name: string; shirtNumber: null | number } {
  const chosen = side === 'wij' ? squad.find((player) => String(player.id) === row.keuze) : undefined
  const name = chosen === undefined ? (row.naam ?? '') : chosen.name
  const typed = /^\d{1,2}$/u.test(row.rugnummer ?? '') ? Number(row.rugnummer) : null

  return name === '' ? undefined : { name, shirtNumber: typed ?? chosen?.shirtNumber ?? null }
}

/** Which button of the form was pressed: save, or add or remove a row. */
export function readReportButton(formData: FormData): ReportButton {
  const knop = formData.get('knop')

  if (typeof knop !== 'string') {
    return { kind: 'save' }
  }

  const found = /^(speler|wissel|doelpunt|kaart|strafschop)-(wij|zij)-(toevoegen|weghalen-(\d{1,3}))$/u.exec(knop)

  if (found === null) {
    return { kind: 'save' }
  }

  const row = found[1] as RowKind
  const side = found[2] as Side

  return found[3] === 'toevoegen' ? { kind: 'add', row, side } : { kind: 'remove', number: Number(found[4]), row, side }
}

/** What the request holds, as text. A field left out is an empty string. */
export function readReportValues(formData: FormData): ReportValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value.trim() : ''
  }
  const read = (side: Side): SideRows => {
    const rows = emptySide()

    for (const kind of rowKinds) {
      const numbers = new Set<number>()
      const prefix = new RegExp(`^${kind}-${side}-(\\d{1,3})-`, 'u')

      for (const name of formData.keys()) {
        const found = prefix.exec(name)

        if (found !== null) {
          numbers.add(Number(found[1]))
        }
      }

      rows[kind] = [...numbers]
        .toSorted((a, b) => a - b)
        .map((number) => {
          const row: Row = Object.fromEntries(
            rowFields[kind].map((field) => [field, text(rowFieldId(kind, side, number, field))]),
          )

          // The name is only asked for when the player is not in the squad.
          return kind === 'speler' && side === 'wij' && row.keuze !== otherPlayer ? { ...row, naam: '' } : row
        })
    }

    return rows
  }

  return {
    bron: text('bron'),
    formatie: {
      wij: { eigen: text(formationOwnId('wij')), keuze: text(formationId('wij')) },
      zij: { eigen: text(formationOwnId('zij')), keuze: text(formationId('zij')) },
    },
    status: text('status'),
    tegenstander: text('tegenstander'),
    wij: read('wij'),
    zij: read('zij'),
  }
}

/** The sides in words. */
export function sideName(side: Side, opponent: string) {
  return side === 'wij' ? 'sc Heerenveen' : opponent
}

/**
 * The players of the squad that a row of ours can choose. A player is in the report once, in
 * the line-up or on the bench: a place on the bench takes the players of the squad who are not
 * in the line-up and not on the bench already, and a place in the line-up takes those who are
 * not in the line-up already, so a player of the bench can be chosen for the line-up (see
 * `clearTakenPlayers`, which then empties his place on the bench). The player the row has now
 * stays in the list.
 */
export function squadChoicesForRow(
  values: ReportValues,
  index: number,
  squad: readonly ReportSquadPlayer[],
): ReportSquadPlayer[] {
  const rows = values.wij.speler
  const own = rows[index]
  const onBench = own?.rol === 'bank'
  const taken = new Set(
    rows.flatMap((row, other) =>
      other === index || row.keuze === undefined || row.keuze === '' || (!onBench && row.rol === 'bank')
        ? []
        : [row.keuze],
    ),
  )

  return squad.filter((player) => !taken.has(String(player.id)) || String(player.id) === own?.keuze)
}
