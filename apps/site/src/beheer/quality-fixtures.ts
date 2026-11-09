import type { Database } from '@fansite/db/client'

import { withClubs } from '@fansite/db/clubs'
import { matchChanges, matches, matchGoals, matchReports, type NewMatch, players } from '@fansite/db/schema'

// A small season for the tests of the page Kwaliteit and its work lists: 2005/06 with five
// matches that each miss something else, and one match of 2006/07 that no list of 2005/06 may
// show.

export const season = '2005/06'

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2005-08-13',
  opponent: 'Testdorp FC',
  round: '1',
  season,
  status: 'played',
}

/**
 * Puts the matches in the database and returns their ids by what they miss: `complete` misses
 * nothing, `goalless` ended 0-0 and so needs no goals, `withoutGoals` has a result and no
 * goals, `unfinished` a report that is `bezig`, `unlinked` two goals of ours without a player
 * and `waiting` two changes that wait. `later` misses goals in the season after.
 */
export async function addQualitySeason(db: Database) {
  const rows = await withClubs(db, [
    { ...base },
    { ...base, goalsAgainst: 0, goalsFor: 0, matchDate: '2005-08-20', opponent: 'Proefstad SV', round: '2' },
    { ...base, home: false, matchDate: '2005-08-27', opponent: 'Voorbeeld United', round: '3' },
    { ...base, matchDate: '2005-09-10', opponent: 'Demo Boys', round: '4' },
    { ...base, matchDate: '2005-09-17', opponent: 'Nepstad Rangers', round: '5' },
    { ...base, matchDate: '2005-09-24', opponent: 'Testclub 1', round: '6' },
    { ...base, matchDate: '2006-08-19', opponent: 'Testdorp FC', season: '2006/07' },
  ])
  const ids: number[] = []

  for (const row of rows) {
    const [{ insertId }] = await db.insert(matches).values(row)

    ids.push(insertId)
  }

  const [complete, goalless, withoutGoals, unfinished, unlinked, waiting, later] = ids as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const [{ insertId: playerId }] = await db.insert(players).values({ name: 'Sanne Spits', searchTerm: 'Spits', season })

  await db.insert(matchGoals).values([
    { matchId: complete, ours: true, player: 'Sanne Spits', playerId },
    { matchId: complete, ours: true, player: 'Sanne Spits', playerId },
    { matchId: complete, ours: false, player: 'Een Tegenstander' },
    // A goal of the opponent without a player, and an own goal of ours, are not ours to link.
    { matchId: unfinished, ours: true, player: 'Sanne Spits', playerId },
    { matchId: unfinished, ours: true, ownGoal: true, player: 'Eigen Doelpunt' },
    { matchId: unlinked, ours: true, player: 'Onbekende Een' },
    { matchId: unlinked, ours: false, ownGoal: true, player: 'Onbekende Twee' },
    { matchId: unlinked, ours: false, player: 'Een Tegenstander' },
    { matchId: waiting, ours: true, player: 'Sanne Spits', playerId },
  ])
  await db.insert(matchReports).values([
    { matchId: complete, status: 'klaar' },
    { matchId: unfinished, status: 'bezig' },
  ])

  const change = {
    changed: 'result',
    class: 'suspicious' as const,
    competition: 'Eredivisie' as const,
    firstSeenAt: new Date('2026-11-01T10:00:00Z'),
    lastSeenAt: new Date('2026-11-01T10:00:00Z'),
    oldValue: '2-1',
    reason: 'the season is over, and its matches do not change',
    round: '6',
    season,
  }

  await db.insert(matchChanges).values([
    { ...change, matchId: waiting, status: 'pending' },
    { ...change, changed: 'kickoff', matchId: waiting, part: 'kickoff', status: 'pending' },
    // Decided, or of a match that is gone: neither waits for an editor.
    { ...change, matchId: complete, status: 'rejected' },
    { ...change, matchId: null, status: 'pending' },
  ])

  return { complete, goalless, later, unfinished, unlinked, waiting, withoutGoals }
}
