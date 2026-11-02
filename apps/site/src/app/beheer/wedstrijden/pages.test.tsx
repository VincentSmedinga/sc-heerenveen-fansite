import type { TestDatabase } from '@fansite/db/test-database'

import { withClubs } from '@fansite/db/clubs'
import { adminUsers, matchChanges, matchEdits, matches, type NewMatch, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { saveEntry } from '#src/beheer/match-entries'

import MatchPage, { metadata as matchMetadata } from './[id]/page'
import MatchesPage, { metadata as listMetadata } from './page'

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

  it('is a table of five columns, where the date and the competition fold under the match on a phone', async () => {
    await addMatch()

    const html = await list()

    expect(html).toContain('<div class="hf-data-table-fold">')
    expect(
      [...html.matchAll(/<th class="hf-data-table-fold-column" scope="col">(.*?)<\/th>/g)].map(([, name]) => name),
    ).toEqual(['Datum', 'Competitie'])
    expect(html).toContain('<span class="hf-data-table-secondary hf-data-table-folded">')
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
    // The reason and the button in the sidebar belong to the form of the cards.
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

  it('has a breadcrumb, tags for what the editors changed and what is missing, and a sticky sidebar', async () => {
    const id = await addMatch()
    const html = await form(id)

    expect(html).toContain('aria-label="Kruimelpad"')
    expect(html).toContain('<span aria-current="page" class="hf-breadcrumb-current">sc Heerenveen - N.E.C.</span>')
    expect(html).toContain('<span class="hf-tag hf-tag-attention">Uitslag ontbreekt</span>')
    expect(html).not.toContain('Terug naar de wedstrijden')
    expect(html).toContain('hf-page-sidebar hf-page-sidebar-sticky')
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
        /<fieldset class="hf-input-table-item[^"]*" disabled="" hidden="" role="none"><div[^>]*><label [^>]*for="([^"]+)"/g,
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
      expect(html).toContain('<span class="hf-tag hf-tag-highlight">Aangepast</span>')
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
  ])('tells what the last action did, in a notice without a heading: %s', async (done, title) => {
    const id = await addMatch()
    const html = await form(id, { gedaan: done })

    expect(html).toMatch(new RegExp(`<p class="hf-notice" role="status"><strong>${title}\\.</strong> `, 'u'))
    expect(headings(html).join()).not.toContain(title)
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
