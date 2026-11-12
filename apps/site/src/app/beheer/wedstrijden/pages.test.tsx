import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { encodeProposal, type ReadMatch } from '@fansite/db/match-changes'
import { sourceDifferenceReasons } from '@fansite/db/match-conflicts'
import {
  adminUsers,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  type NewMatch,
  players,
  wikipediaPages,
} from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { saveEntry } from '#src/beheer/match-entries'
import { saveReport } from '#src/beheer/match-reports'
import { report as reportOf, squadOf } from '#src/beheer/report-fixtures'
import { checkReportForm } from '#src/beheer/report-form'

import MatchPartPage, { generateMetadata as partMetadata } from './[id]/[deel]/page'
import MatchPage, { metadata as matchMetadata } from './[id]/page'
import MatchesPage, { metadata as listMetadata } from './page'

const noFacts = { attendance: null, note: null, referee: null, stadium: null }

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
  useRouter: () => ({ refresh: () => undefined }),
}))

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const season = seasonOf(new Date())

beforeEach(async () => {
  requireRole.mockReset()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM match_changes')
  await database.pool.query('DELETE FROM wikipedia_pages')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })
})

const base: Omit<NewMatch, 'clubId'> = {
  competition: 'Eredivisie',
  home: true,
  // Whole seconds, as the database keeps them.
  kickoffAt: new Date(Math.floor(Date.now() / 1000) * 1000 - 24 * 60 * 60 * 1000),
  matchDate: '2026-10-31',
  opponent: 'N.E.C.',
  round: 'Speelronde 11',
  season,
  status: 'scheduled',
}

async function addMatch(overrides: Partial<Omit<NewMatch, 'clubId'>> = {}) {
  const [values] = await withClubs(database.db, [{ ...base, ...overrides }])
  const [inserted] = await database.db.insert(matches).values(values!).$returningId()

  return inserted?.id ?? 0
}

const list = async (searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(await MatchesPage({ searchParams: Promise.resolve(searchParams) }))
const form = async (id: number | string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await MatchPage({ params: Promise.resolve({ id: String(id) }), searchParams: Promise.resolve(searchParams) }),
  )

const partForm = async (id: number, deel: string, searchParams: Record<string, string> = {}) =>
  renderToStaticMarkup(
    await MatchPartPage({
      params: Promise.resolve({ deel, id: String(id) }),
      searchParams: Promise.resolve(searchParams),
    }),
  )

const headings = (html: string) =>
  [...html.matchAll(/<h([1-6])[^>]*>(.*?)<\/h\1>/g)].map(([, level, text]) => `h${level} ${text}`)

describe('the pages of the matches', () => {
  it.each([
    ['the list', listMetadata],
    ['the match', matchMetadata],
  ])('tell search engines to stay away from %s', (_name, metadata) => {
    expect(metadata.robots).toEqual({ follow: false, index: false })
  })

  it.each([
    ['the list', () => list()],
    ['the match', () => form(1)],
  ])('are for the editor and not for the author: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('author') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('owner', 'editor')
  })
})

/** A match of the list that the editors changed. */
async function editMatch(id: number) {
  await saveEntry(
    database.db,
    userId,
    id,
    {
      facts: noFacts,
      goals: [],
      kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
      result: {
        afterNinetyAgainst: null,
        afterNinetyFor: null,
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
    },
    'Wikipedia is achter',
  )
}

const playedAway = {
  goalsAgainst: 2,
  goalsFor: 1,
  home: false,
  kickoffAt: new Date('2026-08-09T14:45:00Z'),
  matchDate: '2026-08-09',
  opponent: 'FC Twente',
  round: 'Speelronde 1',
  status: 'played',
} satisfies Partial<NewMatch>

describe('the list', () => {
  it('opens on the matches without a result, with the match as its only link and no heading in a row', async () => {
    await addMatch(playedAway)
    await addMatch()

    const html = await list()

    expect(headings(html)).toEqual(['h1 Wedstrijden', 'h2 Wedstrijden in het seizoen ' + season])
    expect(html.match(/<a href="\/beheer\/wedstrijden\/\d+[^"]*">(.*?)<\/a>/g)).toEqual([
      expect.stringContaining('sc Heerenveen - N.E.C.'),
    ])
    expect(html).toContain('Uitslag ontbreekt')
    expect(html).not.toContain('FC Twente - sc Heerenveen')
    expect(html).toContain('Speelronde 11')
  })

  it('is a table of three columns, with the day and the competition as a line under the name', async () => {
    await addMatch()

    const html = await list()

    expect([...html.matchAll(/<th scope="col">(.*?)<\/th>/g)].map(([, name]) => name)).toEqual([
      'Wedstrijd',
      'Uitslag',
      'Verslag',
    ])
    expect(html).not.toContain('hf-data-table-fold')
    expect(html).toContain('<span class="hf-data-table-secondary">')
    expect(html).toContain('Eredivisie, Speelronde 11')
    expect(html).toContain('hf-page-main hf-page-main-wide hf-density-compact')
  })

  it('shows the filter with the numbers, as links with the choice in the address', async () => {
    await addMatch(playedAway)
    await addMatch()

    const html = await list()

    expect(html).toContain('aria-label="Wedstrijden filteren"')
    expect(html).toMatch(/<a [^>]*href="\/beheer\/wedstrijden\?tonen=alles"[^>]*>Alles \(2\)/u)
    expect(html).toMatch(/<a [^>]*aria-current="page"[^>]*>Zonder uitslag \(1\)/u)
    expect(html).toMatch(/href="\/beheer\/wedstrijden\?tonen=aangepast"[^>]*>Aangepast \(0\)/u)
  })

  it('shows all matches with the missing ones on top, the score in the order of the match, and the status in words', async () => {
    await addMatch(playedAway)
    await addMatch()

    const html = await list({ tonen: 'alles' })

    expect(html.match(/<a href="\/beheer\/wedstrijden\/\d+[^"]*">(.*?)<\/a>/g)).toEqual([
      expect.stringContaining('sc Heerenveen - N.E.C.'),
      expect.stringContaining('FC Twente - sc Heerenveen'),
    ])
    expect(html).toContain('2 - 1')
    expect(html).not.toContain('Gespeeld')
    expect(html).toContain('Gepland')
  })

  it('puts the result and the status in one column, and the day and competition under the name', async () => {
    await addMatch(playedAway)
    await addMatch({ kickoffAt: new Date('2026-11-01T19:00:00Z'), matchDate: '2026-11-01', status: 'postponed' })
    await addMatch({
      dateText: '5 december 2026',
      goalsAgainst: 0,
      goalsFor: 0,
      kickoffAt: null,
      matchDate: '2026-12-05',
      round: 'Speelronde 20',
      status: 'played',
    })

    const html = await list({ tonen: 'alles' })

    expect(html).not.toContain('>Status</th>')
    expect(html).not.toContain('>Datum</th>')
    expect(html).not.toContain('>Competitie</th>')
    expect(html).toContain('>Uitgesteld<')
    expect(html).toContain('zo 9 aug, 16.45 · Eredivisie, Speelronde 1')
    expect(html).toContain('zo 1 nov, 20.00 · Eredivisie, Speelronde 11')
    // An old match has no time.
    expect(html).toContain('za 5 dec · Eredivisie, Speelronde 20')
  })

  it('says Geannuleerd for a cancelled match, which is not one without a result', async () => {
    await addMatch({ status: 'cancelled' })

    const html = await list({ tonen: 'alles' })

    expect(html).toContain('Geannuleerd')
    expect(html).not.toContain('Uitslag ontbreekt')
    expect(await list()).toContain('Alle wedstrijden hebben een uitslag.')
  })

  it('says in one line that every match has a result, instead of an empty table', async () => {
    await addMatch(playedAway)

    const html = await list()

    expect(html).toContain('Alle wedstrijden hebben een uitslag.')
    expect(html).not.toContain('<table')
  })

  it('tags a match the editors changed in words, and finds it under "Aangepast"', async () => {
    await editMatch(await addMatch())
    await addMatch({ round: 'Speelronde 12' })

    const changed = await list({ tonen: 'aangepast' })

    expect(changed.match(/<a href="\/beheer\/wedstrijden\/\d+[^"]*">/g)).toHaveLength(1)
    // The tag is only on the page of the match; the list has the filter.
    expect(changed).not.toMatch(/hf-tag-highlight/u)
    expect(changed).toContain('Aangepast (1)')
  })

  it('says so when the editors changed no match', async () => {
    await addMatch()

    expect(await list({ tonen: 'aangepast' })).toContain('nog geen wedstrijd aangepast')
  })

  it('gives a second meeting of two clubs a name of its own, so the rows can be told apart', async () => {
    await addMatch()
    await addMatch({ competition: 'KNVB Beker', round: 'Tweede ronde' })

    const html = await list()

    expect(html).toContain('sc Heerenveen - N.E.C. (Speelronde 11)')
    expect(html).toContain('sc Heerenveen - N.E.C. (Tweede ronde)')
  })

  it('shows an earlier season when asked, and the current one for a season that is not known', async () => {
    await addMatch({
      goalsAgainst: 0,
      goalsFor: 1,
      opponent: 'Vitesse',
      round: 'Speelronde 3',
      season: '2025/26',
      status: 'played',
    })
    await addMatch()

    const earlier = await list({ seizoen: '2025-26', tonen: 'alles' })

    expect(earlier).toContain('Vitesse')
    expect(earlier).not.toContain('N.E.C.')
    // The choices of the filter keep the season.
    expect(earlier).toContain('href="/beheer/wedstrijden?seizoen=2025-26"')
    expect(earlier).toContain('href="/beheer/wedstrijden?seizoen=2025-26&amp;tonen=aangepast"')
    expect(await list({ seizoen: '2099-00' })).toContain('N.E.C.')
    expect(await list({ seizoen: 'onzin' })).toContain('N.E.C.')
  })

  it('says how soon what is saved shows, for the season of the list', async () => {
    await addMatch({ round: 'Speelronde 3', season: '2025/26' })
    await addMatch()

    const current = await list()
    const earlier = await list({ seizoen: '2025-26' })

    expect(current).toContain('Wat je opslaat, staat binnen vijf minuten op de site.')
    expect(earlier).toContain('Wat je opslaat, staat binnen een uur op de site.')
    expect(`${current}${earlier}`).not.toMatch(/meteen/u)
  })

  it('has a season picker next to the title when there is more than one season', async () => {
    await addMatch({ round: 'Speelronde 3', season: '2025/26' })
    await addMatch()

    const html = await list()

    expect(html).toContain('aria-label="Seizoen kiezen"')
    expect(html).toContain('action="/beheer/wedstrijden"')
  })

  it('has no breadcrumb and no link back', async () => {
    await addMatch()

    const html = await list()

    expect(html).not.toContain('Kruimelpad')
    expect(html).not.toContain('Terug naar')
  })

  it('says that there are no matches in a season without any', async () => {
    expect(await list()).toContain(`Er zijn nog geen wedstrijden in het seizoen ${season}.`)
  })

  it('tells that a match is gone, from the address, in a notice without a heading', async () => {
    const html = await list({ fout: 'weg' })

    expect(html).toMatch(/<p class="hf-notice" role="status">Deze wedstrijd bestaat niet/u)
    expect(headings(html)).not.toContain('h2 Deze wedstrijd bestaat niet')
  })
})

describe('the match', () => {
  it('shows the form with the values of the match, a label for every field and one button per goal that names it', async () => {
    const id = await addMatch({ competition: 'KNVB Beker', round: 'Tweede ronde' })

    await database.db.insert(players).values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season })

    const html = await form(id)

    expect(headings(html)).toEqual(
      expect.arrayContaining([
        'h1 sc Heerenveen - N.E.C.',
        'h2 Aftrap',
        'h2 Uitslag',
        'h2 Verlenging en strafschoppen',
        'h2 Doelpunten',
        'h2 Opslaan',
      ]),
    )
    for (const label of [
      'Datum',
      'Tijd',
      'Weekend of dag zonder tijd',
      'Status',
      'sc Heerenveen',
      'N.E.C.',
      'Was er verlenging?',
      'Reden',
    ]) {
      expect(html).toContain(`>${label}`)
    }
    expect(html).toMatch(/Doelpunt<\/span> toevoegen<\/button>/u)
    expect(html).not.toContain('Weghalen')
    // The hidden first button makes Enter save.
    expect(html.indexOf('value="opslaan"')).toBeLessThan(html.indexOf('value="doelpunt-toevoegen"'))
    // The reason and the button of the save panel belong to the form of the cards.
    expect(html).toMatch(/<form [^>]*id="wedstrijd"/u)
    expect(html).toMatch(/<input [^>]*form="wedstrijd"[^>]*name="reden"/u)
    expect(html).toMatch(/<button [^>]*form="wedstrijd"[^>]*value="opslaan"/u)
  })

  it('puts the clubs in the order of the match, so an away match starts with the opponent', async () => {
    const away = await form(await addMatch({ home: false }))
    const home = await form(await addMatch({ round: 'Speelronde 12' }))

    expect(away.indexOf('id="uitslag-zij"')).toBeLessThan(away.indexOf('id="uitslag-wij"'))
    expect(home.indexOf('id="uitslag-wij"')).toBeLessThan(home.indexOf('id="uitslag-zij"'))
    expect(headings(away)).toContain('h1 N.E.C. - sc Heerenveen')
  })

  it('has a link back to Wedstrijden, tags for what the editors changed and what is missing, and one column', async () => {
    const id = await addMatch()
    const html = await form(id)

    expect(html).not.toContain('Kruimelpad')
    expect(html.replaceAll(/<[^>]+>/gu, '')).toContain('Terug naar Wedstrijden')
    expect(html).toContain('<span class="hf-tag hf-tag-attention">Uitslag ontbreekt</span>')
    expect(html).not.toContain('Terug naar de wedstrijden')
    expect(html).not.toContain('hf-page-sidebar')
    expect(html).toContain('hf-page-main hf-page-main-wide hf-density-compact')
    expect(html).not.toContain('Laatste invoer')
  })

  it('has no field for extra time in the league', async () => {
    const id = await addMatch()
    const html = await form(id)

    expect(html).not.toContain('id="verlenging"')
    expect(html).not.toContain('strafschoppen-wij')
  })

  it('names the goal in every field and button of it, and offers the squad', async () => {
    const id = await addMatch()

    await database.db.insert(players).values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season })
    await saveEntry(
      database.db,
      userId,
      id,
      {
        facts: noFacts,
        goals: [
          {
            minute: 12,
            ours: true,
            ownGoal: false,
            penalty: false,
            player: 'Oyen',
            playerId: null,
            stoppageMinutes: null,
            wikipediaPage: null,
          },
        ],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 0,
          goalsFor: 1,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await form(id)

    // The row header shows the number, and keeps the name of the goal for a screen reader.
    expect(html).toContain(
      '<th scope="row"><span aria-hidden="true">1</span><span class="hf-visually-hidden">Doelpunt 1</span></th>',
    )
    // The six fields of the goal each say which goal they are for, and so does the button.
    expect(html.match(/, doelpunt 1<\/span>/g)).toHaveLength(6)
    expect(html).toMatch(/<button [^>]*aria-label="Doelpunt 1 weghalen" title="Doelpunt 1 weghalen"/u)
    expect(html).toContain('value="doelpunt-weghalen-1"')
    expect(html).toContain('Luca Oyen')
    expect(html).not.toContain('Andere speler</option>')
  })

  it('asks for the squad for a goal of ours and for a name for a goal of the opponent, and keeps the other', async () => {
    const id = await addMatch()
    const goal = (minute: number, ours: boolean) => ({
      minute,
      ours,
      ownGoal: false,
      penalty: false,
      player: ours ? 'Oyen' : 'Sibbing',
      playerId: null,
      stoppageMinutes: null,
      wikipediaPage: null,
    })

    await database.db.insert(players).values({ name: 'Luca Oyen', position: 'aanvaller', searchTerm: 'oyen', season })
    await saveEntry(
      database.db,
      userId,
      id,
      {
        facts: noFacts,
        goals: [goal(12, true), goal(40, false)],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 1,
          goalsFor: 1,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await form(id)
    const hidden = [
      ...html.matchAll(
        /<fieldset class="hf-input-table-item[^"]*" disabled="" hidden="" role="none"><div[^>]*><div[^>]*><label [^>]*for="([^"]+)"/g,
      ),
    ].map(([, field]) => field)

    expect(hidden).toEqual(['doelpunt-1-naam', 'doelpunt-2-speler'])
    // What the hidden field holds stays in the page, and is not sent.
    expect(html).toMatch(/name="doelpunt-2-naam" value="Sibbing"/u)
  })

  it('has as many goals as the result adds up to, empty ones for the goals that are not stored', async () => {
    const id = await addMatch()

    await editMatch(id)

    const html = await form(id)

    expect(html.match(/<th scope="row">/g)).toHaveLength(3)
    expect(html).toContain('for="doelpunt-3-minuut"')
  })

  it('says nowhere that a field is not required, also for the cup', async () => {
    const id = await addMatch({ competition: 'KNVB Beker' })

    await editMatch(id)

    const html = await form(id)

    expect(html).toContain('id="verlenging"')
    expect(html).not.toContain('niet verplicht')
    expect(html).not.toContain('(niet')
    // A field that has to be filled in stays required for the browser and a screen reader.
    expect(html).toMatch(/id="aftrap-datum" required=""/u)
    expect(html).toMatch(/id="doelpunt-1-minuut" required=""/u)
    expect(html).not.toMatch(/id="aftrap-tijd" required=""/u)
  })

  it('has a radio group for the team of a goal and for extra time, and a list for the three kinds', async () => {
    const id = await addMatch({ competition: 'KNVB Beker' })

    await editMatch(id)

    const html = await form(id)

    expect(html).toMatch(/<fieldset class="hf-radio-group"><legend>Was er verlenging\?<\/legend>/u)
    expect(html).toMatch(/<legend>Team<span class="hf-visually-hidden">, doelpunt 1<\/span><\/legend>/u)
    expect(html).toMatch(/type="radio" name="doelpunt-1-kant" value="wij"/u)
    expect(html).toContain('<select class="hf-width-natural" name="doelpunt-1-soort"')
    expect(html).toMatch(/<select [^>]*name="status"/u)
    expect(html).toMatch(/<option value="cancelled">Geannuleerd<\/option>/u)
  })

  it('says how soon a save shows, from the time the data is kept, and longer for an earlier season', async () => {
    const current = await form(await addMatch())
    const past = await form(await addMatch({ round: 'Speelronde 1', season: '2025/26' }))

    expect(current).toContain('Staat binnen vijf minuten op de site.')
    expect(past).toContain('Staat binnen een uur op de site.')
    expect(await form(await addMatch({ round: 'Speelronde 12' }), { gedaan: 'opgeslagen' })).toContain(
      'Je invoer is bewaard. Staat binnen vijf minuten op de site.',
    )
    expect(`${current}${past}`).not.toMatch(/meteen|staat nu/u)
  })

  it('tells what the editors entered, who did it and why, and the button to take it away with its own reason', async () => {
    const id = await addMatch()

    expect(await form(id)).not.toContain('Invoer weghalen')

    await saveEntry(
      database.db,
      userId,
      id,
      {
        facts: noFacts,
        goals: [],
        kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
        result: {
          afterNinetyAgainst: null,
          afterNinetyFor: null,
          extraTime: false,
          goalsAgainst: 0,
          goalsFor: 0,
          penaltiesAgainst: null,
          penaltiesFor: null,
          status: 'played',
        },
      },
      'Wikipedia is achter',
    )

    const html = await form(id)

    expect(headings(html)).toContain('h2 Laatste invoer')
    expect(html).toContain('<span class="hf-tag hf-tag-highlight">Aangepast: uitslag</span>')
    expect(html).toContain('Onderdelen: uitslag')
    expect(html).toContain('Door: sanne@example.org')
    expect(html).toContain('Reden: Wikipedia is achter')
    // The block with the red button is closed, and the button names the match.
    expect(html).toMatch(/<details class="hf-disclosure"><summary>Invoer weghalen/u)
    expect(html).toContain('aria-label="Invoer weghalen voor Speelronde 11 (Eredivisie): sc Heerenveen - N.E.C."')
    expect(html).toContain('hf-button-danger')
    expect(html).toContain('Reden om de invoer weg te halen')
  })

  describe('a difference with Wikipedia that waits', () => {
    /** A match with an entry of the result, and a waiting difference about it. */
    async function withDifference() {
      const id = await addMatch()

      await saveEntry(
        database.db,
        userId,
        id,
        {
          facts: noFacts,
          goals: [],
          kickoff: { dateText: null, kickoffAt: base.kickoffAt ?? null, matchDate: '2026-10-31' },
          result: {
            afterNinetyAgainst: null,
            afterNinetyFor: null,
            extraTime: false,
            goalsAgainst: 0,
            goalsFor: 2,
            penaltiesAgainst: null,
            penaltiesFor: null,
            status: 'played',
          },
        },
        'Wikipedia is achter',
      )
      await database.db.insert(matchChanges).values({
        changed: 'uitslag',
        class: 'suspicious',
        competition: 'Eredivisie',
        firstSeenAt: new Date('2026-11-02T10:00:00Z'),
        lastSeenAt: new Date('2026-11-02T10:00:00Z'),
        matchId: id,
        newValue: 'sc Heerenveen 1–1 N.E.C.',
        oldValue: 'sc Heerenveen 2–0 N.E.C.',
        part: 'result',
        reason: 'wijkt af van de invoer van de redactie',
        round: 'Speelronde 11',
        season,
        status: 'pending',
      })

      return id
    }

    it('shows both values side by side on the page of the match, with the day the import takes over', async () => {
      const id = await withDifference()
      const html = await form(id)

      expect(headings(html)).toContain('h2 Wikipedia wijkt af: uitslag')
      expect(html).toContain('Onze invoer: sc Heerenveen 2–0 N.E.C.')
      expect(html).toContain('Wikipedia: sc Heerenveen 1–1 N.E.C.')
      expect(html).toContain('9 nov')
    })

    it('names both sources of a difference between two sources, and says that nothing is taken over by itself (#974)', async () => {
      const id = await withDifference()

      await database.db.update(matchChanges).set({ reason: sourceDifferenceReasons['oude-fansite'] })

      const html = await form(id)
      const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
        ([, name, text]) => [text, name],
      )

      expect(headings(html)).toContain('h2 De sc Heerenveen Fansite wijkt af: uitslag')
      expect(html).toContain('Wikipedia: sc Heerenveen 2–0 N.E.C.')
      expect(html).toContain('De sc Heerenveen Fansite: sc Heerenveen 1–1 N.E.C.')
      expect(html).toContain('De import neemt hier niets vanzelf over.')
      expect(html).not.toContain('Onze invoer: sc Heerenveen')
      expect(buttons).toEqual(
        expect.arrayContaining([
          [
            'Neem de sc Heerenveen Fansite over',
            expect.stringMatching(/^Neem de sc Heerenveen Fansite over: de uitslag van Speelronde 11/),
          ],
          ['Houd Wikipedia', expect.stringMatching(/^Houd Wikipedia: de uitslag van Speelronde 11/)],
        ]),
      )
    })

    it('has two buttons, each with a name that says which match and part it is for, and one reason', async () => {
      const html = await form(await withDifference())
      const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
        ([, name, text]) => [text, name],
      )

      expect(buttons).toEqual(
        expect.arrayContaining([
          ['Neem Wikipedia over', expect.stringMatching(/^Neem Wikipedia over: de uitslag van Speelronde 11/)],
          ['Houd onze invoer', expect.stringMatching(/^Houd onze invoer: de uitslag van Speelronde 11/)],
        ]),
      )
      expect(html).toContain('Reden voor je besluit over de uitslag')
      expect(html.match(/id="besluit-\d+-reden"/g)).toHaveLength(1)
    })

    it('shows nothing about a difference when none waits, or when it was decided', async () => {
      const id = await withDifference()

      await database.db.update(matchChanges).set({ status: 'rejected' })

      expect(await form(id)).not.toContain('Wikipedia wijkt af')
      expect(await form(await addMatch({ round: 'Speelronde 12' }))).not.toContain('Wikipedia wijkt af')
    })

    it('labels the match in the list in words, and not a match without a difference', async () => {
      await withDifference()
      await addMatch({ round: 'Speelronde 12' })

      const html = await list({ tonen: 'alles' })

      expect(html.match(/<span class="hf-tag hf-tag-attention">Wikipedia wijkt af<\/span>/g)).toHaveLength(1)
    })

    it('tags the match "Wikipedia wijkt af" next to "Aangepast", and finds it under "Aangepast"', async () => {
      await withDifference()
      await addMatch({ round: 'Speelronde 12' })

      const html = await list({ tonen: 'aangepast' })

      expect(html).toContain('Aangepast (1)')
      expect(html).not.toContain('hf-tag-highlight')
      expect(html.match(/<span class="hf-tag hf-tag-attention">Wikipedia wijkt af<\/span>/g)).toHaveLength(1)
      expect(html).toContain('N.E.C.')
      expect(html).not.toContain('Speelronde 12')
    })

    it('finds the match of an earlier season at the address of the start page', async () => {
      const id = await addMatch({ round: 'Speelronde 3', season: '2024/25' })

      await database.db.insert(matchEdits).values({
        beforeGoals: '',
        beforeMatch: '',
        editedAt: new Date(),
        editedBy: userId,
        goalsEdited: false,
        kickoffEdited: false,
        matchId: id,
        reason: 'x',
        resultEdited: true,
      })
      await database.db.insert(matchChanges).values({
        changed: 'uitslag',
        class: 'suspicious',
        competition: 'Eredivisie',
        firstSeenAt: new Date('2026-11-02T10:00:00Z'),
        lastSeenAt: new Date('2026-11-02T10:00:00Z'),
        matchId: id,
        oldValue: 'a',
        part: 'result',
        reason: 'x',
        round: 'Speelronde 3',
        season: '2024/25',
        status: 'pending',
      })

      const html = await list({ seizoen: '2024-25', tonen: 'aangepast' })

      expect(html).toContain('N.E.C.')
      expect(html.match(/<span class="hf-tag hf-tag-attention">Wikipedia wijkt af<\/span>/g)).toHaveLength(1)
    })

    it('tells the editor on the list that a difference was decided already', async () => {
      expect(await list({ fout: 'besloten' })).toContain('Over deze afwijking of wijziging is al beslist')
    })
  })

  it.each([
    ['gehouden', 'Invoer gehouden'],
    ['niet-gelukt', 'Niet overgenomen'],
    ['overgenomen', 'Wikipedia overgenomen'],
    ['opgeslagen', 'Opgeslagen'],
    ['ongewijzigd', 'Niets veranderd'],
    ['weggehaald', 'Invoer weggehaald'],
    ['geen-invoer', 'Niets weggehaald'],
    ['wikipedia-overgenomen', 'Wikipedia overgenomen'],
    ['wijziging-afgewezen', 'Wijziging afgewezen'],
    ['wijziging-niet-gelukt', 'Niet overgenomen'],
  ])('tells what the last action did, in a notice without a heading: %s', async (done, title) => {
    const id = await addMatch()
    const html = await form(id, { gedaan: done })

    expect(html).toMatch(new RegExp(`<p class="hf-notice" role="status"><strong>${title}\\.</strong> `, 'u'))
    expect(headings(html).join()).not.toContain(title)
  })

  describe('a change of Wikipedia that is held back', () => {
    const wikipedia: ReadMatch = {
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      attendance: null,
      competition: 'KNVB Beker',
      dateText: null,
      extraTime: false,
      factsProblem: null,
      goals: null,
      goalsAgainst: 0,
      goalsFor: 1,
      goalsProblem: null,
      home: true,
      kickoffAt: new Date('2014-02-05T19:45:00Z'),
      matchDate: '2014-02-05',
      note: null,
      opponent: 'Ajax',
      opponentPage: null,
      penaltiesAgainst: null,
      penaltiesFor: null,
      referee: null,
      round: 'Achtste finales',
      stadium: null,
      status: 'played',
    }

    /** The cup match of 2013/14 where Wikipedia now calls the goal of Ziyech a penalty. */
    async function withHeldChange(overrides: Partial<typeof matchChanges.$inferInsert> = {}, season = '2013/14') {
      const id = await addMatch({
        competition: 'KNVB Beker',
        goalsAgainst: 0,
        goalsFor: 1,
        kickoffAt: new Date('2014-02-05T19:45:00Z'),
        matchDate: '2014-02-05',
        opponent: 'Ajax',
        resultSetAt: new Date('2014-02-05T22:00:00Z'),
        round: 'Achtste finales',
        season,
        status: 'played',
      })

      await database.db
        .insert(matchGoals)
        .values({ matchId: id, minute: 12, ours: true, ownGoal: false, penalty: false, player: 'Hakim Ziyech' })

      const [inserted] = await database.db
        .insert(matchChanges)
        .values({
          changed: 'goals',
          class: 'suspicious',
          competition: 'KNVB Beker',
          firstSeenAt: new Date('2026-11-01T10:00:00Z'),
          lastSeenAt: new Date('2026-11-03T10:00:00Z'),
          matchId: id,
          newValue: 'x',
          oldValue: 'y',
          proposal: encodeProposal({
            clubId: 1,
            goals: [
              {
                minute: 12,
                ours: true,
                ownGoal: false,
                penalty: true,
                personId: null,
                player: 'Hakim Ziyech',
                playerId: null,
                playerPage: null,
                stoppageMinutes: null,
              },
            ],
            match: wikipedia,
          }),
          reason: 'the goals changed in a match played 4 days ago',
          round: 'Achtste finales',
          season,
          status: 'pending',
          timesSeen: 2,
          ...overrides,
        })
        .$returningId()

      await database.db.insert(wikipediaPages).values({
        kind: 'cup',
        readAt: new Date('2026-11-03T10:00:00Z'),
        season,
        title: `KNVB Beker ${season} (mannen)`,
      })

      return { changeId: inserted?.id ?? 0, id }
    }

    it('shows what the site has and what Wikipedia says, why it waits, and since when', async () => {
      const { id } = await withHeldChange()
      const html = await form(id)

      expect(headings(html)).toEqual(
        expect.arrayContaining(['h1 sc Heerenveen - Ajax', 'h2 Wikipedia wacht: doelpunten']),
      )
      expect(html).toContain('Op de site: 12&#x27; Hakim Ziyech. Wikipedia: 12&#x27; Hakim Ziyech (strafschop).')
      expect(html).toContain('De doelpunten van een wedstrijd die 4 dagen geleden werd gespeeld, zijn veranderd.')
      expect(html).toContain('Wikipedia zegt dit sinds 1 november 2026')
      expect(html).toContain('De import zag het 2 keer, voor het laatst op 3 november 2026')
    })

    it('tells what happens without a decision: in a season that is over, nothing', async () => {
      const { id } = await withHeldChange()
      const html = await form(id)

      expect(html).toContain(
        'Het seizoen is voorbij of bijna voorbij, dus de import neemt dit niet vanzelf over. Zonder besluit blijft de huidige waarde staan.',
      )
      expect(html).not.toContain('Zonder besluit neemt de import dit over')
    })

    it('tells what happens without a decision: in the season that is on, the import takes it over after seven days', async () => {
      const { id } = await withHeldChange({}, season)
      const html = await form(id)

      expect(html).toContain('Zonder besluit neemt de import dit over op 8 november 2026')
      expect(html).not.toContain('Het seizoen is voorbij')
    })

    it('links to the page of the season on Wikipedia, as a plain link', async () => {
      const { id } = await withHeldChange()
      const html = await form(id)

      expect(html).toContain(
        '<a href="https://nl.wikipedia.org/wiki/KNVB_Beker_2013/14_(mannen)">Bekijk KNVB Beker 2013/14 (mannen) op ',
      )
    })

    it('says that the match is no longer on the page, and what taking over does', async () => {
      const { id } = await withHeldChange({
        changed: 'removed',
        newValue: null,
        proposal: null,
        reason: 'the match is no longer on the page',
      })
      const html = await form(id)

      expect(headings(html)).toContain('h2 Wikipedia wacht: het weghalen van de wedstrijd')
      expect(html).toContain('Wikipedia: de wedstrijd staat niet meer op de pagina.')
      expect(html).toContain('De wedstrijd staat niet meer op de pagina.')
    })

    it('has two buttons that name the match and what changes, and one reason with a hint', async () => {
      const { changeId, id } = await withHeldChange()
      const html = await form(id)
      const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
        ([, name, text]) => [text, name],
      )

      expect(buttons).toEqual(
        expect.arrayContaining([
          [
            'Neem Wikipedia over',
            expect.stringMatching(/^Neem Wikipedia over: doelpunten van Achtste finales \(KNVB Beker\)/),
          ],
          ['Wijs af', expect.stringMatching(/^Wijs af: doelpunten van Achtste finales \(KNVB Beker\)/)],
        ]),
      )
      expect(html).toContain('Reden voor je besluit over doelpunten')
      expect(html).toContain('Waarom beslis je dit? Komt in het logboek, hoogstens 300 tekens.')
      expect(html).toContain(`id="wijziging-${changeId}-reden"`)
    })

    it('shows nothing when the change was decided, or belongs to a difference with an entry', async () => {
      const { changeId, id } = await withHeldChange()

      await database.db.update(matchChanges).set({ part: 'result' }).where(eq(matchChanges.id, changeId))
      expect(await form(id)).not.toContain('Wikipedia wacht')

      await database.db
        .update(matchChanges)
        .set({ part: null, status: 'accepted' })
        .where(eq(matchChanges.id, changeId))
      expect(await form(id)).not.toContain('Wikipedia wacht')
    })

    it('finds the match under "Wikipedia wacht (n)" for any season, with a label in words', async () => {
      await withHeldChange()
      await addMatch({ competition: 'Eredivisie', round: 'Speelronde 12', season: '2013/14' })

      const html = await list({ seizoen: '2013-14', tonen: 'wikipedia-wacht' })

      expect(html).toContain('Wikipedia wacht (1)')
      expect(html).toContain('Alles (2)')
      expect(html.match(/<span class="hf-tag hf-tag-attention">Wikipedia wacht<\/span>/g)).toHaveLength(1)
      expect(html).toContain('Achtste finales')
      expect(html).not.toContain('Speelronde 12')
      expect(html).not.toContain('hf-tag-attention">Wikipedia wijkt af')
    })

    it('says so when no change waits in the season of the choice', async () => {
      await addMatch()

      expect(await list({ tonen: 'wikipedia-wacht' })).toContain(
        'Er wacht geen wijziging van Wikipedia op een besluit in dit seizoen.',
      )
    })

    it('tells the list that the match is removed, from the address', async () => {
      expect(await list({ gedaan: 'verwijderd' })).toContain('De wedstrijd is weggehaald')
    })

    it('is for the editor: an author does not get the page', async () => {
      const { id } = await withHeldChange()

      requireRole.mockRejectedValue(new Error('not found'))

      await expect(form(id)).rejects.toThrow('not found')
      await expect(list({ tonen: 'wikipedia-wacht' })).rejects.toThrow('not found')
    })
  })

  it('says nothing for an action it does not know', async () => {
    const id = await addMatch()

    expect(await form(id, { gedaan: 'iets-anders' })).not.toContain('hf-notice')
  })

  it('is not there for a match that does not exist, or a number that is not one', async () => {
    await expect(form(99_999)).rejects.toThrow('not found')
    await expect(form('abc')).rejects.toThrow('not found')
  })
})

describe('the parts of the form of a match (#1162)', () => {
  /** The links of the navigation of the parts, with the one that is current. */
  const parts = (html: string) => {
    const nav = /<nav[^>]*aria-label="Delen van de wedstrijd"[^>]*>(.*?)<\/nav>/su.exec(html)?.[1] ?? ''

    return [...nav.matchAll(/<a ([^>]*)>(.*?)<\/a>/gu)].map(
      ([, attributes, text]) => `${text}${attributes?.includes('aria-current="page"') ? ' (hier)' : ''}`,
    )
  }

  it('has a navigation to the parts on the whole form, with Alles as the current one', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 1, status: 'played' })

    expect(parts(await form(id))).toEqual(['Alles (hier)', 'Uitslag', 'Gegevens', 'Doelpunten', 'Verslag'])
  })

  it('shows only the cards of a part, with the save panel and a link to the whole form', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 1, status: 'played' })
    const html = await partForm(id, 'gegevens')

    expect(parts(html)).toEqual(['Alles', 'Uitslag', 'Gegevens (hier)', 'Doelpunten', 'Verslag'])
    expect(html).toContain('id="gegevens-kop"')
    expect(html).not.toContain('id="aftrap-kop"')
    expect(html).not.toContain('id="doelpunten"')
    expect(html).toContain('id="opslaan-kop"')
    expect(html).toContain(`<a href="/beheer/wedstrijden/${id}" id="hele-wedstrijd">Hele wedstrijd bewerken</a>`)
    expect(html).not.toContain('hf-page-sidebar')
    expect(headings(html).filter((heading) => heading.startsWith('h1'))).toHaveLength(1)
  })

  it('has the kick-off and the result together, and the goals on their own', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 1, status: 'played' })
    const result = await partForm(id, 'uitslag')
    const goals = await partForm(id, 'doelpunten')

    expect(result).toContain('id="aftrap-kop"')
    expect(result).toContain('id="uitslag-kop"')
    expect(result).not.toContain('id="gegevens-kop"')
    expect(goals).toContain('id="doelpunten"')
    expect(goals).not.toContain('id="uitslag-kop"')
  })

  it('names the part in the title of the tab', async () => {
    expect((await partMetadata({ params: Promise.resolve({ deel: 'doelpunten', id: '1' }) })).title).toBe(
      'Wedstrijd invullen: doelpunten',
    )
  })

  it('says with which name a goal of ours without a player came in', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 2, status: 'played' })

    await database.db.insert(matchGoals).values([
      { matchId: id, minute: 12, ours: true, player: 'Hansen' },
      { matchId: id, minute: 40, ours: true, player: '' },
    ])

    expect(await partForm(id, 'doelpunten')).toContain(
      'Zonder speler binnengekomen: doelpunt 1 als &quot;Hansen&quot;.',
    )
  })

  it('is not found for an unknown part, or for the changes when none wait', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 1, status: 'played' })

    await expect(partForm(id, 'verslag')).rejects.toThrow('not found')
    await expect(partForm(id, 'iets')).rejects.toThrow('not found')
    await expect(partForm(id, 'wijzigingen')).rejects.toThrow('not found')
  })

  it('goes back to where the editor came from, only for a page of the admin', async () => {
    const id = await addMatch({ goalsAgainst: 0, goalsFor: 1, status: 'played' })

    expect(await partForm(id, 'gegevens', { terug: '/beheer/kwaliteit' })).toContain(
      'href="/beheer/kwaliteit">Annuleren</a>',
    )
    expect(await partForm(id, 'gegevens', { terug: 'https://example.org' })).toContain(
      'href="/beheer/wedstrijden">Annuleren</a>',
    )
  })
})

describe('the report in the list and on the match', () => {
  /** A match that was played 2-1, with a squad and a report of this status. */
  async function withReport(status: 'bezig' | 'klaar') {
    const id = await addMatch({ goalsAgainst: 1, goalsFor: 2, status: 'played' })

    await database.db.insert(players).values(
      squadOf(1).map((player) => ({
        name: player.name,
        searchTerm: player.name,
        season,
        shirtNumber: player.shirtNumber,
      })),
    )

    const squad = (await database.db.select().from(players)).map((player) => ({
      id: player.id,
      name: player.name,
      shirtNumber: player.shirtNumber,
    }))
    const checked = checkReportForm(reportOf(squad), {
      match: {
        extraTime: false,
        goalsAgainst: 1,
        goalsFor: 2,
        matchDate: '2026-10-31',
        opponent: 'N.E.C.',
        penaltiesAgainst: null,
        penaltiesFor: null,
        status: 'played',
      },
      squad,
    })

    await saveReport(database.db, userId, id, { ...checked.plan!, status })

    return id
  }

  it('has a column Verslag with one word, and a dash for a match that was not played', async () => {
    await addMatch(playedAway)
    // A match of a later day has no report yet; one of today or before can have one.
    await addMatch({ matchDate: '2099-01-01' })

    const html = await list({ tonen: 'alles' })

    expect(html).toContain('scope="col">Verslag</th>')
    expect(html).toMatch(/<td>Geen<\/td>/u)
    expect(html).toContain('Geen verslag: de wedstrijd is niet gespeeld')
    // The name of the match is the only link in a row.
    expect(html).not.toMatch(/>(Invullen|Openen|Bijhouden)</u)
  })

  it('says in words if the report is not finished, done or does not fit', async () => {
    const id = await withReport('klaar')

    expect(await list({ tonen: 'alles' })).toMatch(/<td>Klaar<\/td>/u)

    await database.db.update(matches).set({ goalsFor: 3 }).where(eq(matches.id, id))
    expect(await list({ tonen: 'alles' })).toContain('hf-tag-attention">Klopt niet</span>')

    await database.db.update(matches).set({ goalsFor: 2 }).where(eq(matches.id, id))
    await database.pool.query("UPDATE match_reports SET status = 'bezig'")
    expect(await list({ tonen: 'alles' })).toMatch(/<td>Niet af<\/td>/u)
  })

  it('sends the link of a match to Bijhouden while it is played, to the report when it can have one, and else to the match', async () => {
    const live = await addMatch({ kickoffAt: new Date(Date.now() - 30 * 60 * 1000) })
    const played = await addMatch({ goalsAgainst: 1, goalsFor: 2, round: 'Speelronde 12', status: 'played' })
    const planned = await addMatch({ matchDate: '2099-01-01', round: 'Speelronde 13' })
    const postponed = await addMatch({ round: 'Speelronde 14', status: 'postponed' })

    const html = await list({ tonen: 'alles' })
    const link = (id: number) => new RegExp(`<a href="/beheer/wedstrijden/${id}[^"]*">`, 'u').exec(html)?.[0]

    expect(link(live)).toBe(`<a href="/beheer/wedstrijden/${live}/verslag/live">`)
    expect(link(played)).toBe(`<a href="/beheer/wedstrijden/${played}/verslag">`)
    expect(link(planned)).toBe(`<a href="/beheer/wedstrijden/${planned}">`)
    expect(link(postponed)).toBe(`<a href="/beheer/wedstrijden/${postponed}">`)
    expect(html).toMatch(/<td>Live<\/td>/u)
  })

  it('links the match to its report, and shows the goals of a match with a report without fields', async () => {
    const id = await withReport('klaar')
    const html = await form(id)

    expect(html).toMatch(new RegExp(`href="/beheer/wedstrijden/${id}/verslag"[^>]*>Verslag</a>`, 'u'))
    expect(html).toContain('De doelpunten van deze wedstrijd staan in het verslag.')
    expect(html).toContain('12&#x27; Speler 9')
    expect(html).not.toContain('doelpunt-1-minuut')
    expect(html).not.toContain('value="doelpunt-toevoegen"')
    // The rest of the form is there.
    expect(html).toContain('id="aftrap-datum"')
    expect(html).toContain('id="uitslag-wij"')
  })

  it('links a match that was played to its report when it has none, and a match that was not played has no link', async () => {
    const played = await addMatch({ goalsAgainst: 1, goalsFor: 2, status: 'played' })
    const planned = await addMatch({ matchDate: '2099-01-01', round: 'Speelronde 12' })
    const today = await addMatch({ round: 'Speelronde 13' })

    expect(await form(played)).toMatch(new RegExp(`href="/beheer/wedstrijden/${played}/verslag"[^>]*>Verslag</a>`, 'u'))
    expect(await form(played)).toContain('value="doelpunt-toevoegen"')
    expect(await form(planned)).not.toContain('/verslag')
    // A match that is still being played, from its day on, can have a report too.
    expect(await form(today)).toMatch(new RegExp(`href="/beheer/wedstrijden/${today}/verslag"[^>]*>Verslag</a>`, 'u'))
  })
})

describe('the way to a new player in the form of a match', () => {
  it('has a link at the goals to the form that adds a player to the season, with the match to come back to', async () => {
    const id = await addMatch({ round: 'Speelronde 12' })
    const html = await form(id)

    expect(html).toMatch(
      new RegExp(
        `<a[^>]*href="/beheer/spelers/nieuw\\?seizoen=2026-27&amp;wedstrijd=${id}"[^>]*>De speler staat er niet in\\? Voeg hem toe aan de selectie van 2026/27 \\(opent in een nieuw tabblad\\)</a>`,
        'u',
      ),
    )
  })

  it('says after the save that the player is in the list of the goals', async () => {
    const html = await form(await addMatch({ round: 'Speelronde 12' }), { gedaan: 'speler-toegevoegd' })

    expect(html).toContain('<strong>Speler toegevoegd.</strong> De speler staat nu in de kiezer bij de doelpunten.')
  })
})
