import type { TestDatabase } from '@fansite/db/test-database'

import { lockNameFor, withLock } from '@fansite/db/lock'
import { clubNames, clubs, matchAppearances, matches, matchGoals, matchReports } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { OldSiteStep } from './old-site-step.ts'

import {
  defaultOldSiteFolder,
  formatStepReport,
  oldSiteSteps,
  runOldSiteImport,
  runOldSiteReport,
} from './import-old-site.ts'
import { oldSiteClubIds } from './old-site-clubs.ts'
import { oldSiteDataFolder, readOldSiteData } from './old-site-file.ts'

let database: TestDatabase
let folder: string

/** A small set of files: three clubs, two of them in the database under another spelling. */
const small = {
  clubs: {
    clubs: [
      { code: 'cambuurleeuwarden', country: 'NL', name: 'Cambuur Lwd.' },
      { code: 'fcbasel', country: 'CH', name: 'FC Basel' },
      { code: 'nec', country: 'NL', name: 'NEC' },
    ],
    version: 3,
  },
  players: { players: [], version: 3 },
}

beforeAll(async () => {
  database = await createTestDatabase()
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-'))
  writeFileSync(path.join(folder, 'clubs.json'), JSON.stringify(small.clubs))
  writeFileSync(path.join(folder, 'players.json'), JSON.stringify(small.players))
})

afterAll(async () => {
  rmSync(folder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM clubs')
  await database.db.insert(clubs).values([
    { name: 'N.E.C.', slug: 'nec', wikipediaPage: 'N.E.C.' },
    { name: 'SC Cambuur', slug: 'sc-cambuur', wikipediaPage: 'SC Cambuur' },
  ])
})

/** No test asks Wikipedia: every title is without an article. */
const noTitles = async () => ({ kind: 'missing' }) as const

/** Runs the command against the small files and collects what it prints. */
async function run(options: Parameters<typeof runOldSiteImport>[1] = {}) {
  const lines: string[] = []
  const code = await runOldSiteImport(database.url, {
    folder,
    titles: noTitles,
    write: (line) => lines.push(line),
    ...options,
  })

  return { code, text: lines.join('\n') }
}

const clubCount = async () => (await database.db.select().from(clubs)).length

describe('the command', () => {
  it('runs the step clubs and writes a line for it', async () => {
    const { code, text } = await run()

    expect(code).toBe(0)
    expect(text.split('\n')).toEqual([
      'Old site, step clubs: 1 new, 1 updated, 1 unchanged, 0 skipped',
      "  club 'SC Cambuur' is old fansite club 'Cambuur Lwd.' (cambuurleeuwarden), name added",
      "  new club 'FC Basel' for old fansite club 'FC Basel' (fcbasel)",
      'Old site, step matches: 0 new, 0 updated, 0 unchanged, 0 skipped',
      'Old site, step spelers: 0 new, 0 updated, 0 unchanged, 0 skipped',
      'Old site, step doelpunten: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 matches get goals, 0 add up without goals, 0 have a score and no goals, 0 have part of the goals',
      'Old site, step opstellingen: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 reports: 0 klaar, 0 bezig',
      'Old site, step personen: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 of 0 players without a person linked, 0 new persons, 0 left alone',
      'Old site, step doelpunten tegen ons: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 goals against us linked to a person (0 names), 0 links taken away, 0 unchanged',
      'Old site, step linie en land: 0 new, 0 updated, 0 unchanged, 0 skipped',
      '  0 lines and 0 countries filled in from the old fansite',
      '  persons without a line: 0, without a country: 0',
      'Old site, step selecties: 0 new, 0 updated, 0 unchanged, 0 skipped',
      'Old site: 9 of 9 steps done.',
    ])
  })

  it('changes nothing in a second run', async () => {
    await run()

    const before = { clubs: await database.db.select().from(clubs), names: await database.db.select().from(clubNames) }
    const { code, text } = await run()

    expect(code).toBe(0)
    expect(text).toBe(
      [
        'Old site, step clubs: 0 new, 0 updated, 3 unchanged, 0 skipped',
        'Old site, step matches: 0 new, 0 updated, 0 unchanged, 0 skipped',
        'Old site, step spelers: 0 new, 0 updated, 0 unchanged, 0 skipped',
        'Old site, step doelpunten: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 matches get goals, 0 add up without goals, 0 have a score and no goals, 0 have part of the goals',
        'Old site, step opstellingen: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 reports: 0 klaar, 0 bezig',
        'Old site, step personen: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 of 0 players without a person linked, 0 new persons, 0 left alone',
        'Old site, step doelpunten tegen ons: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 goals against us linked to a person (0 names), 0 links taken away, 0 unchanged',
        'Old site, step linie en land: 0 new, 0 updated, 0 unchanged, 0 skipped',
        '  0 lines and 0 countries filled in from the old fansite',
        '  persons without a line: 0, without a country: 0',
        'Old site, step selecties: 0 new, 0 updated, 0 unchanged, 0 skipped',
        'Old site: 9 of 9 steps done.',
      ].join('\n'),
    )
    expect({
      clubs: await database.db.select().from(clubs),
      names: await database.db.select().from(clubNames),
    }).toEqual(before)
  })

  it('runs the steps in their order, one after the other, and writes a line for each', async () => {
    const order: string[] = []
    const step = (name: string): OldSiteStep => ({
      name,
      run: async () => {
        order.push(name)

        return { changed: 0, created: 1, lines: [`did ${name}`], skipped: 0, unchanged: 2 }
      },
    })

    const { code, text } = await run({ steps: [step('clubs'), step('matches'), step('goals')] })

    expect(code).toBe(0)
    expect(order).toEqual(['clubs', 'matches', 'goals'])
    expect(text.split('\n')).toEqual([
      'Old site, step clubs: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did clubs',
      'Old site, step matches: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did matches',
      'Old site, step goals: 1 new, 0 updated, 2 unchanged, 0 skipped',
      '  did goals',
      'Old site: 3 of 3 steps done.',
    ])
  })

  it('has the steps clubs, matches, spelers, doelpunten, opstellingen, personen, doelpunten tegen ons, linie en land and selecties, in that order', () => {
    expect(oldSiteSteps.map((step) => step.name)).toEqual([
      'clubs',
      'matches',
      'spelers',
      'doelpunten',
      'opstellingen',
      'personen',
      'doelpunten tegen ons',
      'linie en land',
      'selecties',
    ])
  })

  it('shows what it would do with --dry-run, and writes nothing', async () => {
    const before = await clubCount()
    const { code, text } = await run({ dryRun: true })

    expect(code).toBe(0)
    expect(text).toContain('Old site, step clubs: 1 new, 1 updated, 1 unchanged, 0 skipped')
    expect(text).toContain('Dry run, nothing is written. Old site: 9 of 9 steps done.')
    expect(await clubCount()).toBe(before)
    expect(await database.db.select().from(clubNames)).toEqual([])
  })

  it('lets a later step in a dry run see what the steps before it would write', async () => {
    let seen = 0
    const second: OldSiteStep = {
      name: 'second',
      run: async (db, data) => {
        seen = (await oldSiteClubIds(db, data.clubs)).size

        return { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const clubStep = oldSiteSteps[0]!

    await run({ dryRun: true, steps: [clubStep, second] })

    expect(seen).toBe(3)
    expect(await oldSiteClubIds(database.db, small.clubs.clubs)).toHaveProperty('size', 2)
  })

  it('refuses a file that does not fit, before it writes anything', async () => {
    const bad = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-bad-'))

    try {
      writeFileSync(
        path.join(bad, 'clubs.json'),
        JSON.stringify({ clubs: [{ code: 'x', country: 'NL', email: 'a@b.nl', name: 'X' }], version: 3 }),
      )
      writeFileSync(path.join(bad, 'players.json'), JSON.stringify(small.players))

      const before = await clubCount()
      const { code, text } = await run({ folder: bad })

      expect(code).toBe(1)
      expect(text).toContain("The files of the old fansite can't be used, so nothing was written.")
      expect(text).toContain('clubs.json does not match the format')
      expect(await clubCount()).toBe(before)
    } finally {
      rmSync(bad, { force: true, recursive: true })
    }
  })

  it('refuses a folder without the files', async () => {
    const empty = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-empty-'))

    try {
      const { code, text } = await run({ folder: empty })

      expect(code).toBe(1)
      expect(text).toContain('needs one clubs file and one players file')
    } finally {
      rmSync(empty, { force: true, recursive: true })
    }
  })

  it('does nothing while an import holds the lock, and says so', async () => {
    const before = await clubCount()
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, () => run())

    expect(held.ran && held.result).toMatchObject({ code: 1 })
    expect(held.ran && held.result.text).toContain('An import is still running on this database')
    expect(await clubCount()).toBe(before)
  })

  it('stops at a step that fails, leaves nothing of that step behind and keeps the steps before it', async () => {
    const ran: string[] = []
    const first: OldSiteStep = {
      name: 'first',
      run: async (db) => {
        ran.push('first')
        await db.insert(clubs).values({ name: 'Eerste FC', slug: 'eerste-fc' })

        return { changed: 0, created: 1, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const broken: OldSiteStep = {
      name: 'broken',
      run: async (db) => {
        ran.push('broken')
        await db.insert(clubs).values({ name: 'Half FC', slug: 'half-fc' })
        throw new Error('the file has a match with no club')
      },
    }
    const never: OldSiteStep = {
      name: 'never',
      run: async () => {
        ran.push('never')

        return { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
      },
    }
    const { code, text } = await run({ steps: [first, broken, never] })

    expect(code).toBe(1)
    expect(ran).toEqual(['first', 'broken'])
    expect(text).toContain(
      'Old site, step broken: not done, nothing was changed by it. the file has a match with no club',
    )
    expect(text).toContain('Old site: stopped.')
    expect((await database.db.select().from(clubs)).map((row) => row.name)).toContain('Eerste FC')
    expect((await database.db.select().from(clubs)).map((row) => row.name)).not.toContain('Half FC')
  })

  it('shows a failure in a dry run too, and still writes nothing', async () => {
    const broken: OldSiteStep = {
      name: 'broken',
      run: async () => {
        throw new Error('no good')
      },
    }
    const before = await clubCount()
    const { code, text } = await run({ dryRun: true, steps: [oldSiteSteps[0]!, broken] })

    expect(code).toBe(1)
    expect(text).toContain('Old site, step broken: not done')
    expect(await clubCount()).toBe(before)
  })
})

const rowCounts = async () => ({
  appearances: (await database.db.select().from(matchAppearances)).length,
  clubs: await clubCount(),
  goals: (await database.db.select().from(matchGoals)).length,
  matches: (await database.db.select().from(matches)).length,
  reports: (await database.db.select().from(matchReports)).length,
})

describe('the check report command', () => {
  it('writes the report and nothing to the database, and refuses files that do not fit', async () => {
    const before = await rowCounts()
    const chunks: string[] = []
    const code = await runOldSiteReport(database.url, {
      folder,
      today: '2026-11-08',
      write: (text) => chunks.push(text),
    })

    expect(code).toBe(0)
    expect(chunks.join('')).toContain('# Oude wedstrijden: wat ontbreekt of niet klopt')
    expect(chunks.join('')).toContain('| Totaal | 0 | 0 |')
    expect(await rowCounts()).toEqual(before)
    expect(await database.db.select().from(clubNames)).toEqual([])

    const errors: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((line: string) => void errors.push(line))

    try {
      expect(await runOldSiteReport(database.url, { folder: path.join(folder, 'missing'), write: () => {} })).toBe(1)
      expect(errors.join('\n')).toContain("The files of the old fansite can't be used, so there is no report.")
    } finally {
      spy.mockRestore()
    }
  })

  it('asks Wikipedia for nothing when the files have no league match', async () => {
    const asked: string[] = []
    const chunks: string[] = []
    const code = await runOldSiteReport(database.url, {
      fetcher: {
        fetch: async (url) => {
          asked.push(String(url))

          return { kind: 'blocked-by-robots', url: String(url) }
        },
      },
      folder,
      today: '2026-11-10',
      write: (text) => chunks.push(text),
    })

    expect(code).toBe(0)
    expect(asked).toEqual([])
    expect(chunks.join('')).toContain(
      'Geen: de bestanden hebben geen competitiewedstrijden van 1990/91 tot en met 2006/07.',
    )
  })

  it('lays the league matches next to the cross table of the season, and writes nothing', async () => {
    const withMatches = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-league-'))
    const page = readFileSync(new URL('./fixtures/wikipedia-cross-table-1990-91.wiki', import.meta.url))
    const match = {
      attendance: null,
      code: 'nec.thuis',
      competition: 1,
      dateTime: '1990-09-01 19:30:00',
      events: [],
      lineup: [],
      note: null,
      referee: null,
      result: { awayFullTime: 2, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      round: 1,
      season: '9091',
      statistics: { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 },
    }

    try {
      cpSync(folder, withMatches, { recursive: true })
      writeFileSync(
        path.join(withMatches, 'matches-9091.json'),
        JSON.stringify({ matches: [match], season: '9091', version: 3 }),
      )
      expect((await run({ folder: withMatches })).code).toBe(0)

      const before = await rowCounts()
      const asked: string[] = []
      const chunks: string[] = []
      const code = await runOldSiteReport(database.url, {
        fetcher: {
          fetch: async (url) => {
            asked.push(String(url))

            return {
              body: new Uint8Array(page),
              contentType: 'text/x-wiki',
              etag: null,
              kind: 'fetched',
              lastModified: null,
              url: String(url),
            }
          },
        },
        folder: withMatches,
        pause: 0,
        today: '2026-11-10',
        write: (text) => chunks.push(text),
      })

      expect(code).toBe(0)
      expect(asked).toEqual(['https://nl.wikipedia.org/wiki/Eredivisie_1990/91?action=raw'])
      expect(chunks.join('')).toContain('### 1990/91, Eredivisie')
      // The files have 1-2 at home against NEC, the table has 1-1.
      expect(chunks.join('')).toContain(
        '- Thuis tegen N.E.C., 1 september 1990: de database heeft 1-2, de kruistabel heeft 1-1',
      )
      expect(chunks.join('')).toContain('- Uit tegen N.E.C.: staat in de kruistabel (2-1) en niet in de database')
      expect(await rowCounts()).toEqual(before)
    } finally {
      rmSync(withMatches, { force: true, recursive: true })
    }
  })

  it('does not wait for the lock of the import', async () => {
    const chunks: string[] = []
    const held = await withLock(database.pool, lockNameFor(database.url, 'import'), 0, async () =>
      runOldSiteReport(database.url, { folder, today: '2026-11-08', write: (text) => chunks.push(text) }),
    )

    expect(held.ran && held.result).toBe(0)
    expect(chunks.join('')).toContain('# Oude wedstrijden')
  })
})

// The limit of the test that imports all the real files and writes the check report.
const realImportTimeout = 120_000

describe('the files in the repository', () => {
  it('makes a club of every club of the old fansite, finds them all again, and a second run changes nothing', async () => {
    const { clubs: oldClubs } = await readOldSiteData(oldSiteDataFolder)
    const first = await run({ folder: oldSiteDataFolder })
    const second = await run({ folder: oldSiteDataFolder })
    const ids = await oldSiteClubIds(database.db, oldClubs)

    expect(oldClubs).toHaveLength(91)
    expect(first.code).toBe(0)
    expect(first.text).toMatch(/^Old site, step clubs: \d+ new, \d+ updated, \d+ unchanged, 0 skipped/u)
    expect(second.text).toContain(`Old site, step clubs: 0 new, 0 updated, ${oldClubs.length} unchanged, 0 skipped`)
    expect(first.text).toContain('Old site, step matches: 671 new, 0 updated, 0 unchanged, 0 skipped')
    expect(second.text).toContain('Old site, step matches: 0 new, 0 updated, 671 unchanged, 0 skipped')
    expect(first.text).toContain('Old site, step spelers: 426 new, 0 updated, 0 unchanged, 0 skipped')
    expect(second.text).toContain('Old site, step spelers: 0 new, 0 updated, 426 unchanged, 0 skipped')
    expect(first.text).toContain('Old site, step doelpunten: 1763 new, 0 updated, 0 unchanged, 67 skipped')
    expect(second.text).toContain('Old site, step doelpunten: 0 new, 0 updated, 1763 unchanged, 67 skipped')
    expect(first.text).toContain('Old site, step opstellingen: 566 new, 0 updated, 0 unchanged, 0 skipped')
    expect(second.text).toContain('Old site, step opstellingen: 0 new, 0 updated, 566 unchanged, 0 skipped')
    expect(second.text).toContain('Old site: 9 of 9 steps done.')
    expect(ids.size).toBe(oldClubs.length)
    // The two clubs the test started with are among them, so a club is one row, not two.
    expect((await database.db.select().from(clubs)).length).toBeLessThan(oldClubs.length + 2)
    expect(await database.db.select().from(clubs).where(eq(clubs.slug, 'sc-cambuur'))).toHaveLength(1)
  })

  // This test imports all the real files (671 matches, 566 line-ups) and then reads them back
  // for the report. On a fast computer that takes about 6 seconds: 4 for the import, of which
  // the step opstellingen is 2.3 because it stores each match in its own queries, and 2.4 for
  // the report. A CI runner is three to five times slower and runs other test files next to
  // it, so it took 18 to 32 seconds against the limit of 30. The work is not repeated
  // anywhere, so it gets its own limit and the other tests keep 30 seconds.
  it(
    'writes a check report of the real import with the numbers of the steps, and writes nothing',
    async () => {
      await run({ folder: oldSiteDataFolder })

      const before = await rowCounts()
      const chunks: string[] = []
      const asked: string[] = []
      const code = await runOldSiteReport(database.url, {
        // The real files have league matches, so the report asks for pages: never the real
        // Wikipedia in a test. Every page is missing here.
        fetcher: {
          fetch: async (url) => {
            asked.push(String(url))

            return { kind: 'error', message: 'HTTP 404', reason: 'http-status', status: 404, url: String(url) }
          },
        },
        folder: oldSiteDataFolder,
        pause: 0,
        today: '2026-11-08',
        write: (text) => chunks.push(text),
      })
      const text = chunks.join('')

      expect(code).toBe(0)
      // One page for each of the seventeen seasons, and a season without a page has the reason.
      expect(asked).toHaveLength(17)
      expect(asked).toContain('https://nl.wikipedia.org/wiki/Eerste_divisie_1992/93?action=raw')
      expect(text).toContain('De kruistabel is niet te lezen: de pagina Eredivisie 1990/91 bestaat niet.')
      // 671 matches, 566 reports with a line-up, 505 klaar and 61 bezig, as the steps say.
      expect(text).toContain('| Totaal | 671 | 671 | 604 | 65 | 2 | 566 | 505 | 61 |')
      expect(text).toContain('## Doelpunten die niet optellen')
      expect(text).toContain('## Spelers zonder persoon')
      expect(await rowCounts()).toEqual(before)
    },
    realImportTimeout,
  )

  it('finds the files next to the repository when there is no folder next to the bundle', () => {
    expect(defaultOldSiteFolder().href).toBe(oldSiteDataFolder.href)
  })

  it('formats a report as a line and the lines under it', () => {
    expect(formatStepReport('clubs', { changed: 2, created: 1, lines: ['a', 'b'], skipped: 0, unchanged: 3 })).toBe(
      'Old site, step clubs: 1 new, 2 updated, 3 unchanged, 0 skipped\n  a\n  b',
    )
  })
})

describe('the bundle', () => {
  it('reads the files next to import.mjs on the host and refuses a wrong argument', async () => {
    const { bundleImporter } = await import('./bundle.ts')
    const host = mkdtempSync(path.join(tmpdir(), 'fansite-old-site-host-'))

    try {
      await bundleImporter(path.join(host, 'import.mjs'))
      // The small files, so the step personen has no player to ask Wikipedia about.
      cpSync(folder, path.join(host, 'data/oude-fansite'), { recursive: true })

      const node = (...args: string[]) =>
        promisify(execFile)(process.execPath, [path.join(host, 'import.mjs'), ...args], {
          cwd: host,
          env: { DATABASE_URL: database.url, PATH: process.env['PATH'] },
        })
      const dry = await node('--old-site', '--dry-run')

      expect(dry.stdout).toContain('Old site, step clubs:')
      expect(dry.stdout).toContain('Old site, step personen: 0 new')
      expect(dry.stdout).toContain('Dry run, nothing is written. Old site: 9 of 9 steps done.')
      const report = await node('--old-site', '--report')

      expect(report.stdout).toContain('# Oude wedstrijden: wat ontbreekt of niet klopt')
      // --report belongs to --old-site alone, and not with --dry-run.
      await expect(node('--report')).rejects.toMatchObject({ code: 2 })
      await expect(node('--old-site', '--report', '--dry-run')).rejects.toMatchObject({ code: 2 })
      // --dry-run belongs to --old-site alone.
      await expect(node('--dry-run')).rejects.toMatchObject({ code: 2 })
      await expect(node('--old-site', '--status')).rejects.toMatchObject({ code: 2 })
    } finally {
      rmSync(host, { force: true, recursive: true })
    }
  }, 30_000)
})
