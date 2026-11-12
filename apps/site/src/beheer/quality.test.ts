import type { TestDatabase } from '@fansite/db/test-database'

import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { seasonHasPlayers } from './quality'
import { addQualitySeason, season } from './quality-fixtures'
import { countGapsBySeason, nextWithGap, readMatchGaps, seasonTablePath } from './quality-table'

let database: TestDatabase
let ids: Awaited<ReturnType<typeof addQualitySeason>>

beforeAll(async () => {
  database = await createTestDatabase()
  ids = await addQualitySeason(database.db)
})

afterAll(async () => {
  await database?.drop()
})

const now = new Date('2006-10-01T12:00:00Z')
const gapsOf = async (of = season) =>
  new Map((await readMatchGaps(database.db, of, now)).map((match) => [match.id, match.gaps]))

describe('the gaps of the matches of a season (#1163)', () => {
  it('has a ? for goals when the result has goals and the list has none, and not for a 0-0', async () => {
    const gaps = await gapsOf()

    expect(gaps.get(ids.withoutGoals)?.doelpunten).toEqual({ sign: '?', total: 1 })
    expect(gaps.get(ids.goalless)?.doelpunten).toBeUndefined()
    expect((await gapsOf('2006/07')).get(ids.later)?.doelpunten).toEqual({ sign: '?', total: 1 })
  })

  it('counts the goals of ours without a player, and not an own goal of ours or a goal of the opponent', async () => {
    const gaps = await gapsOf()

    expect(gaps.get(ids.unlinked)?.doelpunten).toEqual({ sign: '2', total: 2 })
    expect(gaps.get(ids.unfinished)?.doelpunten).toBeUndefined()
    expect(gaps.get(ids.complete)?.doelpunten).toBeUndefined()
  })

  it('has … for a report that is not finished, and ? for no report', async () => {
    const gaps = await gapsOf()

    expect(gaps.get(ids.unfinished)?.verslag).toEqual({ sign: '…', total: 1 })
    expect(gaps.get(ids.complete)?.verslag).toBeUndefined()
    expect(gaps.get(ids.withoutGoals)?.verslag).toEqual({ sign: '?', total: 1 })
  })

  it('counts the changes that wait, and the facts that are empty', async () => {
    const gaps = await gapsOf()

    expect(gaps.get(ids.waiting)?.wacht).toEqual({ sign: '2', total: 2 })
    expect(gaps.get(ids.complete)?.wacht).toBeUndefined()
    expect(gaps.get(ids.complete)?.gegevens).toEqual({ sign: '3', total: 3 })
  })

  it('has a ? for the kick-off and the line-up of a played match without them', async () => {
    const gaps = await gapsOf()

    expect(gaps.get(ids.complete)?.aftrap).toEqual({ sign: '?', total: 1 })
    expect(gaps.get(ids.complete)?.opstelling).toEqual({ sign: '?', total: 1 })
    expect(gaps.get(ids.complete)?.uitslag).toBeUndefined()
  })

  it('counts as many goals and reports as the coverage of the season', async () => {
    const coverage = (await readSeasonCoverage(database.db, now)).find((row) => row.season === season)
    const rows = await readMatchGaps(database.db, season, now)

    expect(rows.filter((row) => row.gaps.doelpunten?.sign === '?')).toHaveLength(coverage?.playedWithoutGoalList ?? -1)
    expect(rows.filter((row) => row.gaps.verslag?.sign === '…')).toHaveLength(
      (coverage?.reports ?? 0) - (coverage?.reportsDone ?? 0),
    )
    expect(
      rows.reduce((sum, row) => sum + (row.gaps.doelpunten?.sign === '?' ? 0 : (row.gaps.doelpunten?.total ?? 0)), 0),
    ).toBe(coverage?.goalsWithoutPlayer)
  })

  it('counts the matches of each season and the ones with a gap in each column', async () => {
    const counts = countGapsBySeason(await readMatchGaps(database.db, undefined, now))

    expect(counts.get(season)).toMatchObject({ columns: { doelpunten: 2, verslag: 5, wacht: 1 }, matches: 6 })
    expect(counts.get('2006/07')?.matches).toBe(1)
  })

  it('finds the next match with a gap in a column, going round the season', async () => {
    const rows = await readMatchGaps(database.db, season, now)

    expect(nextWithGap(rows, ids.withoutGoals, 'doelpunten')?.id).toBe(ids.unlinked)
    expect(nextWithGap(rows, ids.unlinked, 'doelpunten')?.id).toBe(ids.withoutGoals)
    expect(nextWithGap(rows, ids.waiting, 'wacht')).toBeUndefined()
  })
})

describe('the addresses of the table', () => {
  it('names the season, and the column and the notice when given', () => {
    expect(seasonTablePath('2005/06')).toBe('/beheer/kwaliteit/2005-06')
    expect(seasonTablePath('2005/06', 'doelpunten', 'kolom-compleet')).toBe(
      '/beheer/kwaliteit/2005-06?kolom=doelpunten&gedaan=kolom-compleet',
    )
  })
})

describe('the players of a season', () => {
  it('knows whether a season has a player to choose from', async () => {
    expect(await seasonHasPlayers(database.db, season)).toBe(true)
    expect(await seasonHasPlayers(database.db, '2006/07')).toBe(false)
  })
})
