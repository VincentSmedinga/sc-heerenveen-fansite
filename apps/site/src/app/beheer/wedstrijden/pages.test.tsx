import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matchChanges, matches, type NewMatch, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '../../../beheer/accounts'
import { saveEntry } from '../../../beheer/match-entries'
import MatchPage, { metadata as matchMetadata } from './[id]/page'
import MatchesPage, { metadata as listMetadata } from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('../../../database', () => ({ getDatabase: () => database }))
vi.mock('../../../beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
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
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'beheerder', userId })
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
  ])('are for the beheerder and not for the moderator: %s', async (_name, render) => {
    requireRole.mockImplementation((...roles: string[]) =>
      roles.includes('moderator') ? Promise.resolve({}) : Promise.reject(new Error('not found')),
    )

    await expect(render()).rejects.toThrow('not found')
    expect(requireRole).toHaveBeenCalledWith('beheerder')
  })
})

/** A match of the list that the editors changed. */
async function editMatch(id: number) {
  await saveEntry(
    database.db,
    userId,
    id,
    {
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
    expect(html.match(/<a href="\/beheer\/wedstrijden\/\d+">(.*?)<\/a>/g)).toEqual([
      expect.stringContaining('sc Heerenveen - N.E.C.'),
    ])
    expect(html).toContain('Uitslag ontbreekt')
    expect(html).not.toContain('FC Twente - sc Heerenveen')
    expect(html).toContain('Speelronde 11')
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

    expect(html.match(/<a href="\/beheer\/wedstrijden\/\d+">(.*?)<\/a>/g)).toEqual([
      expect.stringContaining('sc Heerenveen - N.E.C.'),
      expect.stringContaining('FC Twente - sc Heerenveen'),
    ])
    expect(html).toContain('2 - 1')
    expect(html).toContain('Gespeeld')
    expect(html).toContain('Gepland')
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

    expect(changed.match(/<a href="\/beheer\/wedstrijden\/\d+">/g)).toHaveLength(1)
    expect(changed).toMatch(/<span class="hf-tag hf-tag-highlight">Aangepast<\/span>/u)
    expect(changed).toContain('Aangepast (1)')
    expect(await list()).not.toMatch(/hf-tag-highlight/u)
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

  it('has a season picker next to the title when there is more than one season', async () => {
    await addMatch({ round: 'Speelronde 3', season: '2025/26' })
    await addMatch()

    const html = await list()

    expect(html).toContain('aria-label="Seizoen kiezen"')
    expect(html).toContain('action="/beheer/wedstrijden"')
  })

  it('has a breadcrumb and no link back at the bottom', async () => {
    await addMatch()

    const html = await list()

    expect(html).toContain('aria-label="Kruimelpad"')
    expect(html).toContain('<a class="hf-navigation-link" href="/beheer">Beheer</a>')
    expect(html).not.toContain('Terug naar het beheer')
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
        'h1 Wedstrijd invullen',
        'h2 Aftrap',
        'h2 Status en uitslag',
        'h2 Doelpunten',
        'h2 Logboek',
      ]),
    )
    for (const label of [
      'Datum',
      'Tijd',
      'Status',
      'Doelpunten sc Heerenveen',
      'Doelpunten N.E.C.',
      'Verlenging',
      'Reden',
    ]) {
      expect(html).toContain(`>${label}`)
    }
    expect(html).toContain('Doelpunt toevoegen')
    expect(html).not.toContain('weghalen')
    // The hidden first button makes Enter save.
    expect(html.indexOf('value="opslaan"')).toBeLessThan(html.indexOf('Doelpunt toevoegen'))
  })

  it('has no field for extra time in the league', async () => {
    const id = await addMatch()
    const html = await form(id)

    expect(html).not.toContain('Verlenging')
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

    expect(headings(html)).toContain('h3 Doelpunt 1')
    expect(html).toContain('Minuut, doelpunt 1')
    expect(html).toContain('Doelpunt 1 weghalen')
    expect(html).toContain('Luca Oyen')
    expect(html).toContain('Andere speler')
  })

  it('tells what the editors entered, who did it and why, and the button to take it away with its own reason', async () => {
    const id = await addMatch()

    expect(await form(id)).not.toContain('Invoer weghalen')

    await saveEntry(
      database.db,
      userId,
      id,
      {
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

    expect(headings(html)).toContain('h2 Aangepast door de redactie')
    expect(html).toContain('ingevuld: uitslag')
    expect(html).toContain('sanne@example.org')
    expect(html).toContain('Reden: Wikipedia is achter')
    expect(html).toContain('Invoer weghalen voor Speelronde 11 (Eredivisie): sc Heerenveen - N.E.C.')
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

    it('has two buttons, each with a name that says which match and part it is for, and one reason', async () => {
      const html = await form(await withDifference())
      const buttons = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"[^>]*>(.*?)<\/button>/g)].map(
        ([, name, text]) => [text, name],
      )

      expect(buttons).toEqual([
        ['Neem Wikipedia over', expect.stringMatching(/^Neem Wikipedia over: de uitslag van Speelronde 11/)],
        ['Houd onze invoer', expect.stringMatching(/^Houd onze invoer: de uitslag van Speelronde 11/)],
      ])
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

    it('tells the editor on the list that a difference was decided already', async () => {
      expect(await list({ fout: 'besloten' })).toContain('Over deze afwijking is al beslist')
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
  ])('tells what the last action did: %s', async (done, title) => {
    const id = await addMatch()

    expect(headings(await form(id, { gedaan: done }))).toContain(`h2 ${title}`)
  })

  it('says nothing for an action it does not know', async () => {
    const id = await addMatch()

    expect(await form(id, { gedaan: 'iets-anders' })).not.toContain('gedaan-kop')
  })

  it('is not there for a match that does not exist, or a number that is not one', async () => {
    await expect(form(99_999)).rejects.toThrow('not found')
    await expect(form('abc')).rejects.toThrow('not found')
  })
})
