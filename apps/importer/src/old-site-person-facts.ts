import { persons, type PlayerPosition, players } from '@fansite/db/schema'
// The step `linie en land` of `import:old-site` (#1052): gives a person the line and the
// country of his row in the table of players of the old fansite (`players.json`). It fills
// only what is empty or comes from a weaker source, so what the editors, Wikidata and (for the
// country) the list of players say stays. It asks nothing and reads no name: the person is the
// one of the rows in `players` that the step `spelers` made or found for the old player.
import { isCountryCode } from '@fansite/shared/countries'
import { eq, inArray, isNull } from 'drizzle-orm'

import type { OldSiteMatch, OldSitePlayer } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { deriveOldSitePlayers, oldSitePlayerIds, oldSitePlayerKey } from './old-site-players.ts'
import { printable } from './text.ts'

/**
 * The country codes of the old table `speler.nationaliteit`, with the code of two letters we
 * use (`@fansite/shared/countries`). The old site wrote its own codes, and some of them are the
 * code of another country in ISO 3166: `CR` was Croatia (Costa Rica in ISO), `MA` Macedonia
 * (Morocco in ISO) and `MC` Morocco (Monaco in ISO). So every code is listed, also the ones
 * that are the same, and a code that is not here gives no country: `YU` (Yugoslavia) is gone,
 * and a code a later export adds is first looked at by a person. Checked on 10 November 2026
 * against the players that have each code.
 */
export const oldSiteCountryCodes: ReadonlyMap<string, string> = new Map([
  ['AU', 'AU'],
  ['BE', 'BE'],
  ['BR', 'BR'],
  ['BU', 'BG'], // Bulgaria
  ['CA', 'CA'],
  ['CR', 'HR'], // Croatia
  ['DK', 'DK'],
  ['FI', 'FI'],
  ['GH', 'GH'],
  ['GR', 'GR'],
  ['MA', 'MK'], // Macedonia, now North Macedonia
  ['MC', 'MA'], // Morocco
  ['MD', 'MD'],
  ['MR', 'MA'], // Morocco, written a second way
  ['NG', 'NG'],
  ['NL', 'NL'],
  ['NO', 'NO'],
  ['OO', 'AT'], // Austria (Oostenrijk)
  ['PL', 'PL'],
  ['RO', 'RO'],
  ['RU', 'RU'],
  ['SE', 'SE'],
  ['SP', 'ES'], // Spain
  ['SR', 'SR'],
  ['VS', 'US'], // the United States (Verenigde Staten)
  ['ZA', 'ZA'],
])

/** What the old table says about one person, with the codes of the old players it came from. */
type Facts = {
  codes: string[]
  /** The countries the old players of this person have: more than one is a conflict. */
  countries: Set<string>
  lines: Set<PlayerPosition>
}

/**
 * Gives the persons of the old players their line and their country. An old player belongs to
 * a person through his rows in `players`: the rows of his seasons and name
 * (`oldSitePlayerKey`), as the steps `spelers`, `doelpunten` and `opstellingen` find them. An
 * old player without such a row, or whose rows have no person, is skipped and counted; so is
 * one whose rows have two persons, and a person whose old players disagree gets nothing for
 * that field.
 *
 * The line goes on a person without a line, or with the line of the squad lists; the country
 * on a person without a country, or with the one of the squad lists. Both get the source
 * `old-site`. A value of this source is corrected when the files change. A code of a country
 * that `oldSiteCountryCodes` does not know is a line in the log and no country. A second run
 * changes nothing.
 */
export async function importOldSitePersonFacts(
  db: OldSiteDatabase,
  oldMatches: readonly OldSiteMatch[],
  oldPlayers: readonly OldSitePlayer[],
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const refs = deriveOldSitePlayers(oldMatches, oldPlayers)
  const rowIds = await oldSitePlayerIds(db, [...new Set(refs.map((ref) => ref.season))])
  const rowsOfCode = new Map<string, number[]>()

  for (const ref of refs) {
    const id = rowIds.get(oldSitePlayerKey(ref.season, ref.name))

    if (id !== undefined) {
      rowsOfCode.set(ref.code, [...(rowsOfCode.get(ref.code) ?? []), id])
    }
  }

  const personOfRow = new Map<number, number>()
  const allRows = [...new Set([...rowsOfCode.values()].flat())]

  for (let start = 0; start < allRows.length; start += 500) {
    for (const row of await db
      .select({ id: players.id, personId: players.personId })
      .from(players)
      .where(inArray(players.id, allRows.slice(start, start + 500)))) {
      if (row.personId !== null) {
        personOfRow.set(row.id, row.personId)
      }
    }
  }

  const facts = new Map<number, Facts>()
  const withoutPerson: string[] = []
  const unknownCountries: string[] = []

  for (const player of oldPlayers) {
    const people = new Set(
      (rowsOfCode.get(player.code) ?? []).flatMap((id) => {
        const person = personOfRow.get(id)

        return person === undefined ? [] : [person]
      }),
    )
    const [personId] = people

    if (personId === undefined) {
      report.skipped += 1
      withoutPerson.push(player.code)
      continue
    }
    if (people.size > 1) {
      report.skipped += 1
      report.lines.push(`skipped ${printable(player.code)}: its rows in players have ${people.size} persons`)
      continue
    }

    const one = facts.get(personId) ?? { codes: [], countries: new Set(), lines: new Set() }

    one.codes.push(player.code)
    if (player.line !== null) {
      one.lines.add(player.line)
    }
    if (player.country !== null) {
      const country = oldSiteCountryCodes.get(player.country)

      if (country === undefined || !isCountryCode(country)) {
        unknownCountries.push(`${player.code} (${player.country})`)
      } else {
        one.countries.add(country)
      }
    }
    facts.set(personId, one)
  }

  const stored = new Map<number, typeof persons.$inferSelect>()
  const personIds = [...facts.keys()]

  for (let start = 0; start < personIds.length; start += 500) {
    for (const person of await db
      .select()
      .from(persons)
      .where(inArray(persons.id, personIds.slice(start, start + 500)))) {
      stored.set(person.id, person)
    }
  }

  let lines = 0
  let countries = 0

  for (const [personId, one] of facts) {
    const person = stored.get(personId)

    if (person === undefined) {
      continue
    }

    const [line] = one.lines
    const [country] = one.countries
    const change: { country?: string; countrySource?: 'old-site'; line?: PlayerPosition; lineSource?: 'old-site' } = {}

    if (one.lines.size > 1 || one.countries.size > 1) {
      report.lines.push(
        `${printable(one.codes.join(' and '))} are one person and differ in ${[...(one.lines.size > 1 ? ['line'] : []), ...(one.countries.size > 1 ? ['country'] : [])].join(' and ')}, so that is not filled in`,
      )
    }
    if (
      line !== undefined &&
      one.lines.size === 1 &&
      (person.lineSource === null ||
        person.lineSource === 'squad' ||
        (person.lineSource === 'old-site' && person.line !== line))
    ) {
      change.line = line
      change.lineSource = 'old-site'
      lines += 1
    }
    if (
      country !== undefined &&
      one.countries.size === 1 &&
      (person.countrySource === null ||
        person.countrySource === 'squad' ||
        (person.countrySource === 'old-site' && person.country !== country))
    ) {
      change.country = country
      change.countrySource = 'old-site'
      countries += 1
    }

    if (Object.keys(change).length === 0) {
      report.unchanged += 1
    } else {
      await db.update(persons).set(change).where(eq(persons.id, personId))
      report.changed += 1
    }
  }

  if (withoutPerson.length > 0) {
    report.lines.push(
      `${withoutPerson.length} old ${withoutPerson.length === 1 ? 'player has' : 'players have'} no person, so nothing is filled in: ${printable(withoutPerson.join(', '))}`,
    )
  }
  if (unknownCountries.length > 0) {
    report.lines.push(
      `the country of ${unknownCountries.length} old ${unknownCountries.length === 1 ? 'player is' : 'players is'} not one we know, so it is left empty: ${printable(unknownCountries.join(', '))}`,
    )
  }

  const noLine = (await db.select({ id: persons.id }).from(persons).where(isNull(persons.line))).length
  const noCountry = (await db.select({ id: persons.id }).from(persons).where(isNull(persons.country))).length

  report.lines.push(
    `${lines} ${lines === 1 ? 'line' : 'lines'} and ${countries} ${countries === 1 ? 'country' : 'countries'} filled in from the old fansite`,
    `persons without a line: ${noLine}, without a country: ${noCountry}`,
  )

  return report
}
