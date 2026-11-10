// Reads the squad of a season that is over from the pages of Wikipedia that have it
// (`squadSources`), puts what the readers find together per player, and stores it in `players`.
// The commands `import:squad` and `import:squads` are in `import-squads.ts`.
//
// A past season is read once, by hand, and gets what Wikipedia has. A season without a page is
// a gap in the log and no row. A season with a part of the squad keeps that part, with the
// source of each row. A second read adds and improves but never removes a player, because the
// goals point to his row (decision of 5 November 2026).
import type { Database } from '@fansite/db/client'
import type { Player, PlayerPosition, PlayerSource } from '@fansite/db/schema'

import { mergeEditorsPersonInto } from '@fansite/db/person-merge'
import { createPersonBook, storePersonNames } from '@fansite/db/persons'
import {
  type FoundFieldDifference,
  holdEditorsFields,
  keepPlayerFieldDifferences,
} from '@fansite/db/player-field-differences'
import {
  persons,
  playerNameMaxLength,
  players,
  playerSources,
  squadImports,
  wikipediaPageMaxLength,
  wikipediaPages,
} from '@fansite/db/schema'
import { and, eq, inArray, isNull, ne, type SQL } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { MatchImportOptions } from './import-matches.ts'
import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'
import type { CompletenessTotals } from './store-completeness.ts'

import { addEnglishOnly, findEnglishPersons } from './english-persons.ts'
import { englishWikipediaOrigin, healthAfter, isPastSeason, wikipediaOrigin } from './import-matches.ts'
import { pauseBetweenRequests, wikidataOrigin } from './import-person-data.ts'
import { editorsByPerson, scorersByPerson, storeChosenSpellings } from './import-squad.ts'
import { linkPersonsByName, wikipediaTitleLookup } from './old-site-persons.ts'
import { aliasMap, chosenSpelling, personTitleAliases } from './person-names.ts'
import { describePersons, guessedNameWarnings, lookUpPersonPages, mergeListedPersons } from './person-pages.ts'
import { nameKey, searchTerm } from './read-squad.ts'
import { pageUrl } from './read-wikipedia.ts'
import { squadSources } from './squad-sources.ts'
import { describeChange, storeCompleteness } from './store-completeness.ts'
import { describeError, printable } from './text.ts'

/** A player as the readers of a season give him, put together (see `mergePlayers`). */
export type MergedPlayer = {
  /** The code of two letters of the flag, from the best list that shows one (`NL`). */
  country: null | string
  /** The page of the English Wikipedia of the name, from the English reader (issue 1043). */
  englishPage: null | string
  name: string
  page: null | string
  /** The person found by name, before the store asks the person book (`findEnglishPersons`). */
  personId: null | number
  position: null | PlayerPosition
  shirtNumber: null | number
  /** The best source of the lists that have him. */
  source: PlayerSource
}

/** What came of reading the squad of a season that is over. Like a match report, a value. */
export type PastSquadReport =
  | {
      /** The chance that the list is the whole squad, as a line (see `storeCompleteness`). */
      completeness: string
      /** How many of the players found have a country, as the tables give it. */
      countries: { known: number; total: number }
      kind: 'imported'
      /** The pages that gave players. */
      pages: number
      persons: string[]
      players: { added: number; improved: number; unchanged: number }
      season: string
      warnings: string[]
    }
  | {
      /** The page has changed shape or could not be read: nothing changed. */
      kind: 'error'
      message: string
      season: string
    }
  | {
      /** The season has no page, or no page with a table: a gap, and no fault. */
      kind: 'none'
      season: string
    }
  | {
      kind: 'blocked-by-robots'
      season: string
      url: string
    }
  | {
      kind: 'wait'
      retryAfterSeconds: null | number
      season: string
      url: string
    }

/** What one reader of a page found: the players, and where they come from. */
type ReadOfPage = { players: SeasonPlayer[]; source: PlayerSource }

/** A read of a page with the sums its table gave (see `totalsOf`). */
type ReadWithTotals = CompletenessTotals & ReadOfPage

/** Writes a report as a line of text. */
export function formatPastSquadReport(report: PastSquadReport): string {
  const head = `Squad ${report.season}`

  switch (report.kind) {
    case 'blocked-by-robots':
      return `${head}: not read, robots.txt does not allow ${report.url}`
    case 'error':
      return `${head}: warning, nothing changed: ${printable(report.message)}`
    case 'imported':
      return [
        `${head}: ${report.players.added} new, ${report.players.improved} improved, ${report.players.unchanged} unchanged, from ${report.pages} ${report.pages === 1 ? 'page' : 'pages'}`,
        `${head}: countries of the players: ${report.countries.known} of ${report.countries.total} have one`,
        ...report.persons.map((line) => `${head}: ${printable(line)}`),
        report.completeness,
        ...report.warnings.map((warning) => `${head}: warning, ${printable(warning)}`),
      ].join('\n')
    case 'none':
      return `${head}: no squad page on Wikipedia, so no squad`
    case 'wait':
      return `${head}: not read, Wikipedia asks us to wait${report.retryAfterSeconds === null ? '' : ` ${report.retryAfterSeconds} seconds`}`
  }
}

/**
 * Reads the squad of a season that is over, once, and stores it. It asks each page of
 * `squadSources` one time (a page with more than one reader is fetched once), runs the readers,
 * puts their players together and stores them in one transaction. It asks as often as it is
 * run: the hourly pause of the current season does not apply to a season that is over.
 *
 * A page that does not exist or has no table gives no players. When no page gives any, the
 * season is a gap and nothing is written. A page that fails, or a reader that reports an error,
 * leaves the whole season as it was, with a report that says why, so a season is never stored
 * half read by mistake. A season that is not over is an error, and nothing is asked or written.
 * It throws when the database can't be written; the pages themselves fail into an error report.
 */
export async function importPastSquad(
  db: Database,
  fetcher: Fetcher,
  season: string,
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    origin = wikipediaOrigin,
    pause = pauseBetweenRequests,
    // Without an address of its own, only the real Wikipedia is read together with the real
    // Wikidata, so a test with its own Wikipedia reaches no real site.
    wikidata = origin === wikipediaOrigin ? wikidataOrigin : null,
  }: MatchImportOptions & { pause?: number; wikidata?: null | string } = {},
): Promise<PastSquadReport> {
  if (!isPastSeason(season, clock())) {
    return {
      kind: 'error',
      message: `${season} is not a season that is over; the hourly import reads the current season`,
      season,
    }
  }

  const sources = squadSources(season)

  if (sources.length === 0) {
    return { kind: 'none', season }
  }

  const reads: ReadWithTotals[] = []
  const pagesRead: { title: string; version: null | string }[] = []
  const warnings: string[] = []

  for (const source of sources) {
    const outcome = await fetcher.fetch(pageUrl(source.origin === 'english' ? englishOrigin : origin, source.title))

    if (outcome.kind === 'error' && outcome.reason === 'http-status' && outcome.status === 404) {
      warnings.push(`${source.title}: the page does not exist`)

      continue
    }

    switch (outcome.kind) {
      case 'blocked-by-robots':
        return await recorded(db, { kind: 'blocked-by-robots', season, url: outcome.url }, clock)
      case 'error':
        return await recorded(db, { kind: 'error', message: `${source.title}: ${outcome.message}`, season }, clock)
      case 'fetched':
        break
      case 'not-modified':
        return await recorded(
          db,
          { kind: 'error', message: `${source.title}: the page answered 304 to a request without conditions`, season },
          clock,
        )
      case 'wait':
        return await recorded(
          db,
          { kind: 'wait', retryAfterSeconds: outcome.retryAfterSeconds, season, url: outcome.url },
          clock,
        )
    }

    const text = new TextDecoder('utf-8').decode(outcome.body)
    let gave = false

    for (const reader of source.readers) {
      let read: SeasonSquad

      try {
        read = reader.read(text)
      } catch (error) {
        read = { kind: 'error', message: describeError(error) }
      }

      if (read.kind === 'error') {
        return await recorded(
          db,
          { kind: 'error', message: `${source.title} (${reader.name}): ${read.message}`, season },
          clock,
        )
      }
      if (read.kind === 'none') {
        warnings.push(`${source.title} (${reader.name}): ${read.reason}`)

        continue
      }

      gave = true
      reads.push({
        goalsTotal: read.goalsTotal,
        matchesTotal: read.appearancesTotal,
        players: read.players,
        source: read.source,
      })
      warnings.push(...read.warnings.map((warning) => `${source.title} (${reader.name}): ${warning}`))
    }

    if (gave) {
      pagesRead.push({ title: source.title, version: outcome.lastModified })
    }
  }

  if (reads.length === 0) {
    return { kind: 'none', season }
  }

  const merged = mergePlayers(reads)

  warnings.push(...merged.warnings)

  // As in `import-squad.ts`: a spelling the owner replaced becomes the one that stays.
  for (const player of merged.players) {
    const chosen = chosenSpelling(player.name, player.page)

    player.name = chosen.name
    player.page = chosen.page
  }

  const mergedPersons = await mergeListedPersons(db)
  // Wikipedia is asked before the transaction: no request is made while rows are locked.
  const english = await findEnglishPersons(db, fetcher, merged.players, {
    englishOrigin,
    pause,
    wikidataOrigin: wikidata,
  })
  // An English title leads to the Dutch one, or is a person of its own (issue 1043).
  const aliases = new Map([...aliasMap(personTitleAliases), ...english.aliases])
  const personLookup = await lookUpPersonPages(
    db,
    fetcher,
    origin,
    merged.players.flatMap((player) => personTitleOf(player, english)),
    aliases,
  )

  addEnglishOnly(personLookup, english.englishOnly)
  const now = clock()
  const stored = await db.transaction(async (transaction) => {
    const personBook = await createPersonBook(transaction, {
      aliases,
      redirects: personLookup.redirects,
    })
    await storeChosenSpellings(transaction, season)

    const { differences, ...counts } = await storePlayers(transaction, season, merged.players, personBook)

    if (english.englishOnly.size > 0) {
      await transaction
        .update(persons)
        .set({ englishTitle: true })
        .where(inArray(persons.wikipediaPage, [...english.englishOnly]))
    }

    // What the lists say and the editors set otherwise waits for them, once (#1022).
    await keepPlayerFieldDifferences(transaction, season, differences, now)

    for (const { title, version } of pagesRead) {
      const values = { kind: 'squad' as const, readAt: now, season, version }

      await transaction
        .insert(wikipediaPages)
        .values({ title, ...values })
        .onDuplicateKeyUpdate({ set: values })
    }

    return { persons: personBook.counts, players: counts }
  })
  const personNames = await storePersonNames(db, personLookup.names)
  // A row without a link has no person yet: the name is its title (issue 1048).
  // Rows with no page and not of the editors: the others wait for their title.
  const byName = await linkPersonsByName(
    db,
    wikipediaTitleLookup(fetcher, origin, pause),
    and(eq(players.season, season), ne(players.source, 'redactie'), isNull(players.wikipediaPage)) as SQL,
    new Set(
      merged.players
        .filter((player) => player.englishPage !== null && english.undecided.has(player.englishPage))
        .map((player) => nameKey(player.name)),
    ),
  )
  const completeness = await storeCompleteness(db, season, totalsOf(reads), now)
  const report: PastSquadReport = {
    completeness: describeChange(season, completeness),
    countries: countriesOf(merged.players),
    kind: 'imported',
    pages: pagesRead.length,
    persons: [
      ...describePersons(personLookup.asked, stored.persons, personNames.counts),
      ...(english.asked === 0 ? [] : [`persons: ${english.asked} English requests asked`]),
      ...(byName.changed === 0
        ? []
        : [`persons: ${byName.changed} players linked by name, ${byName.created} on the name alone`]),
    ],
    players: stored.players,
    season,
    warnings: [
      ...warnings,
      ...mergedPersons,
      ...english.warnings,
      ...personLookup.warnings,
      ...byName.lines.slice(1).map((line) => `Persons: ${line}`),
      ...guessedNameWarnings(personNames.guessed),
    ],
  }

  return await recorded(db, report, clock)
}

/**
 * Puts the players of the readers of a season together, one entry per person. Two players are
 * the same person when they link the same page or, when either has no page, when their names
 * are the same without accents and capitals (`nameKey`); two players with different pages are
 * two persons. The entry keeps the best source of the lists that have the player
 * (`playerSources`, from the most complete down), and takes the name, position and shirt number
 * from the best list that gives them. The matches and goals of the tables are not kept. A
 * player whose name or page the database cannot hold, and a second player with a name that is
 * already taken, are left out with a warning.
 */
export function mergePlayers(reads: readonly ReadOfPage[]): { players: MergedPlayer[]; warnings: string[] } {
  const rank = (source: PlayerSource) => playerSources.indexOf(source)
  const merged: MergedPlayer[] = []
  const byPage = new Map<string, MergedPlayer>()
  const byName = new Map<string, MergedPlayer>()
  const warnings: string[] = []

  for (const { players: found, source } of [...reads].sort((a, b) => rank(a.source) - rank(b.source))) {
    for (const player of found) {
      if (player.name.length > playerNameMaxLength || (player.page?.length ?? 0) > wikipediaPageMaxLength) {
        warnings.push(`${printable(player.name)}: the name or the page is too long to store, so the player is left out`)

        continue
      }

      const shirtNumber =
        player.shirtNumber !== null && player.shirtNumber >= 1 && player.shirtNumber <= 99 ? player.shirtNumber : null
      const samePage = player.page === null ? undefined : byPage.get(nameKey(player.page))
      const sameName = byName.get(nameKey(player.name))
      // A player with another page than the one with his name is another person.
      const same =
        samePage ??
        (sameName !== undefined && (sameName.page === null || player.page === null || sameName.page === player.page)
          ? sameName
          : undefined)

      if (same === undefined) {
        if (sameName !== undefined) {
          warnings.push(`${printable(player.name)}: a second player with this name, so he is left out`)

          continue
        }

        const entry: MergedPlayer = {
          country: player.country,
          englishPage: player.englishPage ?? null,
          name: player.name,
          page: player.page,
          personId: null,
          position: player.position,
          shirtNumber,
          source,
        }

        merged.push(entry)
        byName.set(nameKey(player.name), entry)
        if (player.page !== null) {
          byPage.set(nameKey(player.page), entry)
        }

        continue
      }

      // The list that came first is the better one, so it only gets what it lacks.
      same.position ??= player.position
      same.country ??= player.country
      same.englishPage ??= player.englishPage ?? null
      same.shirtNumber ??= shirtNumber
      if (same.page === null && player.page !== null && !byPage.has(nameKey(player.page))) {
        same.page = player.page
        byPage.set(nameKey(player.page), same)
      }
    }
  }

  return { players: merged, warnings }
}

/** How many of the players have a country. */
function countriesOf(found: readonly { country: null | string }[]) {
  return { known: found.filter((player) => player.country !== null).length, total: found.length }
}

/** The person of a player by the title of `personTitleOf`, or null when there is none yet. */
async function personOf(player: MergedPlayer, personBook: { resolve: (title: string) => Promise<null | number> }) {
  const title = player.page ?? player.englishPage

  return title === null ? null : await personBook.resolve(title)
}

/**
 * The title that gives a player his person: his Dutch page, or else his English one when
 * `findEnglishPersons` found a Dutch title or a person for it.
 */
function personTitleOf(
  player: MergedPlayer,
  english: { aliases: ReadonlyMap<string, string>; known: ReadonlySet<string> },
): string[] {
  if (player.page !== null) {
    return [player.page]
  }

  // An English title nobody could answer for is not asked on the Dutch Wikipedia.
  return player.personId === null &&
    player.englishPage !== null &&
    (english.aliases.has(player.englishPage) || english.known.has(player.englishPage))
    ? [player.englishPage]
    : []
}

/**
 * Writes the health of the season to `squad_imports`, as the squad import of the current season
 * does, and gives the report back. The health of a season that is over is never shown: the
 * status and the warnings count only the current season.
 */
async function recorded(db: Database, report: PastSquadReport, clock: () => Date): Promise<PastSquadReport> {
  if (report.kind === 'none') {
    return report
  }

  const [before] = await db.select().from(squadImports).where(eq(squadImports.season, report.season))
  const health = healthAfter(before, report, clock())

  if (health !== undefined) {
    await db
      .insert(squadImports)
      .values({ season: report.season, ...health })
      .onDuplicateKeyUpdate({ set: health })
  }

  return report
}

/**
 * Brings the players of the season in the database up to date with what the readers found,
 * and never removes one, so a player keeps his `id` and the goals that point to it. A player
 * is known by his page, or else by his name (`nameKey`), and a scorer the import of the matches
 * made (the source `doelpunten`, #1024) also by his person. A player who is not known is added,
 * in the squad and with the best source, position and number the lists give. A known player
 * is improved when a better list has him than the one he has (the source, and the position and
 * number of that list), when he lacked a position or a number that a list gives, and when he
 * lacked a page or a person. Nothing else of a known row changes, and a known player who is
 * unchanged costs no write.
 *
 * What the editors set stays (issue 1022), as in `import-squad.ts`. A player they added or
 * changed is also known by his person. A field of `players.editors_fields` is never written,
 * and every other value a list gives for it is in `differences`, also where the list would not
 * have replaced it. A player with the source `redactie` keeps it: no list is better than the
 * editors, and the lists fill in only what he lacks. A person the editors made without an
 * article becomes the person of the page a list links.
 */
async function storePlayers(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  season: string,
  found: MergedPlayer[],
  personBook: { resolve: (title: string) => Promise<null | number> },
) {
  const rows = await db.select().from(players).where(eq(players.season, season))
  const byPage = new Map<string, Player>()
  const byName = new Map<string, Player>()
  const counts = { added: 0, improved: 0, unchanged: 0 }
  const rank = (source: PlayerSource) => playerSources.indexOf(source)
  // A scorer the import of the matches made is also known by his person, as in
  // `import-squad.ts`.
  const scorerOfPerson = scorersByPerson(rows)
  const editorsOfPerson = editorsByPerson(rows)
  const differences: FoundFieldDifference[] = []

  for (const row of rows) {
    byName.set(nameKey(row.name), row)
    if (row.wikipediaPage !== null) {
      byPage.set(nameKey(row.wikipediaPage), row)
    }
  }

  for (const player of found) {
    const personId = player.personId ?? (await personOf(player, personBook))
    const before =
      (player.page === null ? undefined : byPage.get(nameKey(player.page))) ??
      byName.get(nameKey(player.name)) ??
      (personId === null ? undefined : (scorerOfPerson.get(personId) ?? editorsOfPerson.get(personId)))

    if (before === undefined) {
      const row = {
        country: player.country,
        name: player.name,
        personId,
        position: player.position,
        searchTerm: searchTerm(player.name),
        season,
        shirtNumber: player.shirtNumber,
        source: player.source,
        wikipediaPage: player.page,
      }
      const [{ insertId }] = await db.insert(players).values(row)

      counts.added++
      const added = { ...row, editorsFields: [], id: insertId, inSquad: true, leftSquadAt: null }

      byName.set(nameKey(player.name), added)
      if (player.page !== null) {
        byPage.set(nameKey(player.page), added)
      }

      continue
    }

    // No list is better than the editors: their player keeps his source.
    const better = before.source !== 'redactie' && rank(player.source) < rank(before.source)
    const held = new Set(before.editorsFields)
    const changes: Partial<
      Pick<Player, 'country' | 'personId' | 'position' | 'shirtNumber' | 'source' | 'wikipediaPage'>
    > = {}

    // What a list says about a field the editors set waits for them.
    differences.push(
      ...holdEditorsFields(before, {
        name: player.name,
        position: player.position,
        shirtNumber: player.shirtNumber,
        wikipediaPage: player.page,
      }).differences,
    )

    if (better) {
      changes.source = player.source
    }
    if (
      !held.has('position') &&
      player.position !== null &&
      player.position !== before.position &&
      (better || before.position === null)
    ) {
      changes.position = player.position
    }
    if (
      !held.has('shirt_number') &&
      player.shirtNumber !== null &&
      player.shirtNumber !== before.shirtNumber &&
      (better || before.shirtNumber === null)
    ) {
      changes.shirtNumber = player.shirtNumber
    }
    if (player.country !== null && player.country !== before.country && (better || before.country === null)) {
      changes.country = player.country
    }
    if (
      !held.has('wikipedia_page') &&
      before.wikipediaPage === null &&
      player.page !== null &&
      !byPage.has(nameKey(player.page))
    ) {
      changes.wikipediaPage = player.page
    }
    // With a page of the editors that is not the page of the list, the player stays without
    // the person of that page.
    if (
      before.personId === null &&
      personId !== null &&
      !(held.has('wikipedia_page') && before.wikipediaPage !== player.page)
    ) {
      changes.personId = personId
    }
    if (
      before.personId !== null &&
      personId !== null &&
      before.personId !== personId &&
      changes.wikipediaPage !== undefined &&
      // A person the editors made without an article is the person of this page from now on.
      (await mergeEditorsPersonInto(db, before.personId, personId))
    ) {
      before.personId = personId
    }

    if (Object.keys(changes).length === 0) {
      counts.unchanged++

      continue
    }

    counts.improved++
    await db.update(players).set(changes).where(eq(players.id, before.id))

    const after = { ...before, ...changes }

    byName.set(nameKey(after.name), after)
    if (after.wikipediaPage !== null) {
      byPage.set(nameKey(after.wikipediaPage), after)
    }
  }

  return { ...counts, differences }
}

/**
 * The sums of the tables that were read: for each sum, what the best list that gives it says
 * (`playerSources`, from the most complete down), because the lists count differently and a
 * sum of the lists would count a player twice.
 */
function totalsOf(reads: readonly ReadWithTotals[]): CompletenessTotals {
  const best = [...reads].sort((a, b) => playerSources.indexOf(a.source) - playerSources.indexOf(b.source))

  return {
    goalsTotal: best.find((read) => read.goalsTotal !== null)?.goalsTotal ?? null,
    matchesTotal: best.find((read) => read.matchesTotal !== null)?.matchesTotal ?? null,
  }
}
