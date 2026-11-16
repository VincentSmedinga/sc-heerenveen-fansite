// Reads the home grounds of the clubs from Wikidata (#1298): for each club with a Q-number the
// statements `P115` with their start (`P580`) and end (`P582`), and for each stadium the label,
// the place (`P131`) and the coordinates (`P625`). It makes or updates the stadiums and puts
// the grounds of the club in `club_home_grounds`. A club is read once (`stadiums_read_at`),
// and a club whose home grounds the editors set (`home_grounds_source` is `manual`) is left
// alone.
import type { Database } from '@fansite/db/client'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { knownWikidataLabels, storeWikidataLabel } from '@fansite/db/persons'
import {
  clubsToReadStadiums,
  linkMatchesToStadiums,
  replaceHomeGrounds,
  storeClubStadiumsRead,
  storeWikidataStadium,
} from '@fansite/db/stadiums'

import type { Fetcher } from './fetcher.ts'
import type { ImportOptions } from './import-feeds.ts'
import type { HomeGround, PartialDate } from './wikidata-item.ts'

import { createFetcher } from './fetcher.ts'
import { itemUrl, pauseBetweenRequests, wikidataOrigin } from './import-person-data.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { robotsStoreFor } from './robots-store.ts'
import { printable } from './text.ts'
import { readHomeGrounds, readLabel, readStadium } from './wikidata-item.ts'

export type ClubStadiumsOptions = {
  clock?: () => Date
  /** The wait between two requests in milliseconds. A test gives 0. */
  pause?: number
  /** The address of Wikidata. */
  wikidata: string
}

/** What a run did, for the log. */
export type ClubStadiumsReport = {
  /** The clubs the importer left alone: the editors set their home grounds. */
  clubsLeft: number
  /** The clubs read this run: stored, whatever they got. */
  clubsRead: number
  /** Of those, the clubs that have no home ground in Wikidata. */
  clubsWithoutGround: number
  /** The rows of `club_home_grounds` it wrote. */
  groundsWritten: number
  /** The items of Wikidata it asked about: clubs, stadiums and places. */
  itemsAsked: number
  /** The matches that got a stadium after the run. */
  matchesLinked: number
  stadiumsCreated: number
  stadiumsUpdated: number
  /** The lines for the warnings, each starting with `Stadiums:`. */
  warnings: string[]
}

type GroundRow = { stadiumId: string; startDay: null | string; startSeason: null | string }

type StadiumData = { coordinates: null | { latitude: number; longitude: number }; label: string; place: null | string }

/**
 * The lines for the log. No line for a run that read nothing and linked nothing, so a second
 * run without changes says nothing.
 */
export function describeClubStadiums(report: ClubStadiumsReport): string[] {
  if (report.clubsRead === 0 && report.matchesLinked === 0) {
    return []
  }

  const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

  return [
    `stadiums: ${plural(report.clubsRead, 'club', 'clubs')} read from Wikidata (${report.clubsWithoutGround} without a home ground there, ${report.clubsLeft} left to the editors), ${plural(report.stadiumsCreated, 'stadium', 'stadiums')} made and ${report.stadiumsUpdated} updated, ${plural(report.groundsWritten, 'home ground', 'home grounds')} written, ${plural(report.matchesLinked, 'match', 'matches')} linked; ${report.itemsAsked} items asked`,
  ]
}

/**
 * The rows of home grounds of a club, in order, each with its start: the season of `P580`, or
 * the day when it is a day. A ground without a start takes the end of the ground before it;
 * only the first ground may have none. Grounds are ordered by start, those without one first
 * (by their end). Null when a ground other than the first has no start and no end of the one
 * before to take it from: the dates are not clear enough to write.
 */
export function homeGroundRows(grounds: readonly HomeGround[]): GroundRow[] | null {
  const seen = new Set<string>()
  const unique = grounds.filter((ground) => {
    const key = JSON.stringify(ground)

    if (seen.has(key)) {
      return false
    }

    seen.add(key)

    return true
  })
  const key = (date: null | PartialDate, fallback: number) =>
    date === null ? fallback : date.year * 10_000 + (date.month ?? 1) * 100 + (date.day ?? 1)
  const ordered = unique
    .map((ground, index) => ({ ground, index }))
    .sort(
      (a, b) =>
        key(a.ground.start, -1) - key(b.ground.start, -1) ||
        key(a.ground.end, Infinity) - key(b.ground.end, Infinity) ||
        a.index - b.index,
    )
    .map(({ ground }) => ground)
  const rows: GroundRow[] = []

  for (const [position, ground] of ordered.entries()) {
    const start = ground.start ?? ordered[position - 1]?.end ?? null

    if (position > 0 && start === null) {
      return null
    }

    rows.push({ ...startOf(start), stadiumId: ground.stadiumId })
  }

  return rows
}

/**
 * Reads the home grounds of the clubs that were not read yet (#1298). Everything goes through
 * the fetcher: our User-Agent, robots.txt, a wait between requests, and a stop after
 * `mostFailuresInARow` failed requests in a row, or at once when robots.txt refuses a request
 * or a server asks us to wait. A club is read once; a request that fails leaves it unread, with
 * a warning, and the next run tries again. Each item is asked once, also when more clubs share
 * a stadium or a place. A club is stored whole, after all its requests worked, so a stop leaves
 * no half club. A club whose home grounds the editors set, and a stadium whose place the
 * editors set, are never changed. It links the matches that now fit a stadium at the end.
 */
export async function readClubStadiums(
  db: Database,
  fetcher: Fetcher,
  { clock = () => new Date(), pause = pauseBetweenRequests, wikidata }: ClubStadiumsOptions,
): Promise<ClubStadiumsReport> {
  const report: ClubStadiumsReport = {
    clubsLeft: 0,
    clubsRead: 0,
    clubsWithoutGround: 0,
    groundsWritten: 0,
    itemsAsked: 0,
    matchesLinked: 0,
    stadiumsCreated: 0,
    stadiumsUpdated: 0,
    warnings: [],
  }
  const failures: string[] = []
  const todo = await clubsToReadStadiums(db)

  let asked = 0
  let failuresInARow = 0
  let stopped = false

  type Answer = { kind: 'failed' | 'missing' | 'stopped' } | { kind: 'text'; text: string }

  async function ask(url: string): Promise<Answer> {
    if (asked > 0 && pause > 0) {
      await new Promise((resolve) => setTimeout(resolve, pause))
    }

    asked++
    report.itemsAsked++

    const outcome = await fetcher.fetch(url)

    switch (outcome.kind) {
      case 'blocked-by-robots':
        report.warnings.push(
          `Stadiums: robots.txt does not allow ${printable(outcome.url)}, so no more clubs are read this run`,
        )
        stopped = true

        return { kind: 'stopped' }
      case 'error':
        if (outcome.reason === 'http-status' && outcome.status === 404) {
          failuresInARow = 0

          return { kind: 'missing' }
        }

        failures.push(`${printable(url)}: ${printable(outcome.message)}`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'fetched': {
        failuresInARow = 0

        const text = new TextDecoder('utf-8').decode(outcome.body)

        if (!text.includes('"entities"')) {
          failures.push(`${printable(url)}: the answer is not an item`)
          failuresInARow++
          stopped = failuresInARow >= mostFailuresInARow

          return { kind: 'failed' }
        }

        return { kind: 'text', text }
      }
      case 'not-modified':
        failures.push(`${printable(url)}: the page answered 304 to a request without conditions`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'wait':
        report.warnings.push(
          `Stadiums: the server asks us to wait (${printable(outcome.url)}), so no more clubs are read this run`,
        )
        stopped = true

        return { kind: 'stopped' }
    }
  }

  const labels = await knownWikidataLabels(db)
  const stadiumData = new Map<string, null | StadiumData>()

  /** The label of a place: from the database, else Wikidata. 'failed': club stays unread. */
  async function placeLabel(id: string): Promise<'failed' | null | string> {
    const known = labels.get(id)

    if (known !== undefined) {
      return known
    }

    const answer = await ask(itemUrl(wikidata, id))

    if (answer.kind === 'failed' || answer.kind === 'stopped') {
      return 'failed'
    }

    const label = answer.kind === 'text' ? readLabel(answer.text) : null

    if (label === null) {
      return null
    }

    await storeWikidataLabel(db, id, label.slice(0, 255))
    labels.set(id, label.slice(0, 255))

    return label
  }

  /** What Wikidata says about a stadium. 'failed' leaves the club unread; null: no item. */
  async function readStadiumData(id: string): Promise<'failed' | null | StadiumData> {
    const cached = stadiumData.get(id)

    if (cached !== undefined) {
      return cached
    }

    const answer = await ask(itemUrl(wikidata, id))

    if (answer.kind === 'failed' || answer.kind === 'stopped') {
      return 'failed'
    }

    const item = answer.kind === 'text' ? readStadium(answer.text) : null

    if (item === null || item.label === null) {
      report.warnings.push(`Stadiums: ${id} is no item with a label, so it is left out`)
      stadiumData.set(id, null)

      return null
    }

    const place = item.placeId === null ? null : await placeLabel(item.placeId)

    if (place === 'failed') {
      return 'failed'
    }

    const data = { coordinates: item.coordinates, label: item.label, place: place?.slice(0, 100) ?? null }

    stadiumData.set(id, data)

    return data
  }

  for (const club of todo) {
    if (stopped) {
      break
    }
    if (club.homeGroundsSource === 'manual') {
      report.clubsLeft++

      continue
    }

    const answer = await ask(itemUrl(wikidata, club.wikidataId))

    if (answer.kind === 'failed' || answer.kind === 'stopped') {
      continue
    }

    const grounds = answer.kind === 'text' ? readHomeGrounds(answer.text) : []

    if (grounds.length === 0) {
      // Nothing to write, and what the club has stays. Read once, so nobody asks again.
      await storeClubStadiumsRead(db, club.id, clock())
      report.clubsRead++
      report.clubsWithoutGround++

      continue
    }

    const data = new Map<string, StadiumData>()
    let complete = true

    for (const id of new Set(grounds.map((ground) => ground.stadiumId))) {
      const found = await readStadiumData(id)

      if (found === 'failed') {
        complete = false

        break
      }
      if (found !== null) {
        data.set(id, found)
      }
    }
    if (!complete) {
      continue
    }

    const usable = grounds.filter((ground) => data.has(ground.stadiumId))
    const rows = homeGroundRows(usable)

    if (rows === null) {
      report.warnings.push(
        `Stadiums: the home grounds of ${club.wikidataId} have no dates that put them in order, so none are written`,
      )
      await storeClubStadiumsRead(db, club.id, clock())
      report.clubsRead++

      continue
    }

    const ids = new Map<string, number>()

    for (const [wikidataId, one] of data) {
      const stored = await storeWikidataStadium(db, club.id, { ...one, wikidataId })

      ids.set(wikidataId, stored.id)
      report.stadiumsCreated += stored.created ? 1 : 0
      report.stadiumsUpdated += stored.updated ? 1 : 0
    }

    await replaceHomeGrounds(
      db,
      club.id,
      rows.map((row) => ({ ...row, stadiumId: ids.get(row.stadiumId)! })),
    )
    await storeClubStadiumsRead(db, club.id, clock(), 'wikidata')
    report.clubsRead++
    report.groundsWritten += rows.length
  }

  if (failures.length > 0) {
    report.warnings.unshift(
      `Stadiums: ${failures.length} ${failures.length === 1 ? 'request' : 'requests'} to read stadiums failed, so those clubs are tried again next run: ${printable(failures.slice(0, 3).join('; '))}`,
    )
  }

  report.matchesLinked = (await linkMatchesToStadiums(db)).linked

  return report
}

/**
 * The command `pnpm run import:stadiums`, and `import.mjs --stadiums` on the host. Returns the
 * exit code: 0, or 1 when the lock is held.
 */
export async function runStadiumsCommand(
  databaseUrl: string,
  {
    clock = () => new Date(),
    makeFetcher = (robots) => createFetcher({ robots }),
    personDataPause,
    wikidataOrigin: wikidata = wikidataOrigin,
    write = console.log,
  }: Pick<ImportOptions, 'clock' | 'makeFetcher' | 'personDataPause' | 'wikidataOrigin' | 'write'> = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, () =>
      readClubStadiums(db, makeFetcher(robotsStoreFor(db, clock)), {
        clock,
        wikidata: wikidata ?? wikidataOrigin,
        ...(personDataPause === undefined ? {} : { pause: personDataPause }),
      }),
    )

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    const lines = [...run.result.warnings, ...describeClubStadiums(run.result)]

    for (const line of lines.length === 0 ? ['Stadiums: no clubs to read.'] : lines) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}

/** The start of a row from a date: a day, else the season that holds the month or year. */
function startOf(date: null | PartialDate): { startDay: null | string; startSeason: null | string } {
  if (date === null) {
    return { startDay: null, startSeason: null }
  }
  if (date.day !== null && date.month !== null) {
    return {
      startDay: `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`,
      startSeason: null,
    }
  }

  // A month in July or later starts a season of its own year; a year alone counts as the
  // season that begins in that year.
  const first = date.month !== null && date.month < 7 ? date.year - 1 : date.year

  return { startDay: null, startSeason: `${first}/${String((first + 1) % 100).padStart(2, '0')}` }
}
