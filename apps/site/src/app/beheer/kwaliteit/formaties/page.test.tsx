import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { matches, matchReports, type NewMatch } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { readUnusualFormations } from '#src/beheer/formations'

import QualityPage from '../page'
import UnusualFormationsPage, { metadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  dataSource: 'oude-fansite',
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  matchDate: '2005-08-13',
  opponent: 'Testdorp FC',
  round: '1',
  season: '2005/06',
  status: 'played',
}

let rounds = 0

/** A match with a report that has this formation of ours (or none), and its id. */
async function addMatch(overrides: Partial<NewMatch>, formation: null | string, source: null | string = null) {
  const [row] = await withClubs(database.db, [{ ...base, round: String(++rounds), ...overrides }])
  const [{ insertId }] = await database.db.insert(matches).values(row!)

  await database.db
    .insert(matchReports)
    .values({ formationOurs: formation, matchId: insertId, source, status: 'klaar' })

  return insertId
}

beforeEach(async () => {
  requireRole.mockReset()
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId: 1 })
  await database.pool.query('DELETE FROM matches')
})

describe('the unusual formations', () => {
  it('lists only a formation of ours that is not 4-3-3 or 4-2-3-1, and not a report without one', async () => {
    await addMatch({ opponent: 'Eén' }, '4-3-3')
    await addMatch({ opponent: 'Twee' }, '4-2-3-1')
    await addMatch({ opponent: 'Drie' }, null)
    const odd = await addMatch({ opponent: 'Vier' }, '4-4-2', 'Oude fansite')

    expect((await readUnusualFormations(database.db)).map((match) => [match.id, match.formation])).toEqual([
      [odd, '4-4-2'],
    ])
  })

  it('puts the newest season first and the oldest match of a season first', async () => {
    const late = await addMatch({ matchDate: '2005-09-10', opponent: 'Laat' }, '3-5-2')
    const early = await addMatch({ matchDate: '2005-08-13', opponent: 'Vroeg' }, '4-4-2')
    const newer = await addMatch({ matchDate: '2006-08-19', opponent: 'Later', season: '2006/07' }, '4-6')

    expect((await readUnusualFormations(database.db)).map((match) => match.id)).toEqual([newer, early, late])
  })
})

describe('the page Afwijkende formaties', () => {
  it('is for an editor only, and stays out of search engines', async () => {
    renderToStaticMarkup(await UnusualFormationsPage())

    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
    expect(metadata.robots).toEqual({ follow: false, index: false })
    expect(metadata.title).toBe('Afwijkende formaties')
  })

  it('shows nothing to somebody without a session', async () => {
    requireRole.mockRejectedValue(new Error('redirect to /beheer/inloggen'))

    await expect(UnusualFormationsPage()).rejects.toThrow('redirect to /beheer/inloggen')
  })

  it('says there is none when every formation is an ordinary one', async () => {
    await addMatch({}, '4-3-3')

    expect(renderToStaticMarkup(await UnusualFormationsPage())).toContain('Geen afwijkende formaties.')
  })

  it('lists a season at a time, each match as a link to its report that names the match', async () => {
    const id = await addMatch({ home: false, matchDate: '2005-08-13', opponent: 'Vroeg' }, '4-4-2', 'Oude fansite')

    await addMatch({ matchDate: '2006-08-19', opponent: 'Later', season: '2006/07' }, '4-6')

    const html = renderToStaticMarkup(await UnusualFormationsPage())

    expect(html).toContain(`href="/beheer/wedstrijden/${id}/verslag"`)
    expect(html).toContain('4-4-2: Vroeg (u), 13 augustus 2005')
    expect(html).toContain('(Oude fansite)')
    expect(html.indexOf('2006/07')).toBeLessThan(html.indexOf('2005/06'))
    expect(html).toContain('href="/beheer/kwaliteit"')
  })

  it('is linked from the page Kwaliteit', async () => {
    expect(renderToStaticMarkup(await QualityPage())).toContain('href="/beheer/kwaliteit/formaties"')
  })
})
