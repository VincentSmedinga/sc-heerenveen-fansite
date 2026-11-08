import { playerNameMaxLength } from '@fansite/db/schema'
import { formationProblem } from '@fansite/shared/match-report'

import {
  emptyRow,
  emptySide,
  formationValueOf,
  noFormation,
  type ReportSquadPlayer,
  type ReportValues,
  type Row,
  type Side,
} from './report-fields'

// Reads the text an editor pasted into the values of the form of a report (see report-form.ts).
// It has no database and writes nothing: the form it gives back is checked and saved by the
// same code as a form typed by hand. The format is in the decision _Het formaat is een tekst
// met kopjes_ in docs/beslissingen/site.md.

/** The most lines that are read. A text can not be made long with short lines. */
export const pasteMaxLines = 500

/** A line with a doubt: the editor chooses in the form. `names` are the players it may be. */
export type PasteChoice = { line: number; message: string; names: string[]; text: string }

/** A line that was read, and what it was read as. */
export type PasteRead = { line: number; meaning: string; text: string }

export type PasteResult = {
  choices: PasteChoice[]
  read: PasteRead[]
  unread: PasteUnread[]
  values: ReportValues
}

/** A line that was not read, and why. It changes nothing in the form. */
export type PasteUnread = { line: number; reason: string; text: string }

/** The headings of the text, as the editor writes them in lower case. */
const headings = {
  bank: 'bank',
  doelpunten: 'doelpunt',
  kaarten: 'kaart',
  opstelling: 'speler',
  strafschoppen: 'strafschop',
  wissels: 'wissel',
} as const

/** A player as the text names him, in a list of the side: where he is and how he is called. */
type Candidate = { index: number; name: string; number: null | number; term: string }

type Lookup = { index: number; kind: 'found' } | { kind: 'ambiguous'; names: string[] } | { kind: 'none' }

type Placed = { candidate: Candidate; line: number }

type Section = keyof typeof headings

/**
 * What is left of a text after the accents and the capitals: the form names are compared so.
 */
export function fold(text: string) {
  return text.normalize('NFD').replaceAll(/\p{M}/gu, '').toLocaleLowerCase('nl').replaceAll(/\s+/gu, ' ').trim()
}

/**
 * Finds a player in a list by what the text says of him: a number, or a name. A number is
 * looked for first, then the whole name, then the surname. Nobody is guessed: not exactly one
 * player is a doubt (`ambiguous`) or nothing (`none`).
 */
function lookup(list: readonly Candidate[], text: string): Lookup {
  const asNumber = /^\d{1,2}$/u.test(text) ? Number(text) : undefined
  const steps =
    asNumber === undefined
      ? [
          list.filter((player) => fold(player.name) === fold(text)),
          list.filter((player) => fold(player.term) === fold(text)),
        ]
      : [list.filter((player) => player.number === asNumber)]

  for (const found of steps) {
    if (found.length === 1) {
      return { index: found[0]!.index, kind: 'found' }
    }

    if (found.length > 1) {
      return { kind: 'ambiguous', names: found.map((player) => player.name) }
    }
  }

  return { kind: 'none' }
}

/** The last word or words of a name as a surname, for a name the text gives without parts. */
function termOf(name: string) {
  const words = name.trim().split(' ')
  // A prefix in small letters belongs to the surname: `van Aken`, `van der Voort`.
  const at = words.findIndex((word, index) => index > 0 && /^\p{Ll}/u.test(word))

  return at === -1 ? (words.at(-1) ?? '') : words.slice(at).join(' ')
}

/** The minute and the added time at the start of an event line, and what follows. */
const eventLine = /^(\d{1,3})(?:\+(\d{1,2}))?\s+(.+)$/u

/** What a stored report holds, in words, for the question whether pasting may replace it. */
export function describeStored(report: {
  appearances: readonly unknown[]
  cards: readonly unknown[]
  incidents: readonly unknown[]
  substitutions: readonly unknown[]
}) {
  const count = (number: number, one: string, more: string) => `${number} ${number === 1 ? one : more}`

  return [
    count(report.appearances.length, 'speler', 'spelers'),
    count(report.substitutions.length, 'wissel', 'wissels'),
    count(report.cards.length, 'kaart', 'kaarten'),
    count(report.incidents.length, 'strafschop', 'strafschoppen'),
  ].join(', ')
}

/**
 * Reads the text. `squad` is the squad of the season of the match, for the players of ours;
 * `previous` is what the form had, of which the source stays.
 */
export function readPastedReport(
  text: string,
  squad: readonly ReportSquadPlayer[],
  previous: { bron: string } = { bron: '' },
): PasteResult {
  const values: ReportValues = {
    bron: previous.bron,
    formatie: { wij: noFormation(), zij: noFormation() },
    status: 'bezig',
    tegenstander: 'nee',
    wij: emptySide(),
    zij: emptySide(),
  }
  const read: PasteRead[] = []
  const unread: PasteUnread[] = []
  const choices: PasteChoice[] = []
  const lines = text.split(/\r\n|\r|\n/u)

  type Entry = { line: number; section: Section; side: Side; text: string }

  // First the lines, with the heading they stand under.
  const entries: Entry[] = []
  // The lines "Formatie: 4-3-3" and the side they stand under: they are read after the players.
  const formationLines: { line: number; side: Side; text: string; value: string }[] = []
  let current: Side = 'wij'
  let section: Section | undefined
  let counted = 0

  for (const [index, raw] of lines.entries()) {
    const line = index + 1
    const content = raw.trim()

    if (content === '' || content.startsWith('#')) {
      continue
    }

    counted += 1

    if (counted > pasteMaxLines) {
      unread.push({ line, reason: `Er worden hoogstens ${pasteMaxLines} regels gelezen.`, text: content.slice(0, 120) })
      break
    }

    const heading = fold(content.replace(/:$/u, ''))

    if (heading === 'tegenstander') {
      current = 'zij'
      section = undefined
      read.push({ line, meaning: 'Kopje: de tegenstander', text: content })
    } else if (Object.hasOwn(headings, heading)) {
      section = heading as Section
      read.push({ line, meaning: `Kopje: ${heading}`, text: content })
    } else if (/^formatie\s*:/iu.test(content)) {
      formationLines.push({ line, side: current, text: content, value: content.replace(/^formatie\s*:/iu, '').trim() })
    } else if (section === undefined) {
      unread.push({ line, reason: 'Deze regel staat niet onder een kopje.', text: content.slice(0, 120) })
    } else {
      entries.push({ line, section, side: current, text: content })
    }
  }

  const shown = (content: string) => content.slice(0, 120)
  const miss = (entry: Entry, reason: string) => unread.push({ line: entry.line, reason, text: shown(entry.text) })
  // What an editor typed comes back in a sentence, so a sentence is as long as a line may be.
  const cap = (sentence: string) => (sentence.length > 300 ? `${sentence.slice(0, 299)}…` : sentence)
  const doubt = (entry: Entry, message: string, names: string[] = []) =>
    choices.push({ line: entry.line, message: cap(message), names, text: shown(entry.text) })
  const meant = (entry: Entry, meaning: string) =>
    read.push({ line: entry.line, meaning: cap(meaning), text: shown(entry.text) })
  const sideWords = (of: Side) => (of === 'wij' ? 'sc Heerenveen' : 'de tegenstander')

  // The formations: the same rule as the form, and a value that is wrong is a line that was not
  // read, with the reason, and never a formation that is guessed.
  const formed = new Set<Side>()

  for (const found of formationLines) {
    const team = sideWords(found.side)
    const problem =
      found.value === '' ? 'Schrijf de formatie erachter, zoals "Formatie: 4-3-3".' : formationProblem(found.value)

    if (problem !== undefined) {
      unread.push({ line: found.line, reason: `Formatie van ${team}: ${problem}`, text: shown(found.text) })
    } else if (formed.has(found.side)) {
      unread.push({
        line: found.line,
        reason: `${team} heeft al een formatie: schrijf er één.`,
        text: shown(found.text),
      })
    } else {
      formed.add(found.side)
      values.formatie[found.side] = formationValueOf(found.value)
      read.push({
        line: found.line,
        meaning: `Formatie ${team}: ${found.value}`,
        text: shown(found.text),
      })
    }
  }

  // The players, line-up and bench, since the other lines point to them.
  const people: Record<Side, Placed[]> = { wij: [], zij: [] }
  const placedBefore: Record<Side, Set<string>> = { wij: new Set(), zij: new Set() }

  for (const entry of entries.filter((item) => item.section === 'opstelling' || item.section === 'bank')) {
    const side = entry.side
    // The captain is marked with (a) at the end, behind the name or the number.
    const captain = /\s+\(a\)$/iu.test(entry.text)
    const withoutMark = entry.text.replace(/\s+\(a\)$/iu, '')
    const found = /^(\d{1,2})(?:\s+(.+))?$/u.exec(withoutMark)

    // A line that does not start with a figure is a name without a shirt number, as in the old
    // line-ups. A line that starts with a figure but is not a number and a name is a mistake.
    if (found === null && (withoutMark === '' || /^\d/u.test(withoutMark))) {
      miss(entry, 'Begin met het rugnummer, zoals "4 Van Aken" of "4 Van Aken (a)", of schrijf alleen de naam.')

      continue
    }

    const number = found === null ? null : Number(found[1])
    const name = found === null ? withoutMark.trim() : (found[2]?.trim() ?? '')

    if (number !== null && number < 1) {
      miss(entry, 'Een rugnummer is een getal van 1 tot en met 99.')

      continue
    }

    if (name.length > playerNameMaxLength) {
      miss(entry, `Een naam heeft hoogstens ${playerNameMaxLength} tekens.`)

      continue
    }

    if (captain && entry.section === 'bank') {
      miss(entry, 'Een speler op de bank kan in het formulier geen aanvoerder zijn.')

      continue
    }

    const row: Row = {
      ...emptyRow('speler'),
      keuze: '',
      naam: '',
      rol: entry.section === 'bank' ? 'bank' : captain ? 'aanvoerder' : 'basis',
      rugnummer: number === null ? '' : String(number),
    }
    let label = number === null ? name : name === '' ? `rugnummer ${number}` : `${number} ${name}`

    if (side === 'zij') {
      if (name === '') {
        miss(entry, 'Een speler van de tegenstander heeft een naam nodig.')

        continue
      }

      row.naam = name
    } else {
      // Ours: the number in the squad first, then the whole name, then the surname.
      const byNumber = number === null ? [] : squad.filter((player) => player.shirtNumber === number)
      const mine = squad.map((player, index) => ({
        index,
        name: player.name,
        number: player.shirtNumber,
        term: player.searchTerm ?? termOf(player.name),
      }))
      const named = name === '' ? undefined : lookup(mine, name)
      let chosen: ReportSquadPlayer | undefined
      let names: string[] = []

      // A name that matches nobody is a typing error of the number's player only when it is
      // part of his name; otherwise the number and the name disagree and the editor decides.
      // Whole words of the name only: `Aken` and `Joost` agree with Joost van Aken, `Voskuilen`
      // does not agree with a Vos.
      const agrees = (player: ReportSquadPlayer) => {
        const words = fold(player.name).split(' ')

        return fold(name)
          .split(' ')
          .every((word) => words.includes(word))
      }

      if (
        byNumber.length === 1 &&
        (named === undefined ||
          (named.kind === 'none' && agrees(byNumber[0]!)) ||
          (named.kind === 'found' && squad[named.index] === byNumber[0]))
      ) {
        chosen = byNumber[0]
      } else if (byNumber.length === 0 && named?.kind === 'found') {
        chosen = squad[named.index]
      } else if (byNumber.length === 1 && named?.kind === 'found') {
        // The number and the name are two players: the editor decides.
        names = [byNumber[0]!.name, squad[named.index]!.name]
      } else if (named?.kind === 'ambiguous') {
        names = named.names
      } else if (byNumber.length > 1) {
        names = byNumber.map((player) => player.name)
      } else if (byNumber.length === 1) {
        names = [byNumber[0]!.name]
      }

      if (chosen !== undefined) {
        row.keuze = String(chosen.id)
        label = number === null ? chosen.name : `${number} ${chosen.name}`
      } else {
        row.naam = name

        if (names.length > 0) {
          doubt(entry, `Regel ${entry.line}: ${label}. Kies de speler in het formulier.`, names)
        } else {
          doubt(
            entry,
            name === ''
              ? `Regel ${entry.line}: rugnummer ${number} staat niet in de selectie. Kies een speler of Andere speler.`
              : `Regel ${entry.line}: ${name} staat niet in de selectie. Kies een speler of Andere speler.`,
          )
        }
      }
    }

    // A player is in the report once: a second place for the same player, in the line-up or on
    // the bench, is not read, so the form never starts with him twice.
    const who = row.keuze !== '' ? `id:${row.keuze}` : `naam:${(row.naam ?? '').toLocaleLowerCase('nl')}`

    if (row.keuze !== '' || (row.naam ?? '') !== '') {
      if (placedBefore[side].has(who)) {
        miss(entry, `${label} staat al in de opstelling of op de bank van deze kant.`)

        continue
      }

      placedBefore[side].add(who)
    }

    values[side].speler.push(row)
    people[side].push({
      candidate: {
        index: values[side].speler.length - 1,
        name:
          row.naam !== '' ? (row.naam ?? '') : (squad.find((player) => String(player.id) === row.keuze)?.name ?? ''),
        number,
        term: termOf(
          row.naam !== '' ? (row.naam ?? '') : (squad.find((player) => String(player.id) === row.keuze)?.name ?? ''),
        ),
      },
      line: entry.line,
    })
    meant(
      entry,
      `${entry.section === 'bank' ? 'Bank' : 'Opstelling'} ${sideWords(side)}: ${label}${captain ? ', aanvoerder' : ''}`,
    )
  }

  /** The player a name or a number in an event line points to, as the number of his row. */
  const point = (entry: Entry, of: Side, who: string, what: string): '' | string | undefined => {
    const found = lookup(
      people[of].map((placed) => placed.candidate),
      who,
    )

    if (found.kind === 'found') {
      return String(found.index + 1)
    }

    if (found.kind === 'ambiguous') {
      doubt(
        entry,
        `Regel ${entry.line}: ${what} ${who} kan meer spelers zijn. Kies er één in het formulier.`,
        found.names,
      )

      return ''
    }

    return undefined
  }

  for (const entry of entries) {
    if (entry.section === 'opstelling' || entry.section === 'bank') {
      continue
    }

    const found = eventLine.exec(entry.text)

    if (found === null) {
      miss(entry, 'Begin met de minuut, zoals "34 geel Jansen" of "90+2 Smit voor Jansen".')

      continue
    }

    const minuut = found[1] ?? ''
    const extra = found[2] ?? ''
    const rest = (found[3] ?? '').trim()
    const side = entry.side
    const clock = extra === '' ? minuut : `${minuut}+${extra}`
    const nameTooLong = (value: string) => value.length > playerNameMaxLength

    if (entry.section === 'wissels') {
      const parts = /^(.+?)\s+voor\s+(.+)$/iu.exec(rest)

      if (parts === null) {
        miss(entry, 'Schrijf een wissel als "61 12 voor 8": wie erin komt, en voor wie.')

        continue
      }

      const erin = point(entry, side, parts[1] ?? '', 'de speler die erin komt,')
      const eruit = point(entry, side, parts[2] ?? '', 'de speler die eruit gaat,')

      if (erin === undefined || eruit === undefined) {
        miss(entry, 'Een speler van de wissel staat niet in de opstelling of op de bank van deze kant.')

        continue
      }

      values[side].wissel.push({ ...emptyRow('wissel'), erin, eruit, extra, minuut })
      meant(entry, `Wissel ${sideWords(side)} in minuut ${clock}: ${parts[1]} voor ${parts[2]}`)
    } else if (entry.section === 'kaarten') {
      const parts = /^(geel-rood|geel|rood)\s+(.+)$/iu.exec(rest)

      if (parts === null) {
        miss(entry, 'Schrijf een kaart als "34 geel Jansen": geel, geel-rood of rood, en de speler.')

        continue
      }

      const speler = point(entry, side, parts[2] ?? '', 'de speler')

      if (speler === undefined) {
        miss(entry, 'De speler van de kaart staat niet in de opstelling of op de bank van deze kant.')

        continue
      }

      values[side].kaart.push({ ...emptyRow('kaart'), extra, minuut, soort: fold(parts[1] ?? ''), speler })
      meant(entry, `${fold(parts[1] ?? '')} ${sideWords(side)} in minuut ${clock}: ${parts[2]}`)
    } else if (entry.section === 'strafschoppen') {
      const parts = /^(gemist|gestopt)\s+(.+)$/iu.exec(rest)

      if (parts === null) {
        miss(entry, 'Schrijf een strafschop als "55 gemist Jansen": gemist of gestopt, en de nemer.')

        continue
      }

      const speler = point(entry, side, parts[2] ?? '', 'de nemer')

      if (speler === undefined) {
        miss(entry, 'De nemer staat niet in de opstelling of op de bank van deze kant.')

        continue
      }

      values[side].strafschop.push({
        ...emptyRow('strafschop'),
        extra,
        minuut,
        soort: `strafschop-${fold(parts[1] ?? '')}`,
        speler,
      })
      meant(entry, `Strafschop ${fold(parts[1] ?? '')} in minuut ${clock}: ${parts[2]}`)
    } else {
      // A goal: the side under which it stands is the side that gets it. An own goal is of a
      // player of the other side.
      let tail = rest
      let soort = 'gewoon'

      if (/\s+eigen doelpunt$/iu.test(tail)) {
        soort = 'eigen'
        tail = tail.replace(/\s+eigen doelpunt$/iu, '')
      } else if (/\s+penalty$/iu.test(tail)) {
        soort = 'strafschop'
        tail = tail.replace(/\s+penalty$/iu, '')
      }

      const [scorerText = '', assistText] = tail.split(/\s+assist\s+/iu, 2)
      const scorerSide: Side = soort === 'eigen' ? (side === 'wij' ? 'zij' : 'wij') : side
      const scorerName = scorerText.trim()

      if (scorerName === '') {
        miss(entry, 'Schrijf een doelpunt als "23 Smit" met "assist Jansen", "penalty" of "eigen doelpunt" erachter.')

        continue
      }

      const scorer = point(entry, scorerSide, scorerName, 'de speler die scoorde,')
      const row: Row = { ...emptyRow('doelpunt'), assist: '', extra, minuut, naam: '', soort, speler: '' }

      if (scorer === undefined) {
        // A scorer of the opponent need not be in the report: his name is enough.
        if (scorerSide === 'zij' && values.zij.speler.filter((player) => player.rol !== 'bank').length < 11) {
          if (nameTooLong(scorerName)) {
            miss(entry, `Een naam heeft hoogstens ${playerNameMaxLength} tekens.`)

            continue
          }

          row.naam = scorerName
        } else {
          miss(entry, 'De speler die scoorde staat niet in de opstelling of op de bank van zijn kant.')

          continue
        }
      } else if (scorer !== '') {
        row.speler = `${scorerSide}-${scorer}`
      }

      if (assistText !== undefined && assistText.trim() !== '') {
        const assist = point(entry, scorerSide, assistText.trim(), 'de assist,')

        if (assist === undefined) {
          doubt(
            entry,
            `Regel ${entry.line}: de assist ${assistText.trim()} staat niet in de opstelling of op de bank. Kies de assist in het formulier.`,
          )
        } else if (assist !== '') {
          row.assist = `${scorerSide}-${assist}`
        }
      }

      values[side].doelpunt.push(row)
      meant(
        entry,
        `Doelpunt voor ${sideWords(side)} in minuut ${clock}: ${scorerName}${soort === 'gewoon' ? '' : `, ${soort === 'eigen' ? 'eigen doelpunt' : 'strafschop'}`}${assistText === undefined ? '' : `, assist ${assistText.trim()}`}`,
      )
    }
  }

  // A side without players gets the empty rows a new report has.
  if (values.wij.speler.length === 0) {
    values.wij.speler = Array.from({ length: 11 }, () => emptyRow('speler'))
  }

  // The opponent is complete when the text has eleven players in his line-up.
  values.tegenstander = values.zij.speler.filter((row) => row.rol !== 'bank').length === 11 ? 'ja' : 'nee'

  return {
    choices: choices.toSorted((a, b) => a.line - b.line),
    read: read.toSorted((a, b) => a.line - b.line),
    unread: unread.toSorted((a, b) => a.line - b.line),
    values,
  }
}
