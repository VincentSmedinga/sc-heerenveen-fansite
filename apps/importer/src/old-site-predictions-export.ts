import type { OldSiteMatch, OldSitePrediction, OldSitePredictionScore } from './old-site-file.ts'

/**
 * The part of `pnpm export:old-site` that counts the predictions (#1457): it turns the rows of
 * the old tables `prognose_inz` (one prediction by one visitor with an account) and
 * `prognose_oud` (the predictions of July to December 2001, from before the accounts) into a
 * count per predicted full-time score and per predicted half-time score, for each match. The
 * old tables hold a name, an e-mail address and a time; the queries ask for none of them, and
 * the name of a visitor (`inz_gn`) is read only to see that a visitor predicted a match twice.
 * It does not leave this function: what it returns holds codes of matches and numbers only.
 * `rt` and `ru` are the half-time score and `et` and `eu` the full-time score, home first.
 */

/** One prediction from before the accounts. Only these columns: no name and no address. */
export type EarlyPredictionRow = {
  et: number
  eu: number
  rt: number
  ru: number
  wsd_code: string
  wsd_seizoen: string
}

export type OldSitePredictions = {
  /** The counts per match, by season (the code of the old database). */
  bySeason: Map<string, OldSitePrediction[]>
  /** Lines for the person who runs the export. */
  report: string[]
}

/** One prediction of one visitor with an account. Only these columns are read. */
export type PredictionRow = {
  et: number
  eu: number
  id: number
  inz_gn: string
  rt: number
  ru: number
  wsd_code: string
  wsd_seizoen: string
}

type Tally = { fullTime: Map<string, number>; halfTime: Map<string, number> }

/**
 * Counts the predictions. `matches` are the matches of the export, and `knownMatches` the keys
 * (`season/code`) of every match of the old database, so a prediction for a match that is gone
 * is told from one for a match that is not in the files (a friendly).
 */
export function buildOldSitePredictions(
  predictionRows: readonly PredictionRow[],
  earlyRows: readonly EarlyPredictionRow[],
  matches: readonly OldSiteMatch[],
  knownMatches: ReadonlySet<string>,
): OldSitePredictions {
  const inFiles = new Set(matches.map((match) => `${match.season}/${match.code}`))
  // A visitor who predicted a match a second time: only the last one counts.
  const last = new Map<string, PredictionRow>()
  let doubles = 0

  for (const row of predictionRows) {
    const key = `${row.wsd_seizoen}/${row.wsd_code}|${row.inz_gn}`
    const before = last.get(key)

    if (before !== undefined) {
      doubles += 1
    }
    if (before === undefined || before.id < row.id) {
      last.set(key, row)
    }
  }

  const tallies = new Map<string, Tally>()
  const gone = new Map<string, number>()
  let notInFiles = 0
  let counted = 0
  let early = 0

  const add = (row: EarlyPredictionRow, isEarly: boolean) => {
    const key = `${row.wsd_seizoen}/${row.wsd_code}`

    if (!knownMatches.has(key)) {
      gone.set(key, (gone.get(key) ?? 0) + 1)

      return
    }
    if (!inFiles.has(key)) {
      notInFiles += 1

      return
    }

    const tally = tallies.get(key) ?? { fullTime: new Map(), halfTime: new Map() }

    bump(tally.fullTime, row.et, row.eu)
    bump(tally.halfTime, row.rt, row.ru)
    tallies.set(key, tally)
    counted += 1
    early += isEarly ? 1 : 0
  }

  for (const row of last.values()) {
    add(row, false)
  }
  for (const row of earlyRows) {
    add(row, true)
  }

  const bySeason = new Map<string, OldSitePrediction[]>()

  for (const [key, tally] of [...tallies].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))) {
    const at = key.indexOf('/')
    const season = key.slice(0, at)
    const list = bySeason.get(season) ?? []

    list.push({ fullTime: scoresOf(tally.fullTime), halfTime: scoresOf(tally.halfTime), matchCode: key.slice(at + 1) })
    bySeason.set(season, list)
  }

  const goneCount = [...gone.values()].reduce((sum, times) => sum + times, 0)

  return {
    bySeason,
    report: [
      `${counted} predictions counted in ${tallies.size} matches, from ${predictionRows.length} predictions of visitors with an account and ${earlyRows.length} from before the accounts (${early} of them counted)`,
      `predictions given twice by a visitor for the same match (only the last counts): ${doubles}`,
      `predictions for a match code that no longer exists, left out: ${goneCount}${
        gone.size === 0
          ? ''
          : ` (${[...gone]
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([key, times]) => `${key === '/' ? '(no code)' : key}: ${times}`)
              .join(', ')})`
      }`,
      `predictions for a match that is not in the files, left out: ${notInFiles}`,
    ],
  }
}

function bump(tally: Map<string, number>, home: number, away: number) {
  const key = `${home}-${away}`

  tally.set(key, (tally.get(key) ?? 0) + 1)
}

/** The counts as a list, the lowest score first, so a second run writes the same file. */
function scoresOf(tally: ReadonlyMap<string, number>): OldSitePredictionScore[] {
  return [...tally]
    .map(([key, count]) => {
      const [home = 0, away = 0] = key.split('-').map(Number)

      return { away, count, home }
    })
    .sort((a, b) => a.home - b.home || a.away - b.away)
}
