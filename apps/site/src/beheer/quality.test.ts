import type { TestDatabase } from '@fansite/db/test-database'

import { readSeasonCoverage } from '@fansite/db/season-coverage'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { listWork, waitingChangesBySeason, workListPath, workLists } from './quality'
import { addQualitySeason, season } from './quality-fixtures'

let database: TestDatabase
let ids: Awaited<ReturnType<typeof addQualitySeason>>

beforeAll(async () => {
  database = await createTestDatabase()
  ids = await addQualitySeason(database.db)
})

afterAll(async () => {
  await database?.drop()
})

const idsOf = async (list: (typeof workLists)[number], of = season) =>
  (await listWork(database.db, of, list)).map((match) => match.id)

describe('the work lists of a season', () => {
  it('lists the played matches with goals in the result and none in the list of goals', async () => {
    expect(await idsOf('zonder-doelpunten')).toEqual([ids.withoutGoals])
    expect(await idsOf('zonder-doelpunten', '2006/07')).toEqual([ids.later])
  })

  it('lists the matches with a report that is not finished', async () => {
    expect(await idsOf('verslagen-bezig')).toEqual([ids.unfinished])
  })

  it('lists the matches with a goal of ours without a player, with how many', async () => {
    const found = await listWork(database.db, season, 'doelpunten-zonder-speler')

    // An own goal of ours and a goal of the opponent are not ours to link; an own goal of the
    // opponent is.
    expect(found.map(({ id, total }) => ({ id, total }))).toEqual([{ id: ids.unlinked, total: 2 }])
  })

  it('lists the matches with a change that waits, with how many, and not a decided one', async () => {
    const found = await listWork(database.db, season, 'wachtende-wijzigingen')

    expect(found.map(({ id, total }) => ({ id, total }))).toEqual([{ id: ids.waiting, total: 2 }])
  })

  it('gives what a row shows: the clubs, the day, the round and the result', async () => {
    expect(await listWork(database.db, season, 'zonder-doelpunten')).toEqual([
      {
        competition: 'Eredivisie',
        goalsAgainst: 1,
        goalsFor: 2,
        home: false,
        id: ids.withoutGoals,
        kickoffAt: null,
        matchDate: '2005-08-27',
        opponent: 'Voorbeeld United',
        round: '3',
        status: 'played',
        total: 1,
      },
    ])
  })

  it('is empty for a season without work', async () => {
    for (const list of workLists) {
      expect(await listWork(database.db, '1990/91', list)).toEqual([])
    }
  })

  it('has as many matches and goals as the coverage of the season counts', async () => {
    const coverage = (await readSeasonCoverage(database.db, new Date('2006-10-01T12:00:00Z'))).find(
      (row) => row.season === season,
    )
    const unlinked = await listWork(database.db, season, 'doelpunten-zonder-speler')

    expect(coverage?.playedWithoutGoalList).toBe((await idsOf('zonder-doelpunten')).length)
    expect((coverage?.reports ?? 0) - (coverage?.reportsDone ?? 0)).toBe((await idsOf('verslagen-bezig')).length)
    expect(coverage?.goalsWithoutPlayer).toBe(unlinked.reduce((sum, match) => sum + match.total, 0))
  })
})

describe('the changes that wait, by season', () => {
  it('counts the pending changes of a match that exists', async () => {
    expect(await waitingChangesBySeason(database.db)).toEqual(new Map([[season, 2]]))
  })
})

describe('the address of a work list', () => {
  it('names the season and the list', () => {
    expect(workListPath('2005/06', 'zonder-doelpunten')).toBe('/beheer/kwaliteit/2005-06/zonder-doelpunten')
  })
})
